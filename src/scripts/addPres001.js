require('dotenv').config();
const mongoose = require('mongoose');
const models = require('../models');
const config = require('../config');

const addPres001 = async () => {
  await mongoose.connect(config.mongodbUri);

  const pipe = await models.PipeSegment.findOne({ code: 'PIPE001' });
  const plant = await models.WaterPlant.findOne({ code: 'WP001' });

  const existing = await models.Sensor.findOne({ code: 'PRES-001' });
  if (existing) {
    console.log('PRES-001 已存在');
    process.exit(0);
  }

  await models.Sensor.create({
    code: 'PRES-001',
    type: 'pressure',
    name: 'PRES-001 主管压力传感器',
    pipeSegmentId: pipe ? pipe._id : null,
    waterPlantId: plant ? plant._id : null,
    location: { lat: 30.2741, lng: 120.1551 },
    zone: '西湖区',
    normalMin: 0.14,
    normalMax: 0.40,
    lastValue: 0.28,
    status: 'active'
  });

  console.log('✅ PRES-001 传感器已添加');
  process.exit(0);
};

addPres001().catch(e => { console.error(e); process.exit(1); });
