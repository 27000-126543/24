require('dotenv').config();
const mongoose = require('mongoose');
const models = require('../models');
const { hashPassword } = require('../utils/helpers');
const config = require('../config');

const seedData = async () => {
  try {
    await mongoose.connect(config.mongodbUri);
    console.log('数据库连接成功，开始初始化种子数据...');

    await Promise.all(Object.values(models).map(m => m.deleteMany({})));
    console.log('已清空所有集合');

    const passwordHash = await hashPassword('123456');

    const users = await models.User.create([
      {
        username: 'admin',
        password: passwordHash,
        realName: '系统管理员',
        phone: '13800000001',
        email: 'admin@water.com',
        roles: ['admin'],
        status: 'active'
      },
      {
        username: 'operator1',
        password: passwordHash,
        realName: '调度员张三',
        phone: '13800000002',
        roles: ['operator'],
        location: { lat: 30.2741, lng: 120.1551 },
        status: 'active'
      },
      {
        username: 'inspector1',
        password: passwordHash,
        realName: '勘察员李四',
        phone: '13800000003',
        roles: ['inspector'],
        location: { lat: 30.2841, lng: 120.1651 },
        status: 'active'
      },
      {
        username: 'inspector2',
        password: passwordHash,
        realName: '勘察员王五',
        phone: '13800000004',
        roles: ['inspector'],
        location: { lat: 30.2641, lng: 120.1451 },
        status: 'active'
      },
      {
        username: 'repairer1',
        password: passwordHash,
        realName: '抢修队长赵六',
        phone: '13800000005',
        roles: ['repairer'],
        skills: ['pipe_repair', 'welding', 'heavy_equipment', 'emergency_response'],
        location: { lat: 30.2791, lng: 120.1601 },
        status: 'active'
      },
      {
        username: 'repairer2',
        password: passwordHash,
        realName: '抢修员孙七',
        phone: '13800000006',
        roles: ['repairer'],
        skills: ['pipe_repair', 'basic_repair'],
        location: { lat: 30.2691, lng: 120.1501 },
        status: 'active'
      },
      {
        username: 'planner1',
        password: passwordHash,
        realName: '规划师周八',
        phone: '13800000007',
        roles: ['planner'],
        status: 'active'
      },
      {
        username: 'collector1',
        password: passwordHash,
        realName: '催款员吴九',
        phone: '13800000008',
        roles: ['collector'],
        status: 'active'
      },
      {
        username: 'resident1',
        password: passwordHash,
        realName: '居民用户1',
        phone: '13900000001',
        roles: ['resident'],
        waterMeterNo: 'WM000001',
        address: {
          province: '浙江省',
          city: '杭州市',
          district: '西湖区',
          street: '文三路',
          buildingNo: '1号',
          roomNo: '101',
          houseType: 'apartment',
          area: 90
        },
        location: { lat: 30.2841, lng: 120.1551 },
        status: 'active'
      },
      {
        username: 'resident2',
        password: passwordHash,
        realName: '居民用户2',
        phone: '13900000002',
        roles: ['resident'],
        waterMeterNo: 'WM000002',
        address: {
          province: '浙江省',
          city: '杭州市',
          district: '西湖区',
          street: '文三路',
          buildingNo: '1号',
          roomNo: '201',
          houseType: 'apartment',
          area: 90
        },
        location: { lat: 30.2842, lng: 120.1552 },
        status: 'active'
      },
      {
        username: 'resident3',
        password: passwordHash,
        realName: '居民用户3',
        phone: '13900000003',
        roles: ['resident'],
        waterMeterNo: 'WM000003',
        address: {
          province: '浙江省',
          city: '杭州市',
          district: '拱墅区',
          street: '莫干山路',
          buildingNo: '88号',
          roomNo: '302',
          houseType: 'apartment',
          area: 120
        },
        location: { lat: 30.3141, lng: 120.1351 },
        status: 'active'
      }
    ]);
    console.log(`创建用户: ${users.length} 个`);

    const waterPlants = await models.WaterPlant.create([
      {
        code: 'WP001',
        name: '西湖水厂',
        location: { lat: 30.2541, lng: 120.1351, address: '杭州市西湖区之江路100号' },
        capacity: 500000,
        currentOutput: 350000,
        pumpCount: 6,
        chlorineDosageRate: 0.4,
        status: 'running',
        operatorId: users[1]._id,
        zone: '西湖区'
      },
      {
        code: 'WP002',
        name: '拱墅水厂',
        location: { lat: 30.3241, lng: 120.1451, address: '杭州市拱墅区莫干山路1000号' },
        capacity: 400000,
        currentOutput: 280000,
        pumpCount: 5,
        chlorineDosageRate: 0.38,
        status: 'running',
        operatorId: users[1]._id,
        zone: '拱墅区'
      }
    ]);
    console.log(`创建水厂: ${waterPlants.length} 个`);

    const pumpStations = await models.PumpStation.create([
      {
        code: 'PS001',
        name: '文三路泵站',
        waterPlantId: waterPlants[0]._id,
        location: { lat: 30.2841, lng: 120.1551, address: '杭州市西湖区文三路200号' },
        zone: '西湖区',
        pumps: [
          { pumpId: 'P1', name: '1号泵', currentFrequency: 45, targetFrequency: 45, maxFrequency: 60, minFrequency: 20, ratedPower: 110, status: 'running' },
          { pumpId: 'P2', name: '2号泵', currentFrequency: 48, targetFrequency: 48, maxFrequency: 60, minFrequency: 20, ratedPower: 110, status: 'running' },
          { pumpId: 'P3', name: '3号泵', currentFrequency: 0, targetFrequency: 0, maxFrequency: 60, minFrequency: 20, ratedPower: 110, status: 'stopped' }
        ],
        inletPressure: 0.22,
        outletPressure: 0.28,
        flowRate: 1200,
        status: 'running',
        operatorId: users[1]._id
      },
      {
        code: 'PS002',
        name: '莫干山路泵站',
        waterPlantId: waterPlants[1]._id,
        location: { lat: 30.3141, lng: 120.1351, address: '杭州市拱墅区莫干山路500号' },
        zone: '拱墅区',
        pumps: [
          { pumpId: 'P1', name: '1号泵', currentFrequency: 42, targetFrequency: 42, maxFrequency: 60, minFrequency: 20, ratedPower: 95, status: 'running' },
          { pumpId: 'P2', name: '2号泵', currentFrequency: 46, targetFrequency: 46, maxFrequency: 60, minFrequency: 20, ratedPower: 95, status: 'running' }
        ],
        inletPressure: 0.20,
        outletPressure: 0.26,
        flowRate: 900,
        status: 'running',
        operatorId: users[1]._id
      }
    ]);
    console.log(`创建泵站: ${pumpStations.length} 个`);

    const pipeSegments = await models.PipeSegment.create([
      {
        code: 'PIPE001',
        fromPumpStationId: pumpStations[0]._id,
        startPoint: { lat: 30.2841, lng: 120.1551 },
        endPoint: { lat: 30.2861, lng: 120.1571 },
        diameter: 300,
        length: 500,
        material: 'PE',
        installationDate: new Date('2018-05-10'),
        expectedLifespan: 30,
        depth: 1.5,
        zone: '西湖区',
        status: 'normal'
      },
      {
        code: 'PIPE002',
        fromPumpStationId: pumpStations[0]._id,
        toPumpStationId: pumpStations[1]._id,
        startPoint: { lat: 30.2841, lng: 120.1551 },
        endPoint: { lat: 30.3141, lng: 120.1351 },
        diameter: 500,
        length: 4200,
        material: 'steel',
        installationDate: new Date('2015-03-20'),
        expectedLifespan: 40,
        depth: 2.0,
        zone: '西湖区-拱墅区',
        status: 'normal'
      },
      {
        code: 'PIPE003',
        fromPumpStationId: pumpStations[1]._id,
        startPoint: { lat: 30.3141, lng: 120.1351 },
        endPoint: { lat: 30.3161, lng: 120.1371 },
        diameter: 200,
        length: 350,
        material: 'PVC',
        installationDate: new Date('2020-08-15'),
        expectedLifespan: 25,
        depth: 1.2,
        zone: '拱墅区',
        status: 'normal'
      }
    ]);
    console.log(`创建管段: ${pipeSegments.length} 个`);

    const sensors = await models.Sensor.create([
      {
        code: 'PRES-001',
        type: 'pressure',
        name: 'PRES-001 主管压力传感器',
        pipeSegmentId: pipeSegments[0]._id,
        waterPlantId: waterPlants[0]._id,
        location: { lat: 30.2741, lng: 120.1551 },
        zone: '西湖区',
        normalMin: 0.14,
        normalMax: 0.40,
        lastValue: 0.28,
        status: 'active'
      },
      {
        code: 'PRS001',
        type: 'pressure',
        name: '文三路起点压力传感器',
        pipeSegmentId: pipeSegments[0]._id,
        pumpStationId: pumpStations[0]._id,
        location: { lat: 30.2841, lng: 120.1551 },
        zone: '西湖区',
        normalMin: 0.14,
        normalMax: 0.40,
        lastValue: 0.28,
        status: 'active'
      },
      {
        code: 'PRS002',
        type: 'pressure',
        name: '文三路中点压力传感器',
        pipeSegmentId: pipeSegments[0]._id,
        location: { lat: 30.2851, lng: 120.1561 },
        zone: '西湖区',
        normalMin: 0.14,
        normalMax: 0.40,
        lastValue: 0.26,
        status: 'active'
      },
      {
        code: 'PRS003',
        type: 'pressure',
        name: '莫干山路压力传感器',
        pipeSegmentId: pipeSegments[2]._id,
        pumpStationId: pumpStations[1]._id,
        location: { lat: 30.3141, lng: 120.1351 },
        zone: '拱墅区',
        normalMin: 0.14,
        normalMax: 0.40,
        lastValue: 0.26,
        status: 'active'
      },
      {
        code: 'FLW001',
        type: 'flow',
        name: '文三路流量传感器',
        pipeSegmentId: pipeSegments[0]._id,
        location: { lat: 30.2845, lng: 120.1555 },
        zone: '西湖区',
        normalMin: 50,
        normalMax: 500,
        lastValue: 180,
        status: 'active'
      },
      {
        code: 'CLR001',
        type: 'chlorine',
        name: '西湖水厂余氯传感器',
        waterPlantId: waterPlants[0]._id,
        location: { lat: 30.2541, lng: 120.1351 },
        zone: '西湖区',
        normalMin: 0.3,
        normalMax: 0.6,
        lastValue: 0.42,
        status: 'active'
      },
      {
        code: 'WM000001',
        type: 'water_meter',
        name: '101室水表',
        userId: users[8]._id,
        location: { lat: 30.2841, lng: 120.1551 },
        zone: '西湖区',
        normalMin: 0,
        normalMax: 100,
        lastValue: 0,
        status: 'active'
      },
      {
        code: 'WM000002',
        type: 'water_meter',
        name: '201室水表',
        userId: users[9]._id,
        location: { lat: 30.2842, lng: 120.1552 },
        zone: '西湖区',
        normalMin: 0,
        normalMax: 100,
        lastValue: 0,
        status: 'active'
      },
      {
        code: 'WM000003',
        type: 'water_meter',
        name: '302室水表',
        userId: users[10]._id,
        location: { lat: 30.3141, lng: 120.1351 },
        zone: '拱墅区',
        normalMin: 0,
        normalMax: 100,
        lastValue: 0,
        status: 'active'
      }
    ]);
    console.log(`创建传感器: ${sensors.length} 个`);

    const now = new Date();
    const waterUsageData = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      for (let u = 8; u <= 10; u++) {
        let usage;
        if (u === 10 && i < 5) {
          usage = 2 + Math.random() * 1.5;
        } else {
          usage = 0.3 + Math.random() * 0.5;
        }
        waterUsageData.push({
          userId: users[u]._id,
          waterMeterNo: users[u].waterMeterNo,
          date: d,
          usage: Math.round(usage * 100) / 100,
          source: 'auto_meter'
        });
      }
    }
    await models.WaterUsage.insertMany(waterUsageData);
    console.log(`创建用水记录: ${waterUsageData.length} 条`);

    console.log('\n============================================');
    console.log('✅ 种子数据初始化完成!');
    console.log('============================================');
    console.log('\n测试账户 (密码均为 123456):');
    console.log('  admin        - 系统管理员');
    console.log('  operator1    - 调度员');
    console.log('  inspector1   - 勘察员');
    console.log('  inspector2   - 勘察员');
    console.log('  repairer1    - 抢修队长');
    console.log('  repairer2    - 抢修员');
    console.log('  planner1     - 规划师');
    console.log('  collector1   - 催款员');
    console.log('  resident1    - 居民用户1 (水表 WM000001)');
    console.log('  resident2    - 居民用户2 (水表 WM000002)');
    console.log('  resident3    - 居民用户3 (水表 WM000003, 近5天用水异常)');
    console.log('\n============================================');

    process.exit(0);
  } catch (error) {
    console.error('种子数据初始化失败:', error);
    process.exit(1);
  }
};

seedData();
