const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../config');

const generateToken = (payload) => {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch (error) {
    return null;
  }
};

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const generateId = (prefix) => {
  return `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`;
};

const calculateWaterBill = (usage, tiers) => {
  let remaining = usage;
  let total = 0;
  const details = [];

  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];
    const prevLimit = i === 0 ? 0 : tiers[i - 1].limit;
    const tierUsage = Math.min(remaining, tier.limit - prevLimit);
    if (tierUsage > 0) {
      const tierCost = tierUsage * tier.price;
      total += tierCost;
      details.push({
        tier: tier.tier,
        usage: tierUsage,
        price: tier.price,
        cost: tierCost
      });
      remaining -= tierUsage;
    }
    if (remaining <= 0) break;
  }

  return { total, details };
};

const calculateLeakLevel = (pressureDrop, leakLevels) => {
  if (pressureDrop >= leakLevels.level4.minPressureDrop) return { level: 4, ...leakLevels.level4 };
  if (pressureDrop >= leakLevels.level3.minPressureDrop) return { level: 3, ...leakLevels.level3 };
  if (pressureDrop >= leakLevels.level2.minPressureDrop) return { level: 2, ...leakLevels.level2 };
  if (pressureDrop >= leakLevels.level1.minPressureDrop) return { level: 1, ...leakLevels.level1 };
  return null;
};

module.exports = {
  generateToken,
  verifyToken,
  hashPassword,
  comparePassword,
  calculateHaversineDistance,
  generateId,
  calculateWaterBill,
  calculateLeakLevel
};
