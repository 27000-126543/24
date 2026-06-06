const express = require('express');
const router = express.Router();
const dataController = require('../controllers/dataController');

router.post('/water-plant/:plantCode', dataController.uploadWaterPlantData);
router.post('/pump-station/:stationCode', dataController.uploadPumpStationData);
router.post('/sensor/:sensorCode', dataController.uploadSensorData);
router.post('/sensors/batch', dataController.uploadBatchSensorData);
router.post('/water-meter/:meterNo', dataController.uploadWaterMeterData);

module.exports = router;
