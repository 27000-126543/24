const models = require('../models');
const config = require('../config');
const { generateId, calculateWaterBill } = require('../utils/helpers');
const notificationService = require('./notificationService');

class BillingService {
  async generateMonthlyBills(year, month) {
    const billingMonth = `${year}-${String(month).padStart(2, '0')}`;
    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0, 23, 59, 59);

    const existing = await models.Bill.countDocuments({ billingMonth });
    if (existing > 0) {
      return { message: `${billingMonth} 账单已生成`, count: existing };
    }

    const residents = await models.User.find({
      roles: 'resident',
      waterMeterNo: { $exists: true, $ne: null }
    });

    const results = [];
    for (const resident of residents) {
      try {
        const bill = await this._generateUserBill(resident, billingMonth, periodStart, periodEnd);
        if (bill) results.push(bill);
      } catch (e) {
        console.error(`生成用户 ${resident._id} 账单失败:`, e.message);
      }
    }

    return { generated: results.length, billingMonth };
  }

  async _generateUserBill(user, billingMonth, periodStart, periodEnd) {
    const usages = await models.WaterUsage.find({
      userId: user._id,
      date: { $gte: periodStart, $lte: periodEnd }
    });

    const totalUsage = usages.reduce((s, u) => s + u.usage, 0);

    if (totalUsage <= 0 && usages.length === 0) {
      return null;
    }

    const previousReading = usages.length > 0
      ? (usages[0].cumulativeUsage - usages[0].usage)
      : 0;
    const currentReading = usages.length > 0
      ? usages[usages.length - 1].cumulativeUsage
      : totalUsage;

    const { total: usageCost, details: tierDetails } = calculateWaterBill(totalUsage, config.waterPriceTiers);

    const baseFee = 5.0;
    const sewageFee = totalUsage * 0.8;
    const totalAmount = usageCost + baseFee + sewageFee;

    const dueDate = new Date(periodEnd);
    dueDate.setDate(dueDate.getDate() + 15);

    const bill = await models.Bill.create({
      code: generateId('BL'),
      userId: user._id,
      waterMeterNo: user.waterMeterNo,
      billingMonth,
      periodStart,
      periodEnd,
      previousReading,
      currentReading,
      totalUsage,
      priceTierDetails: tierDetails,
      baseFee,
      sewageFee,
      totalAmount: Math.round(totalAmount * 100) / 100,
      status: 'unpaid',
      dueDate,
      issueDate: new Date()
    });

    await notificationService.notifyBillGenerated(bill);
    return bill;
  }

  async processPayment(billId, amount, method, transactionId) {
    const bill = await models.Bill.findById(billId);
    if (!bill) throw new Error('账单不存在');
    if (bill.status === 'paid') throw new Error('账单已付清');

    const newPaidAmount = (bill.paidAmount || 0) + amount;
    const remaining = bill.totalAmount - newPaidAmount;

    bill.paidAmount = newPaidAmount;
    bill.paymentMethod = method;
    bill.paymentTransactionId = transactionId;

    if (remaining <= 0) {
      bill.status = 'paid';
      bill.paidDate = new Date();

      if (bill.isRestricted) {
        await this._liftRestriction(bill);
      }
    } else {
      bill.status = 'partially_paid';
    }

    await bill.save();
    return bill;
  }

  async checkOverdueBills() {
    const now = new Date();
    const overdueBills = await models.Bill.find({
      status: { $in: ['unpaid', 'partially_paid'] },
      dueDate: { $lt: now }
    });

    const results = [];
    for (const bill of overdueBills) {
      try {
        const overdueDays = Math.floor((now - new Date(bill.dueDate)) / (24 * 60 * 60 * 1000));
        bill.overdueDays = overdueDays;

        const lateFee = Math.round(bill.totalAmount * 0.0005 * overdueDays * 100) / 100;
        bill.lateFee = lateFee;

        if (overdueDays >= 5 && overdueDays < 15 && bill.status !== 'overdue') {
          bill.status = 'overdue';
          await notificationService.notifyOverdueBill(bill);
        }

        if (overdueDays >= config.overdueDays && !bill.isRestricted) {
          const restriction = await this._createRestrictionOrder(bill, overdueDays);
          bill.isRestricted = true;
          bill.restrictionOrderId = restriction._id;
          bill.status = 'restricted';
        }

        await bill.save();
        results.push({ billId: bill._id, overdueDays, lateFee });
      } catch (e) {
        console.error(`处理逾期账单 ${bill._id} 失败:`, e.message);
      }
    }

    return { processed: results.length, results };
  }

  async _createRestrictionOrder(bill, overdueDays) {
    const collectors = await models.User.find({ roles: 'collector', status: 'active' });
    let collectorId = null;
    if (collectors.length > 0) {
      const collectorLoads = await Promise.all(collectors.map(async c => {
        const count = await models.Bill.countDocuments({ collectorId: c._id, status: { $in: ['overdue', 'restricted'] } });
        return { collector: c, count };
      }));
      collectorLoads.sort((a, b) => a.count - b.count);
      collectorId = collectorLoads[0].collector._id;
    }

    if (bill) {
      bill.collectorId = collectorId;
    }

    const order = await models.RestrictionOrder.create({
      code: generateId('RO'),
      billId: bill._id,
      userId: bill.userId,
      type: overdueDays >= 60 ? 'full_shutdown' : overdueDays >= 45 ? 'partial_restriction' : 'notice',
      status: 'issued',
      overdueDays,
      overdueAmount: bill.totalAmount - (bill.paidAmount || 0),
      restrictionStartDate: new Date(),
      issuedAt: new Date(),
      collectorId
    });

    await notificationService.notifyRestrictionOrder(order);
    return order;
  }

  async _liftRestriction(bill) {
    if (!bill.restrictionOrderId) return;

    const order = await models.RestrictionOrder.findById(bill.restrictionOrderId);
    if (order) {
      order.status = 'lifted';
      order.liftedAt = new Date();
      order.liftReason = '用户已缴清欠费';
      await order.save();
    }

    bill.isRestricted = false;
    bill.status = 'paid';
  }

  async getBills(filters = {}) {
    const query = {};
    if (filters.userId) query.userId = filters.userId;
    if (filters.status) query.status = filters.status;
    if (filters.billingMonth) query.billingMonth = filters.billingMonth;
    if (filters.isOverdue === true) {
      query.dueDate = { $lt: new Date() };
      query.status = { $in: ['unpaid', 'partially_paid', 'overdue'] };
    }

    return models.Bill.find(query)
      .sort({ billingMonth: -1 })
      .limit(filters.limit || 100)
      .populate('userId', 'realName phone waterMeterNo');
  }

  async getBillById(id) {
    return models.Bill.findById(id)
      .populate('userId', 'realName phone waterMeterNo address')
      .populate('restrictionOrderId')
      .populate('collectorId', 'realName phone');
  }

  async getRestrictionOrders(filters = {}) {
    const query = {};
    if (filters.userId) query.userId = filters.userId;
    if (filters.status) query.status = filters.status;
    if (filters.type) query.type = filters.type;

    return models.RestrictionOrder.find(query)
      .sort({ createdAt: -1 })
      .limit(filters.limit || 100)
      .populate('userId', 'realName phone')
      .populate('billId')
      .populate('collectorId', 'realName phone');
  }
}

module.exports = new BillingService();
