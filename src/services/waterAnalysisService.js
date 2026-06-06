const models = require('../models');
const { generateId } = require('../utils/helpers');
const notificationService = require('./notificationService');

class WaterAnalysisService {
  async submitComplaint(userId, data) {
    const user = await models.User.findById(userId);
    if (!user) throw new Error('用户不存在');

    const complaint = await models.Complaint.create({
      code: generateId('CP'),
      userId: userId,
      type: data.type || 'bill_anomaly',
      title: data.title,
      description: data.description,
      billId: data.billId,
      status: 'submitted'
    });

    setImmediate(async () => {
      try {
        await this._analyzeComplaint(complaint);
      } catch (e) {
        console.error('申诉分析失败:', e.message);
      }
    });

    return complaint;
  }

  async _analyzeComplaint(complaint) {
    complaint.status = 'analyzing';
    await complaint.save();

    const user = await models.User.findById(complaint.userId);
    if (!user) return;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const userUsages = await models.WaterUsage.find({
      userId: complaint.userId,
      date: { $gte: thirtyDaysAgo }
    }).sort({ date: 1 });

    const user30DayAvg = userUsages.length > 0
      ? userUsages.reduce((s, u) => s + u.usage, 0) / userUsages.length
      : 0;

    const sameHouseTypeUsers = await models.User.find({
      'address.houseType': user.address?.houseType,
      _id: { $ne: complaint.userId }
    }).limit(100).select('_id');

    let sameTypeAvg = 0;
    if (sameHouseTypeUsers.length > 0) {
      const sameTypeUsages = await models.WaterUsage.aggregate([
        {
          $match: {
            userId: { $in: sameHouseTypeUsers.map(u => u._id) },
            date: { $gte: thirtyDaysAgo }
          }
        },
        { $group: { _id: null, avgUsage: { $avg: '$usage' } } }
      ]);
      sameTypeAvg = sameTypeUsages.length > 0 ? sameTypeUsages[0].avgUsage : 0;
    }

    const deviationPercent = sameTypeAvg > 0
      ? ((user30DayAvg - sameTypeAvg) / sameTypeAvg) * 100
      : 0;

    const isInternalLeak = this._detectInternalLeak(userUsages, deviationPercent);

    const anomalyScore = Math.min(100, Math.abs(deviationPercent) * 2);

    let recommendation;
    let suggestedNextStep;

    if (isInternalLeak) {
      recommendation = '根据用水曲线和同户型对比，您的用水量显著偏高，检测到持续高用水模式，疑似内部管道漏水。';
      suggestedNextStep = '建议立即联系物业或专业维修人员进行室内管道检修，或提交报修申请。';
    } else if (deviationPercent > 30) {
      recommendation = '您的用水量高于同户型平均水平，可能存在用水习惯差异或轻微渗漏。';
      suggestedNextStep = '建议检查马桶、水龙头等设施，若无异常可考虑调整用水习惯。';
    } else if (deviationPercent < -30) {
      recommendation = '您的用水量低于同户型平均水平，水表读数可能存在异常。';
      suggestedNextStep = '建议核实水表读数，若读数无误可申请人工复核。';
    } else {
      recommendation = '您的用水量处于正常范围，与同户型平均水平基本一致。';
      suggestedNextStep = '若仍有疑问，可申请人工复核账单。';
    }

    complaint.analysisResult = {
      isInternalLeak,
      usageComparison: {
        user30DayAvg: Math.round(user30DayAvg * 100) / 100,
        sameTypeAvg: Math.round(sameTypeAvg * 100) / 100,
        deviationPercent: Math.round(deviationPercent * 100) / 100
      },
      usageCurveData: userUsages.slice(-14).map(u => ({ date: u.date, usage: u.usage })),
      recommendation,
      anomalyScore: Math.round(anomalyScore),
      suggestedNextStep
    };
    complaint.status = 'resolved';
    complaint.resolvedAt = new Date();
    await complaint.save();

    await notificationService.notifyComplaintStatus(complaint);
    return complaint;
  }

  _detectInternalLeak(usages, deviationPercent) {
    if (deviationPercent < 50) return false;
    if (usages.length < 7) return false;

    const sorted = [...usages].sort((a, b) => a.usage - b.usage);
    const minUsage = sorted[Math.floor(sorted.length * 0.1)]?.usage || 0;

    if (minUsage > 0.5) return true;

    let consecutiveHighDays = 0;
    const avg = usages.reduce((s, u) => s + u.usage, 0) / usages.length;
    for (const u of usages) {
      if (u.usage > avg * 1.3) {
        consecutiveHighDays++;
      } else {
        consecutiveHighDays = 0;
      }
    }

    return consecutiveHighDays >= 5;
  }

  async getComplaints(filters = {}) {
    const query = {};
    if (filters.userId) query.userId = filters.userId;
    if (filters.status) query.status = filters.status;
    if (filters.type) query.type = filters.type;

    return models.Complaint.find(query)
      .sort({ createdAt: -1 })
      .limit(filters.limit || 100)
      .populate('userId', 'realName phone')
      .populate('billId');
  }

  async getComplaintById(id) {
    return models.Complaint.findById(id)
      .populate('userId', 'realName phone waterMeterNo')
      .populate('billId');
  }

  async respondComplaint(id, response, handlerId) {
    const complaint = await models.Complaint.findById(id);
    if (!complaint) throw new Error('申诉不存在');

    complaint.response = response;
    complaint.handlerId = handlerId;
    complaint.status = 'resolved';
    complaint.resolvedAt = new Date();
    await complaint.save();

    await notificationService.notifyComplaintStatus(complaint);
    return complaint;
  }

  async getWaterUsage(userId, options = {}) {
    const query = { userId };
    if (options.startDate) query.date = { $gte: new Date(options.startDate) };
    if (options.endDate) {
      query.date = query.date || {};
      query.date.$lte = new Date(options.endDate);
    }

    return models.WaterUsage.find(query)
      .sort({ date: -1 })
      .limit(options.limit || 60);
  }

  async getUsageStatistics(userId, days = 30) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const usages = await models.WaterUsage.find({
      userId,
      date: { $gte: startDate }
    });

    if (usages.length === 0) {
      return { total: 0, avg: 0, max: 0, min: 0, data: [] };
    }

    const values = usages.map(u => u.usage);
    return {
      total: values.reduce((s, v) => s + v, 0),
      avg: values.reduce((s, v) => s + v, 0) / values.length,
      max: Math.max(...values),
      min: Math.min(...values),
      data: usages.sort((a, b) => a.date - b.date).map(u => ({
        date: u.date,
        usage: u.usage
      }))
    };
  }
}

module.exports = new WaterAnalysisService();
