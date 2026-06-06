const { leakDetectionService, repairService } = require('../services');

class LeakController {
  async detectLeaks(req, res) {
    try {
      const results = await leakDetectionService.detectAnomalies();
      res.json({ success: true, detected: results.length, data: results });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getLeakPoints(req, res) {
    try {
      const leakPoints = await leakDetectionService.getLeakPoints(req.query);
      res.json(leakPoints);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async getLeakPointById(req, res) {
    try {
      const leakPoint = await leakDetectionService.getLeakPointById(req.params.id);
      if (!leakPoint) {
        return res.status(404).json({ message: '漏损点不存在' });
      }
      res.json(leakPoint);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async getWorkOrders(req, res) {
    try {
      const workOrders = await repairService.getWorkOrders(req.query);
      res.json(workOrders);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async acceptWorkOrder(req, res) {
    try {
      const { id } = req.params;
      const result = await repairService.acceptWorkOrder(id, req.user.userId);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async startWorkOrder(req, res) {
    try {
      const { id } = req.params;
      const result = await repairService.startWorkOrder(id, req.user.userId);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async submitInspectionResult(req, res) {
    try {
      const { id } = req.params;
      const result = await repairService.submitInspectionResult(id, req.user.userId, req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getRepairTasks(req, res) {
    try {
      const tasks = await repairService.getRepairTasks(req.query);
      res.json(tasks);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async acceptRepairTask(req, res) {
    try {
      const { id } = req.params;
      const result = await repairService.acceptRepairTask(id, req.user.userId);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async startRepairTask(req, res) {
    try {
      const { id } = req.params;
      const result = await repairService.startRepairTask(id, req.user.userId);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async completeRepairTask(req, res) {
    try {
      const { id } = req.params;
      const result = await repairService.completeRepairTask(id, req.user.userId, req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async verifyRepairTask(req, res) {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      const result = await repairService.verifyRepairTask(id, req.user.userId, notes);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}

module.exports = new LeakController();
