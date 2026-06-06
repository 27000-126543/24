const { reportService, notificationService } = require('../services');

class ReportController {
  async generateDailyReport(req, res) {
    try {
      const { date, zone } = req.body;
      const report = await reportService.generateDailyReport(date, zone);
      res.json({ success: true, data: report });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getReports(req, res) {
    try {
      const reports = await reportService.getReports(req.query);
      res.json(reports);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async getReportById(req, res) {
    try {
      const report = await reportService.getReportById(req.params.id);
      if (!report) {
        return res.status(404).json({ message: '报表不存在' });
      }
      res.json(report);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async exportReport(req, res) {
    try {
      const { startDate, endDate, zone } = req.query;
      const workbook = await reportService.exportReportToExcel(startDate, endDate, zone);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=water_efficiency_report.xlsx');

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getDashboard(req, res) {
    try {
      const { zone } = req.query;
      const stats = await reportService.getDashboardStats(zone);
      res.json(stats);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async getNotifications(req, res) {
    try {
      const notifications = await notificationService.getNotifications(req.user.userId, req.query);
      res.json(notifications);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async markNotificationRead(req, res) {
    try {
      const { id } = req.params;
      const result = await notificationService.markAsRead(id, req.user.userId);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async markAllNotificationsRead(req, res) {
    try {
      await notificationService.markAllAsRead(req.user.userId);
      res.json({ success: true, message: '全部标记已读' });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}

module.exports = new ReportController();
