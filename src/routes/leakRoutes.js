const express = require('express');
const router = express.Router();
const leakController = require('../controllers/leakController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

router.get('/detect', authMiddleware, roleMiddleware('admin', 'operator'), leakController.detectLeaks);
router.get('/leak-points', authMiddleware, leakController.getLeakPoints);
router.get('/leak-points/:id', authMiddleware, leakController.getLeakPointById);

router.get('/work-orders', authMiddleware, leakController.getWorkOrders);
router.post('/work-orders/:id/accept', authMiddleware, roleMiddleware('inspector'), leakController.acceptWorkOrder);
router.post('/work-orders/:id/start', authMiddleware, roleMiddleware('inspector'), leakController.startWorkOrder);
router.post('/work-orders/:id/submit', authMiddleware, roleMiddleware('inspector'), leakController.submitInspectionResult);

router.get('/repair-tasks', authMiddleware, leakController.getRepairTasks);
router.post('/repair-tasks/:id/accept', authMiddleware, roleMiddleware('repairer'), leakController.acceptRepairTask);
router.post('/repair-tasks/:id/start', authMiddleware, roleMiddleware('repairer'), leakController.startRepairTask);
router.post('/repair-tasks/:id/complete', authMiddleware, roleMiddleware('repairer'), leakController.completeRepairTask);
router.post('/repair-tasks/:id/verify', authMiddleware, roleMiddleware('admin'), leakController.verifyRepairTask);

module.exports = router;
