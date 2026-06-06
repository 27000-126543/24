const { dataUploadService, leakDetectionService } = require('../services');

class DataController {
  async uploadWaterPlantData(req, res) {
    try {
      const { plantCode } = req.params;
      const result = await dataUploadService.uploadWaterPlantData(plantCode, req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async uploadPumpStationData(req, res) {
    try {
      const { stationCode } = req.params;
      const result = await dataUploadService.uploadPumpStationData(stationCode, req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async uploadSensorData(req, res) {
    try {
      const { sensorCode } = req.params;
      const { value, timestamp } = req.body;
      const result = await dataUploadService.uploadSensorData(sensorCode, value, timestamp);

      if (result.isAbnormal && result.sensor.type === 'pressure') {
        setImmediate(async () => {
          try {
            await leakDetectionService.processSensorAnomaly(result.sensorData, result.sensor);
          } catch (e) {
            console.error('漏损检测处理失败:', e.message);
          }
        });
      }

      res.json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async uploadBatchSensorData(req, res) {
    try {
      const { readings } = req.body;
      const results = await dataUploadService.uploadBatchSensorData(readings);
      res.json({ success: true, data: results });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async uploadWaterMeterData(req, res) {
    try {
      const { meterNo } = req.params;
      const { usage, date } = req.body;
      const result = await dataUploadService.uploadWaterMeterData(meterNo, usage, date);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}

module.exports = new DataController();
