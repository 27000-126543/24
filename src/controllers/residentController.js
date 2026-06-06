const { waterAnalysisService, billingService } = require('../services');

class ResidentController {
  async submitComplaint(req, res) {
    try {
      const complaint = await waterAnalysisService.submitComplaint(req.user.userId, req.body);
      res.json({ success: true, data: complaint });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getMyComplaints(req, res) {
    try {
      const complaints = await waterAnalysisService.getComplaints({
        ...req.query,
        userId: req.user.userId
      });
      res.json(complaints);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async getComplaints(req, res) {
    try {
      const complaints = await waterAnalysisService.getComplaints(req.query);
      res.json(complaints);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async getComplaintById(req, res) {
    try {
      const complaint = await waterAnalysisService.getComplaintById(req.params.id);
      if (!complaint) {
        return res.status(404).json({ message: '申诉不存在' });
      }
      res.json(complaint);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async respondComplaint(req, res) {
    try {
      const { id } = req.params;
      const { response } = req.body;
      const result = await waterAnalysisService.respondComplaint(id, response, req.user.userId);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getWaterUsage(req, res) {
    try {
      const userId = req.query.userId || req.user.userId;
      const usage = await waterAnalysisService.getWaterUsage(userId, req.query);
      res.json(usage);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async getUsageStatistics(req, res) {
    try {
      const userId = req.query.userId || req.user.userId;
      const days = req.query.days || 30;
      const stats = await waterAnalysisService.getUsageStatistics(userId, days);
      res.json(stats);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async getMyBills(req, res) {
    try {
      const bills = await billingService.getBills({
        ...req.query,
        userId: req.user.userId
      });
      res.json(bills);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async getBills(req, res) {
    try {
      const bills = await billingService.getBills(req.query);
      res.json(bills);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async getBillById(req, res) {
    try {
      const bill = await billingService.getBillById(req.params.id);
      if (!bill) {
        return res.status(404).json({ message: '账单不存在' });
      }
      res.json(bill);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async generateMonthlyBills(req, res) {
    try {
      const { year, month } = req.body;
      const result = await billingService.generateMonthlyBills(year, month);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async processPayment(req, res) {
    try {
      const { id } = req.params;
      const { amount, method, transactionId } = req.body;
      const result = await billingService.processPayment(id, amount, method, transactionId);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async checkOverdueBills(req, res) {
    try {
      const result = await billingService.checkOverdueBills();
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getRestrictionOrders(req, res) {
    try {
      const orders = await billingService.getRestrictionOrders(req.query);
      res.json(orders);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
}

module.exports = new ResidentController();
