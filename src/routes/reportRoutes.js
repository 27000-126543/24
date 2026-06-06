const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

router.get('/dashboard', authMiddleware, reportController.getDashboard);
router.post('/generate/daily', authMiddleware, roleMiddleware('admin'), reportController.generateDailyReport);
router.get('/', authMiddleware, reportController.getReports);
router.get('/:id', authMiddleware, reportController.getReportById);
router.get('/export/excel', authMiddleware, reportController.exportReport);

router.get('/notifications/list', authMiddleware, reportController.getNotifications);
router.post('/notifications/:id/read', authMiddleware, reportController.markNotificationRead);
router.post('/notifications/read-all', authMiddleware, reportController.markAllNotificationsRead);

module.exports = router;
