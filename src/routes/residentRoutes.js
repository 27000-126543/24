const express = require('express');
const router = express.Router();
const residentController = require('../controllers/residentController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

router.post('/complaints', authMiddleware, roleMiddleware('resident'), residentController.submitComplaint);
router.get('/complaints/my', authMiddleware, roleMiddleware('resident'), residentController.getMyComplaints);
router.get('/complaints', authMiddleware, residentController.getComplaints);
router.get('/complaints/:id', authMiddleware, residentController.getComplaintById);
router.post('/complaints/:id/respond', authMiddleware, roleMiddleware('admin'), residentController.respondComplaint);

router.get('/water-usage', authMiddleware, residentController.getWaterUsage);
router.get('/water-usage/statistics', authMiddleware, residentController.getUsageStatistics);

router.get('/bills/my', authMiddleware, roleMiddleware('resident'), residentController.getMyBills);
router.get('/bills', authMiddleware, residentController.getBills);
router.get('/bills/:id', authMiddleware, residentController.getBillById);
router.post('/bills/generate', authMiddleware, roleMiddleware('admin'), residentController.generateMonthlyBills);
router.post('/bills/:id/pay', authMiddleware, residentController.processPayment);
router.get('/bills/check-overdue', authMiddleware, roleMiddleware('admin'), residentController.checkOverdueBills);

router.get('/restriction-orders', authMiddleware, residentController.getRestrictionOrders);

module.exports = router;
