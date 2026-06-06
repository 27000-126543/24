const models = require('../models');
const { generateToken, hashPassword, comparePassword } = require('../utils/helpers');

class AuthService {
  async register(userData) {
    const existing = await models.User.findOne({ username: userData.username });
    if (existing) {
      throw new Error('用户名已存在');
    }

    if (userData.waterMeterNo) {
      const existingMeter = await models.User.findOne({ waterMeterNo: userData.waterMeterNo });
      if (existingMeter) {
        throw new Error('水表号已被使用');
      }
    }

    const hashedPassword = await hashPassword(userData.password);

    const user = await models.User.create({
      ...userData,
      password: hashedPassword
    });

    const token = generateToken({
      userId: user._id,
      username: user.username,
      roles: user.roles
    });

    return {
      user: this._sanitizeUser(user),
      token
    };
  }

  async login(username, password) {
    const user = await models.User.findOne({ username });
    if (!user) {
      throw new Error('用户名或密码错误');
    }

    const isValid = await comparePassword(password, user.password);
    if (!isValid) {
      throw new Error('用户名或密码错误');
    }

    if (user.status !== 'active') {
      throw new Error('账户已被禁用');
    }

    const token = generateToken({
      userId: user._id,
      username: user.username,
      roles: user.roles
    });

    return {
      user: this._sanitizeUser(user),
      token
    };
  }

  async getCurrentUser(userId) {
    const user = await models.User.findById(userId);
    if (!user) throw new Error('用户不存在');
    return this._sanitizeUser(user);
  }

  async changePassword(userId, oldPassword, newPassword) {
    const user = await models.User.findById(userId);
    if (!user) throw new Error('用户不存在');

    const isValid = await comparePassword(oldPassword, user.password);
    if (!isValid) {
      throw new Error('原密码错误');
    }

    user.password = await hashPassword(newPassword);
    await user.save();
    return { message: '密码修改成功' };
  }

  async listUsers(filters = {}) {
    const query = {};
    if (filters.role) query.roles = filters.role;
    if (filters.status) query.status = filters.status;

    return models.User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(filters.limit || 100);
  }

  _sanitizeUser(user) {
    const obj = user.toObject();
    delete obj.password;
    return obj;
  }
}

module.exports = new AuthService();
