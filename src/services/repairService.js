const models = require('../models');
const config = require('../config');
const { generateId, calculateHaversineDistance } = require('../utils/helpers');
const notificationService = require('./notificationService');

class RepairService {
  async acceptWorkOrder(workOrderId, inspectorId) {
    const workOrder = await models.WorkOrder.findById(workOrderId);
    if (!workOrder) throw new Error('工单不存在');
    if (workOrder.status !== 'assigned') throw new Error('工单状态不允许接单');
    if (workOrder.assigneeId && workOrder.assigneeId.toString() !== inspectorId.toString()) {
      throw new Error('非该工单的勘察员');
    }

    workOrder.status = 'accepted';
    workOrder.acceptedAt = new Date();
    await workOrder.save();
    await notificationService.notifyWorkOrderStatusChange(workOrder);

    return workOrder;
  }

  async startWorkOrder(workOrderId, inspectorId) {
    const workOrder = await models.WorkOrder.findById(workOrderId);
    if (!workOrder) throw new Error('工单不存在');
    if (!['assigned', 'accepted'].includes(workOrder.status)) throw new Error('工单状态不允许开始');

    workOrder.status = 'in_progress';
    workOrder.startedAt = new Date();
    await workOrder.save();
    await notificationService.notifyWorkOrderStatusChange(workOrder);

    return workOrder;
  }

  async submitInspectionResult(workOrderId, inspectorId, result) {
    const workOrder = await models.WorkOrder.findById(workOrderId);
    if (!workOrder) throw new Error('工单不存在');
    if (!['accepted', 'in_progress'].includes(workOrder.status)) throw new Error('工单状态不允许提交结果');

    workOrder.inspectionResult = {
      isRealLeak: result.isRealLeak,
      leakType: result.leakType,
      leakSize: result.leakSize,
      photos: result.photos || [],
      notes: result.notes,
      confirmedLeakLevel: result.confirmedLeakLevel
    };
    workOrder.status = 'completed';
    workOrder.completedAt = new Date();
    await workOrder.save();

    const leakPoint = await models.LeakPoint.findById(workOrder.leakPointId);
    if (!leakPoint) return workOrder;

    if (result.isRealLeak) {
      leakPoint.status = 'confirmed_leak';
      leakPoint.confirmedBy = inspectorId;
      leakPoint.confirmedAt = new Date();
      await leakPoint.save();

      if (leakPoint.pipeSegmentId) {
        await models.PipeSegment.findByIdAndUpdate(leakPoint.pipeSegmentId, {
          status: 'leaking'
        });
      }

      const repairTask = await this._createRepairTask(leakPoint, workOrder, result);
      leakPoint.repairTaskId = repairTask._id;
      await leakPoint.save();
    } else {
      leakPoint.status = 'false_alarm';
      leakPoint.isFalseAlarm = true;
      leakPoint.confirmedBy = inspectorId;
      leakPoint.confirmedAt = new Date();
      await leakPoint.save();

      if (leakPoint.pipeSegmentId) {
        await models.PipeSegment.findByIdAndUpdate(leakPoint.pipeSegmentId, {
          status: 'normal'
        });
      }
    }

    await notificationService.notifyWorkOrderStatusChange(workOrder);

    return workOrder;
  }

  async _createRepairTask(leakPoint, workOrder, inspectionResult) {
    const requiredSkills = this._determineRequiredSkills(inspectionResult, leakPoint);

    const deadline = new Date();
    if (leakPoint.priority === 'critical') {
      deadline.setHours(deadline.getHours() + 4);
    } else if (leakPoint.priority === 'high') {
      deadline.setDate(deadline.getDate() + 1);
    } else if (leakPoint.priority === 'medium') {
      deadline.setDate(deadline.getDate() + 2);
    } else {
      deadline.setDate(deadline.getDate() + 3);
    }

    const repairTask = await models.RepairTask.create({
      code: generateId('RT'),
      workOrderId: workOrder._id,
      leakPointId: leakPoint._id,
      pipeSegmentId: leakPoint.pipeSegmentId,
      title: `${leakPoint.leakLevelName}抢修 - ${leakPoint.zone || '未知区域'}`,
      description: `经勘察确认真实漏损。类型: ${inspectionResult.leakType || '未知'}, 备注: ${inspectionResult.notes || ''}`,
      location: leakPoint.location,
      zone: leakPoint.zone,
      leakLevel: leakPoint.leakLevel,
      leakLevelName: leakPoint.leakLevelName,
      priority: leakPoint.priority,
      requiredSkills: requiredSkills,
      status: 'pending',
      deadline: deadline,
      estimatedDuration: this._estimateDuration(leakPoint.leakLevel)
    });

    const assignedTeam = await this._autoAssignRepairTeam(repairTask, requiredSkills);

    if (assignedTeam) {
      repairTask.assigneeTeamId = assignedTeam._id;
      repairTask.status = 'assigned';
      repairTask.assignedAt = new Date();
      repairTask.teamMembers = assignedTeam.teamMembers || [assignedTeam._id];
      await repairTask.save();
      await notificationService.notifyNewRepairTask(repairTask);
    }

    return repairTask;
  }

  _determineRequiredSkills(inspectionResult, leakPoint) {
    const skills = [];
    if (leakPoint.pipeSegmentId) skills.push('pipe_repair');
    if (inspectionResult.leakSize === 'large' || leakPoint.leakLevel >= 3) {
      skills.push('heavy_equipment');
      skills.push('emergency_response');
    }
    if (inspectionResult.leakType === 'welding_required') {
      skills.push('welding');
    }
    if (skills.length === 0) skills.push('basic_repair');
    return skills;
  }

  _estimateDuration(leakLevel) {
    const durationMap = { 1: 2, 2: 4, 3: 8, 4: 12 };
    return durationMap[leakLevel] || 4;
  }

  async _autoAssignRepairTeam(repairTask, requiredSkills) {
    const repairers = await models.User.find({
      roles: 'repairer',
      status: 'active'
    });

    if (repairers.length === 0) return null;

    let bestTeam = null;
    let bestScore = -1;

    for (const repairer of repairers) {
      let skillMatch = 0;
      if (repairer.skills && repairer.skills.length > 0) {
        requiredSkills.forEach(skill => {
          if (repairer.skills.includes(skill)) skillMatch++;
        });
      }
      const skillScore = requiredSkills.length > 0 ? skillMatch / requiredSkills.length : 0.5;

      let distance = Infinity;
      if (repairer.location && repairer.location.lat && repairTask.location.lat) {
        distance = calculateHaversineDistance(
          repairer.location.lat, repairer.location.lng,
          repairTask.location.lat, repairTask.location.lng
        );
      }
      const distanceScore = Math.max(0, 1 - distance / 50);

      const activeTasks = await models.RepairTask.countDocuments({
        assigneeTeamId: repairer._id,
        status: { $in: ['assigned', 'accepted', 'in_progress', 'materials_ready'] }
      });
      const loadScore = Math.max(0, 1 - activeTasks * 0.2);

      const score = skillScore * 0.5 + distanceScore * 0.3 + loadScore * 0.2;

      if (score > bestScore) {
        bestScore = score;
        bestTeam = repairer;
      }
    }

    return bestTeam;
  }

  async acceptRepairTask(taskId, repairerId) {
    const task = await models.RepairTask.findById(taskId);
    if (!task) throw new Error('抢修任务不存在');
    if (task.status !== 'assigned') throw new Error('任务状态不允许接单');

    task.status = 'accepted';
    task.acceptedAt = new Date();
    await task.save();

    if (task.leakPointId) {
      await models.LeakPoint.findByIdAndUpdate(task.leakPointId, {
        status: 'repairing'
      });
    }
    if (task.pipeSegmentId) {
      await models.PipeSegment.findByIdAndUpdate(task.pipeSegmentId, {
        status: 'repairing'
      });
    }

    return task;
  }

  async startRepairTask(taskId, repairerId) {
    const task = await models.RepairTask.findById(taskId);
    if (!task) throw new Error('抢修任务不存在');
    if (!['assigned', 'accepted'].includes(task.status)) throw new Error('任务状态不允许开始');

    task.status = 'in_progress';
    task.startedAt = new Date();
    await task.save();
    return task;
  }

  async markMaterialsReady(taskId, repairerId) {
    const task = await models.RepairTask.findById(taskId);
    if (!task) throw new Error('抢修任务不存在');
    if (task.status !== 'in_progress') throw new Error('任务状态不允许标记材料就绪');

    task.status = 'materials_ready';
    task.materialsReadyAt = new Date();
    await task.save();
    return task;
  }

  async completeRepairTask(taskId, repairerId, repairData) {
    const task = await models.RepairTask.findById(taskId);
    if (!task) throw new Error('抢修任务不存在');
    if (!['in_progress', 'materials_ready'].includes(task.status)) throw new Error('任务状态不允许完成');

    const totalMaterialCost = (repairData.materialsUsed || []).reduce(
      (s, m) => s + (m.cost || 0), 0
    );
    const laborCost = repairData.laborCost || 0;

    task.status = 'completed';
    task.completedAt = new Date();
    task.actualDuration = repairData.actualDuration;
    task.materialsUsed = repairData.materialsUsed || [];
    task.totalMaterialCost = totalMaterialCost;
    task.laborCost = laborCost;
    task.totalCost = totalMaterialCost + laborCost;
    task.repairPhotos = repairData.repairPhotos || [];
    task.repairNotes = repairData.repairNotes;
    task.repairMethod = repairData.repairMethod;
    task.affectedResidentCount = repairData.affectedResidentCount;
    task.waterOutageHours = repairData.waterOutageHours;
    await task.save();

    if (task.leakPointId) {
      await models.LeakPoint.findByIdAndUpdate(task.leakPointId, {
        status: 'repaired',
        repairedAt: new Date()
      });
    }

    const repairRecord = await this._createRepairRecord(task, repairData);
    await this._check30DayRepeatLeak(repairRecord);

    return task;
  }

  async _createRepairRecord(task, repairData) {
    return models.RepairRecord.create({
      repairTaskId: task._id,
      pipeSegmentId: task.pipeSegmentId,
      leakPointId: task.leakPointId,
      repairDate: new Date(),
      repairType: repairData.repairType || 'other',
      pipeCondition: repairData.pipeCondition || {},
      leakCause: repairData.leakCause,
      solution: repairData.repairNotes,
      warrantyPeriod: repairData.warrantyPeriod || 90,
      replacedPipeLength: repairData.replacedPipeLength,
      qualityCheckPassed: repairData.qualityCheckPassed !== false,
      inspectorId: task.assigneeTeamId
    });
  }

  async _check30DayRepeatLeak(repairRecord) {
    if (!repairRecord.pipeSegmentId) return false;

    const thirtyDaysAgo = new Date(Date.now() - config.repeatedLeakDays * 24 * 60 * 60 * 1000);

    const priorRepairs = await models.RepairRecord.countDocuments({
      pipeSegmentId: repairRecord.pipeSegmentId,
      repairDate: { $gte: thirtyDaysAgo, $lt: repairRecord.repairDate }
    });

    if (priorRepairs > 0) {
      repairRecord.is30DayRepeat = true;
      await repairRecord.save();

      const pipe = await models.PipeSegment.findById(repairRecord.pipeSegmentId);
      if (pipe) {
        pipe.isHighRisk = true;
        pipe.riskLevel = 'high';
        pipe.riskReason = `${config.repeatedLeakDays}天内重复漏损${priorRepairs + 1}次`;
        pipe.leakCount30Days = priorRepairs + 1;
        pipe.lastLeakDate = repairRecord.repairDate;
        pipe.status = 'repaired';
        await pipe.save();

        const planners = await models.User.find({ roles: 'planner', status: 'active' });
        if (planners.length > 0) {
          await notificationService.notifyHighRiskPipe(pipe, planners.map(p => p._id));
        }
      }
      return true;
    }

    if (repairRecord.pipeSegmentId) {
      await models.PipeSegment.findByIdAndUpdate(repairRecord.pipeSegmentId, {
        status: 'repaired',
        lastLeakDate: repairRecord.repairDate
      });
    }
    return false;
  }

  async verifyRepairTask(taskId, verifierId, notes) {
    const task = await models.RepairTask.findById(taskId);
    if (!task) throw new Error('抢修任务不存在');
    if (task.status !== 'completed') throw new Error('任务状态不允许验收');

    task.status = 'verified';
    task.verifierId = verifierId;
    task.verifiedAt = new Date();
    task.verificationNotes = notes;
    await task.save();

    return task;
  }

  async getWorkOrders(filters = {}) {
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.assigneeId) query.assigneeId = filters.assigneeId;
    if (filters.priority) query.priority = filters.priority;
    if (filters.type) query.type = filters.type;

    return models.WorkOrder.find(query)
      .sort({ createdAt: -1 })
      .limit(filters.limit || 100)
      .populate('assigneeId', 'realName phone')
      .populate('leakPointId');
  }

  async getRepairTasks(filters = {}) {
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.assigneeTeamId) query.assigneeTeamId = filters.assigneeTeamId;
    if (filters.priority) query.priority = filters.priority;
    if (filters.leakLevel) query.leakLevel = filters.leakLevel;

    return models.RepairTask.find(query)
      .sort({ createdAt: -1 })
      .limit(filters.limit || 100)
      .populate('assigneeTeamId', 'realName phone skills')
      .populate('pipeSegmentId')
      .populate('leakPointId');
  }
}

module.exports = new RepairService();
