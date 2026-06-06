const models = require('../models');
const config = require('../config');
const notificationService = require('./notificationService');

class SmartDispatchService {
  constructor() {
    this.modelVersion = 'v1.0';
  }

  async optimizePumpFrequencies() {
    const results = [];
    const stations = await models.PumpStation.find({ status: 'running' });

    for (const station of stations) {
      try {
        const adjustment = await this._calculatePumpAdjustment(station);
        if (adjustment.needsAdjustment) {
          const log = await this._applyPumpAdjustment(station, adjustment);
          results.push(log);
        }
      } catch (e) {
        console.error(`泵站 ${station.code} 调度失败:`, e.message);
      }
    }
    return results;
  }

  async _calculatePumpAdjustment(station) {
    const recentData = await models.PumpStationData.find({
      pumpStationId: station._id,
      timestamp: { $gte: new Date(Date.now() - 2 * 60 * 60 * 1000) }
    }).sort({ timestamp: -1 }).limit(10);

    if (recentData.length === 0) {
      return { needsAdjustment: false };
    }

    const avgOutletPressure = recentData.reduce((s, d) => s + d.outletPressure, 0) / recentData.length;
    const avgInletPressure = recentData.reduce((s, d) => s + d.inletPressure, 0) / recentData.length;
    const avgFlowRate = recentData.reduce((s, d) => s + d.inflowRate, 0) / recentData.length;

    const targetPressure = this._getTargetPressure(station, avgFlowRate);
    const pressureDiff = targetPressure - avgOutletPressure;
    const threshold = 0.01;

    if (Math.abs(pressureDiff) < threshold) {
      return { needsAdjustment: false };
    }

    const runningPumps = station.pumps.filter(p => p.status === 'running');
    if (runningPumps.length === 0) {
      return { needsAdjustment: false, reason: '无运行中的水泵' };
    }

    const avgCurrentFreq = runningPumps.reduce((s, p) => s + p.currentFrequency, 0) / runningPumps.length;
    let newFrequency = avgCurrentFreq + (pressureDiff * 100);

    newFrequency = Math.max(runningPumps[0].minFrequency || 20,
      Math.min(runningPumps[0].maxFrequency || 60, newFrequency));

    const freqDiff = Math.abs(newFrequency - avgCurrentFreq);
    if (freqDiff < 1) {
      return { needsAdjustment: false };
    }

    return {
      needsAdjustment: true,
      newFrequency: Math.round(newFrequency * 10) / 10,
      previousFrequency: Math.round(avgCurrentFreq * 10) / 10,
      reason: pressureDiff > 0
        ? `出口压力偏低(当前${avgOutletPressure.toFixed(3)}MPa, 目标${targetPressure.toFixed(3)}MPa), 需提高频率`
        : `出口压力偏高(当前${avgOutletPressure.toFixed(3)}MPa, 目标${targetPressure.toFixed(3)}MPa), 需降低频率`,
      pressureSnapshot: {
        avgPressure: avgOutletPressure,
        minPressure: Math.min(...recentData.map(d => d.outletPressure)),
        maxPressure: Math.max(...recentData.map(d => d.outletPressure)),
        affectedZone: station.zone
      }
    };
  }

  _getTargetPressure(station, flowRate) {
    const baseTarget = 0.28;
    const flowAdjustment = (flowRate / 1000) * 0.02;
    return baseTarget + flowAdjustment;
  }

  async _applyPumpAdjustment(station, adjustment) {
    const runningPumps = station.pumps.filter(p => p.status === 'running');

    runningPumps.forEach(pump => {
      pump.targetFrequency = adjustment.newFrequency;
      pump.currentFrequency = adjustment.newFrequency;
    });

    await models.PumpStation.findByIdAndUpdate(station._id, {
      pumps: station.pumps,
      $set: { updatedAt: new Date() }
    });

    const log = await models.AdjustmentLog.create({
      type: 'pump_frequency',
      targetId: station._id,
      targetType: 'PumpStation',
      previousValue: adjustment.previousFrequency,
      newValue: adjustment.newFrequency,
      reason: adjustment.reason,
      trigger: 'auto',
      modelVersion: this.modelVersion,
      pressureSnapshot: adjustment.pressureSnapshot,
      executedAt: new Date(),
      result: 'success'
    });

    await notificationService.createNotification({
      recipientRole: 'operator',
      type: 'system',
      title: `泵站自动调度: ${station.code}`,
      content: adjustment.reason,
      relatedId: station._id,
      relatedType: 'PumpStation',
      priority: 'medium'
    });

    return log;
  }

  async optimizeChlorineDosage() {
    const results = [];
    const plants = await models.WaterPlant.find({ status: 'running' });

    for (const plant of plants) {
      try {
        const adjustment = await this._calculateChlorineAdjustment(plant);
        if (adjustment.needsAdjustment) {
          const log = await this._applyChlorineAdjustment(plant, adjustment);
          results.push(log);
        }
      } catch (e) {
        console.error(`水厂 ${plant.code} 加氯调整失败:`, e.message);
      }
    }
    return results;
  }

  async _calculateChlorineAdjustment(plant) {
    const recentData = await models.WaterPlantData.find({
      waterPlantId: plant._id,
      timestamp: { $gte: new Date(Date.now() - 1 * 60 * 60 * 1000) }
    }).sort({ timestamp: -1 }).limit(20);

    if (recentData.length === 0) {
      return { needsAdjustment: false };
    }

    const avgChlorine = recentData.reduce((s, d) => s + (d.waterQuality?.chlorine || 0), 0) / recentData.length;
    const target = config.chlorineTarget.target;
    const diff = target - avgChlorine;

    if (Math.abs(diff) < 0.02) {
      return { needsAdjustment: false };
    }

    let newDosage = plant.chlorineDosageRate + (diff * 0.5);
    newDosage = Math.max(0.1, Math.min(1.0, newDosage));

    if (Math.abs(newDosage - plant.chlorineDosageRate) < 0.05) {
      return { needsAdjustment: false };
    }

    return {
      needsAdjustment: true,
      previousValue: plant.chlorineDosageRate,
      newValue: Math.round(newDosage * 100) / 100,
      reason: diff > 0
        ? `余氯偏低(当前${avgChlorine.toFixed(2)}mg/L, 目标${target}mg/L), 需提高加氯量`
        : `余氯偏高(当前${avgChlorine.toFixed(2)}mg/L, 目标${target}mg/L), 需降低加氯量`,
      avgChlorine: avgChlorine
    };
  }

  async _applyChlorineAdjustment(plant, adjustment) {
    await models.WaterPlant.findByIdAndUpdate(plant._id, {
      chlorineDosageRate: adjustment.newValue,
      $set: { updatedAt: new Date() }
    });

    const log = await models.AdjustmentLog.create({
      type: 'chlorine_dosage',
      targetId: plant._id,
      targetType: 'WaterPlant',
      previousValue: adjustment.previousValue,
      newValue: adjustment.newValue,
      reason: adjustment.reason,
      trigger: 'auto',
      modelVersion: this.modelVersion,
      executedAt: new Date(),
      result: 'success'
    });

    return log;
  }

  async manualAdjustPump(stationId, pumpId, newFrequency, operatorId) {
    const station = await models.PumpStation.findById(stationId);
    if (!station) throw new Error('泵站不存在');

    const pump = station.pumps.find(p => p.pumpId === pumpId);
    if (!pump) throw new Error('水泵不存在');

    const previousFreq = pump.currentFrequency;
    pump.currentFrequency = newFrequency;
    pump.targetFrequency = newFrequency;

    await models.PumpStation.findByIdAndUpdate(stationId, {
      pumps: station.pumps,
      $set: { updatedAt: new Date() }
    });

    return models.AdjustmentLog.create({
      type: 'pump_frequency',
      targetId: stationId,
      targetType: 'PumpStation',
      previousValue: previousFreq,
      newValue: newFrequency,
      reason: '人工调整',
      trigger: 'manual',
      operatorId: operatorId,
      executedAt: new Date(),
      result: 'success'
    });
  }

  async manualAdjustChlorine(plantId, newDosage, operatorId) {
    const plant = await models.WaterPlant.findById(plantId);
    if (!plant) throw new Error('水厂不存在');

    const previousDosage = plant.chlorineDosageRate;

    await models.WaterPlant.findByIdAndUpdate(plantId, {
      chlorineDosageRate: newDosage,
      $set: { updatedAt: new Date() }
    });

    return models.AdjustmentLog.create({
      type: 'chlorine_dosage',
      targetId: plantId,
      targetType: 'WaterPlant',
      previousValue: previousDosage,
      newValue: newDosage,
      reason: '人工调整',
      trigger: 'manual',
      operatorId: operatorId,
      executedAt: new Date(),
      result: 'success'
    });
  }

  async getAdjustmentHistory(filters = {}) {
    const query = {};
    if (filters.type) query.type = filters.type;
    if (filters.targetId) query.targetId = filters.targetId;
    if (filters.startDate) query.executedAt = { $gte: new Date(filters.startDate) };
    if (filters.endDate) query.executedAt = { ...query.executedAt, $lte: new Date(filters.endDate) };

    return models.AdjustmentLog.find(query)
      .sort({ executedAt: -1 })
      .limit(filters.limit || 100)
      .populate('operatorId', 'realName username');
  }
}

module.exports = new SmartDispatchService();
