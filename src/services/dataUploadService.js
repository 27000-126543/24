const models = require('../models');
const notificationService = require('./notificationService');

class DataUploadService {
  async uploadWaterPlantData(plantCode, data) {
    const plant = await models.WaterPlant.findOne({ code: plantCode });
    if (!plant) {
      throw new Error('水厂不存在');
    }

    const plantData = await models.WaterPlantData.create({
      waterPlantId: plant._id,
      timestamp: data.timestamp || new Date(),
      inflowRate: data.inflowRate,
      totalInflow: data.totalInflow || 0,
      waterQuality: data.waterQuality,
      energyConsumption: data.energyConsumption || 0,
      chemicalUsage: data.chemicalUsage || {},
      status: 'normal'
    });

    await models.WaterPlant.findByIdAndUpdate(plant._id, {
      currentOutput: data.inflowRate,
      $set: { updatedAt: new Date() }
    });

    return plantData;
  }

  async uploadPumpStationData(stationCode, data) {
    const station = await models.PumpStation.findOne({ code: stationCode });
    if (!station) {
      throw new Error('泵站不存在');
    }

    const stationData = await models.PumpStationData.create({
      pumpStationId: station._id,
      timestamp: data.timestamp || new Date(),
      inflowRate: data.inflowRate,
      totalInflow: data.totalInflow || 0,
      inletPressure: data.inletPressure,
      outletPressure: data.outletPressure,
      pumps: data.pumps || [],
      waterQuality: data.waterQuality || {},
      energyConsumption: data.energyConsumption || 0,
      status: 'normal'
    });

    const updateData = {
      inletPressure: data.inletPressure,
      outletPressure: data.outletPressure,
      flowRate: data.inflowRate,
      $set: { updatedAt: new Date() }
    };

    if (data.pumps && data.pumps.length > 0) {
      updateData.pumps = data.pumps.map(p => ({
        pumpId: p.pumpId,
        currentFrequency: p.frequency,
        status: p.status
      }));
    }

    await models.PumpStation.findByIdAndUpdate(station._id, updateData);

    return stationData;
  }

  async uploadSensorData(sensorCode, value, timestamp) {
    const sensor = await models.Sensor.findOne({ code: sensorCode });
    if (!sensor) {
      throw new Error('传感器不存在');
    }

    const isAbnormal = this._checkAbnormal(sensor, value);
    const baselineValue = await this._getBaseline(sensor);
    const deviation = baselineValue ? Math.abs(value - baselineValue) / baselineValue : 0;

    const sensorData = await models.SensorData.create({
      sensorId: sensor._id,
      sensorCode: sensorCode,
      timestamp: timestamp || new Date(),
      value: value,
      isAbnormal: isAbnormal.isAbnormal,
      abnormalType: isAbnormal.abnormalType,
      baselineValue: baselineValue,
      deviation: deviation
    });

    await models.Sensor.findByIdAndUpdate(sensor._id, {
      lastValue: value,
      lastReadAt: new Date()
    });

    return { sensorData, isAbnormal: isAbnormal.isAbnormal, sensor };
  }

  async uploadBatchSensorData(readings) {
    const results = [];
    for (const reading of readings) {
      try {
        const result = await this.uploadSensorData(
          reading.sensorCode, reading.value, reading.timestamp);
        results.push(result);
      } catch (e) {
        results.push({ error: e.message, sensorCode: reading.sensorCode });
      }
    }
    return results;
  }

  async uploadWaterMeterData(meterNo, usage, date) {
    const user = await models.User.findOne({ waterMeterNo: meterNo });
    if (!user) {
      throw new Error('水表不存在');
    }

    const existing = await models.WaterUsage.findOne({
      userId: user._id,
      date: date
    });

    if (existing) {
      existing.usage = usage;
      existing.updatedAt = new Date();
      await existing.save();
      return existing;
    }

    const lastUsage = await models.WaterUsage.findOne({ userId: user._id })
      .sort({ date: -1 });

    return models.WaterUsage.create({
      userId: user._id,
      waterMeterNo: meterNo,
      date: date,
      usage: usage,
      cumulativeUsage: (lastUsage ? lastUsage.cumulativeUsage : 0) + usage,
      source: 'auto_meter'
    });
  }

  _checkAbnormal(sensor, value) {
    const result = { isAbnormal: false, abnormalType: null };
    if (sensor.type === 'pressure') {
      const minNormal = sensor.normalMin ?? 0.14;
      const maxNormal = sensor.normalMax ?? 0.40;
      if (value < minNormal) {
        result.isAbnormal = true;
        result.abnormalType = 'low_pressure';
      } else if (value > maxNormal) {
        result.isAbnormal = true;
        result.abnormalType = 'high_pressure';
      }
    }
    return result;
  }

  async _getBaseline(sensor) {
    const recent = await models.SensorData.find({
      sensorId: sensor._id,
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    if (recent.length < 5) return sensor.lastValue || null;

    const values = recent.map(r => r.value);
    const sorted = values.sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    const filtered = values.filter(v => v >= q1 - 1.5 * iqr && v <= q3 + 1.5 * iqr);

    if (filtered.length === 0) return sensor.lastValue || null;
    return filtered.reduce((a, b) => a + b, 0) / filtered.length;
  }
}

module.exports = new DataUploadService();
