const express = require('express');
const router = express.Router();

router.use('/auth', require('./authRoutes'));
router.use('/data', require('./dataRoutes'));
router.use('/dispatch', require('./dispatchRoutes'));
router.use('/leak', require('./leakRoutes'));
router.use('/resident', require('./residentRoutes'));
router.use('/reports', require('./reportRoutes'));

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router;
