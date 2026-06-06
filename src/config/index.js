require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/smart_water_network',
  jwtSecret: process.env.JWT_SECRET || 'default-secret-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  nodeEnv: process.env.NODE_ENV || 'development',

  waterPriceTiers: [
    { tier: 1, limit: 15, price: 3.5 },
    { tier: 2, limit: 30, price: 5.2 },
    { tier: 3, limit: Infinity, price: 8.0 }
  ],

  pressureThresholds: {
    minNormal: 0.14,
    maxNormal: 0.40,
    criticalLow: 0.10,
    criticalHigh: 0.50
  },

  leakLevels: {
    level1: { name: '轻微漏损', minPressureDrop: 0.02, maxPressureDrop: 0.05, priority: 'low' },
    level2: { name: '中度漏损', minPressureDrop: 0.05, maxPressureDrop: 0.10, priority: 'medium' },
    level3: { name: '严重漏损', minPressureDrop: 0.10, maxPressureDrop: 0.20, priority: 'high' },
    level4: { name: '特大漏损', minPressureDrop: 0.20, maxPressureDrop: Infinity, priority: 'critical' }
  },

  chlorineTarget: {
    min: 0.3,
    max: 0.5,
    target: 0.4
  },

  overdueDays: 30,
  repeatedLeakDays: 30
};
