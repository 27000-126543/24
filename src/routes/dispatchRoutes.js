const express = require('express');
const router = express.Router();
const dispatchController = require('../controllers/dispatchController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

router.get('/optimize/pumps', authMiddleware, roleMiddleware('admin', 'operator'), dispatchController.optimizePumps);
router.get('/optimize/chlorine', authMiddleware, roleMiddleware('admin', 'operator'), dispatchController.optimizeChlorine);
router.post('/pump/:stationId/adjust', authMiddleware, roleMiddleware('admin', 'operator'), dispatchController.manualAdjustPump);
router.post('/chlorine/:plantId/adjust', authMiddleware, roleMiddleware('admin', 'operator'), dispatchController.manualAdjustChlorine);
router.get('/history', authMiddleware, roleMiddleware('admin', 'operator'), dispatchController.getAdjustmentHistory);

module.exports = router;
