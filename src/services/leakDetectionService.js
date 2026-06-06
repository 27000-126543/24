const models = require('../models');
const config = require('../config');
const { calculateLeakLevel, calculateHaversineDistance, generateId } = require('../utils/helpers');
const notificationService = require('./notificationService');

class LeakDetectionService {
  async detectAnomalies() {
    const abnormalData = await models.SensorData.find({
      isAbnormal: true,
      timestamp: { $gte: new Date(Date.now() - 30 * 60 * 1000) }
    }).populate('sensorId');

    const grouped = this._groupByLocation(abnormalData);
    const results = [];

    for (const group of grouped) {
      try {
        if (group.data.length >= 2 || this._isSignificantDrop(group.data[0])) {
          const leakPoint = await this._createLeakPoint(group);
          results.push(leakPoint);
        }
      } catch (e) {
        console.error('漏损检测处理失败:', e.message);
      }
    }
    return results;
  }

  async processSensorAnomaly(sensorData, sensor) {
    if (!sensorData.isAbnormal) return null;

    const recentAbnormal = await models.SensorData.find({
      sensorId: sensor._id,
      isAbnormal: true,
      timestamp: { $gte: new Date(sensorData.timestamp.getTime() - 15 * 60 * 1000) }
    });

    if (recentAbnormal.length < 3 && !this._isSignificantDrop(sensorData)) {
      return null;
    }

    const existingLeak = await models.LeakPoint.findOne({
      sensorId: sensor._id,
      status: { $in: ['suspected', 'confirmed_inspecting'] },
      detectedAt: { $gte: new Date(Date.now() - 2 * 60 * 60 * 1000) }
    });

    if (existingLeak) {
      return existingLeak;
    }

    const group = {
      sensorId: sensor._id,
      pipeSegmentId: sensor.pipeSegmentId,
      location: sensor.location,
      zone: sensor.zone,
      data: [...recentAbnormal, sensorData]
    };

    const seen = new Set();
    group.data = group.data.filter(d => {
      const id = d._id ? d._id.toString() : `${d.timestamp}-${d.value}`;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    return this._createLeakPoint(group);
  }

  _isSignificantDrop(sensorData) {
    if (!sensorData.baselineValue) return false;
    const drop = sensorData.baselineValue - sensorData.value;
    return drop >= config.leakLevels.level1.minPressureDrop;
  }

  _groupByLocation(abnormalData) {
    const groups = new Map();
    for (const d of abnormalData) {
      if (!d.sensorId) continue;
      const key = d.sensorId.pipeSegmentId?.toString() || d.sensorId._id.toString();
      if (!groups.has(key)) {
        groups.set(key, {
          sensorId: d.sensorId._id,
          pipeSegmentId: d.sensorId.pipeSegmentId,
          location: d.sensorId.location,
          zone: d.sensorId.zone,
          data: []
        });
      }
      groups.get(key).data.push(d);
    }
    return Array.from(groups.values());
  }

  async _createLeakPoint(group) {
    const baselineValues = group.data.map(d => d.baselineValue || d.value).filter(v => v);
    const currentValues = group.data.map(d => d.value);
    const avgBaseline = baselineValues.length > 0
      ? baselineValues.reduce((a, b) => a + b, 0) / baselineValues.length
      : 0;
    const avgCurrent = currentValues.reduce((a, b) => a + b, 0) / currentValues.length;
    const pressureDrop = Math.max(0, avgBaseline - avgCurrent);

    const leakInfo = calculateLeakLevel(pressureDrop, config.leakLevels);
    if (!leakInfo) return null;

    const allLeakPoints = await models.LeakPoint.find({
      location: { $exists: true }
    });

    const nearbyPoints = allLeakPoints.filter(lp => {
      if (!lp.location || lp.location.lat == null) return false;
      const dist = calculateHaversineDistance(
        group.location.lat, group.location.lng,
        lp.location.lat, lp.location.lng
      );
      return dist <= 0.1;
    });

    const similarCases = nearbyPoints.filter(lp => lp.status !== 'false_alarm').length;
    const accurateCases = nearbyPoints.filter(lp =>
      ['confirmed_leak', 'repairing', 'repaired'].includes(lp.status)
    ).length;

    const accuracyRate = similarCases > 0 ? accurateCases / similarCases : 0.7;

    const leakPoint = await models.LeakPoint.create({
      code: generateId('LP'),
      pipeSegmentId: group.pipeSegmentId,
      sensorId: group.sensorId,
      location: group.location,
      zone: group.zone,
      detectedAt: new Date(),
      detectionMethod: 'pressure_anomaly',
      pressureDrop: pressureDrop,
      estimatedLeakRate: pressureDrop * 100,
      leakLevel: leakInfo.level,
      leakLevelName: leakInfo.name,
      priority: leakInfo.priority,
      status: 'suspected',
      relatedSensorDataIds: [...new Set(group.data.map(d => d._id).filter(Boolean))],
      historySimilarCases: similarCases,
      historicalAccuracyRate: accuracyRate
    });

    if (group.pipeSegmentId) {
      await models.PipeSegment.findByIdAndUpdate(group.pipeSegmentId, {
        status: 'suspicious'
      });
    }

    await notificationService.createAlert({
      title: `疑似漏损告警: ${leakPoint.code}`,
      content: `检测到压力异常，${leakInfo.name}，压降 ${pressureDrop.toFixed(3)}MPa，位置: ${group.zone || '未知区域'}`,
      priority: leakInfo.priority,
      recipientRole: 'operator'
    });

    const workOrder = await this._autoAssignWorkOrder(leakPoint);
    leakPoint.inspectionWorkOrderId = workOrder._id;
    await leakPoint.save();

    return leakPoint;
  }

  async _autoAssignWorkOrder(leakPoint) {
    const inspectors = await models.User.find({
      roles: 'inspector',
      status: 'active'
    });

    if (inspectors.length === 0) {
      return this._createWorkOrder(leakPoint, null);
    }

    let bestInspector = null;
    let minDistance = Infinity;
    let minLoad = Infinity;

    for (const inspector of inspectors) {
      if (!inspector.location || !inspector.location.lat) continue;

      const distance = calculateHaversineDistance(
        inspector.location.lat, inspector.location.lng,
        leakPoint.location.lat, leakPoint.location.lng
      );

      const activeOrders = await models.WorkOrder.countDocuments({
        assigneeId: inspector._id,
        status: { $in: ['assigned', 'accepted', 'in_progress'] }
      });

      if (activeOrders < minLoad || (activeOrders === minLoad && distance < minDistance)) {
        minLoad = activeOrders;
        minDistance = distance;
        bestInspector = inspector;
      }
    }

    return this._createWorkOrder(leakPoint, bestInspector, minDistance);
  }

  async _createWorkOrder(leakPoint, inspector, distance) {
    const deadline = new Date();
    if (leakPoint.priority === 'critical') {
      deadline.setHours(deadline.getHours() + 1);
    } else if (leakPoint.priority === 'high') {
      deadline.setHours(deadline.getHours() + 2);
    } else if (leakPoint.priority === 'medium') {
      deadline.setHours(deadline.getHours() + 4);
    } else {
      deadline.setDate(deadline.getDate() + 1);
    }

    const workOrder = await models.WorkOrder.create({
      code: generateId('WO'),
      type: leakPoint.priority === 'critical' || leakPoint.priority === 'high' ? 'emergency' : 'inspection',
      leakPointId: leakPoint._id,
      title: `${leakPoint.leakLevelName}勘察 - ${leakPoint.zone || '未知区域'}`,
      description: `系统检测到疑似${leakPoint.leakLevelName}，压降 ${leakPoint.pressureDrop?.toFixed(3)}MPa，请现场勘察确认。`,
      location: leakPoint.location,
      zone: leakPoint.zone,
      priority: leakPoint.priority,
      status: inspector ? 'assigned' : 'pending',
      assigneeId: inspector ? inspector._id : null,
      assigneeLocation: inspector ? inspector.location : null,
      distanceToSite: distance,
      assignedAt: inspector ? new Date() : null,
      deadline: deadline
    });

    if (inspector) {
      await notificationService.notifyNewWorkOrder(workOrder);
    }

    return workOrder;
  }

  async getLeakPoints(filters = {}) {
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.priority) query.priority = filters.priority;
    if (filters.leakLevel) query.leakLevel = filters.leakLevel;
    if (filters.zone) query.zone = filters.zone;

    return models.LeakPoint.find(query)
      .sort({ detectedAt: -1 })
      .limit(filters.limit || 100)
      .populate('pipeSegmentId')
      .populate('inspectionWorkOrderId')
      .populate('repairTaskId');
  }

  async getLeakPointById(id) {
    return models.LeakPoint.findById(id)
      .populate('pipeSegmentId')
      .populate('inspectionWorkOrderId')
      .populate('repairTaskId')
      .populate('confirmedBy', 'realName');
  }
}

module.exports = new LeakDetectionService();
