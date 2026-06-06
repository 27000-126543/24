const { smartDispatchService } = require('../services');

class DispatchController {
  async optimizePumps(req, res) {
    try {
      const results = await smartDispatchService.optimizePumpFrequencies();
      res.json({ success: true, adjusted: results.length, data: results });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async optimizeChlorine(req, res) {
    try {
      const results = await smartDispatchService.optimizeChlorineDosage();
      res.json({ success: true, adjusted: results.length, data: results });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async manualAdjustPump(req, res) {
    try {
      const { stationId } = req.params;
      const { pumpId, newFrequency } = req.body;
      const result = await smartDispatchService.manualAdjustPump(
        stationId, pumpId, newFrequency, req.user.userId
      );
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async manualAdjustChlorine(req, res) {
    try {
      const { plantId } = req.params;
      const { newDosage } = req.body;
      const result = await smartDispatchService.manualAdjustChlorine(
        plantId, newDosage, req.user.userId
      );
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getAdjustmentHistory(req, res) {
    try {
      const history = await smartDispatchService.getAdjustmentHistory(req.query);
      res.json(history);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
}

module.exports = new DispatchController();
