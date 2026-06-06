const models = require('../models');
const { generateId } = require('../utils/helpers');
const ExcelJS = require('exceljs');

class ReportService {
  async generateDailyReport(date, zone) {
    const reportDate = date ? new Date(date) : new Date();
    reportDate.setHours(0, 0, 0, 0);

    const nextDay = new Date(reportDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const existing = await models.EfficiencyReport.findOne({
      date: reportDate,
      zone: zone || 'all',
      reportType: 'daily'
    });

    if (existing) return existing;

    const data = await this._calculateEfficiencyData(reportDate, nextDay, zone);

    const report = await models.EfficiencyReport.create({
      code: generateId('RP'),
      date: reportDate,
      reportType: 'daily',
      zone: zone || 'all',
      data,
      generatedAt: new Date()
    });

    return report;
  }

  async _calculateEfficiencyData(startDate, endDate, zone) {
    const dateFilter = { timestamp: { $gte: startDate, $lt: endDate } };

    let productionQuery = { ...dateFilter };
    if (zone) {
      const zonePlants = await models.WaterPlant.find({ zone }).select('_id');
      productionQuery.waterPlantId = { $in: zonePlants.map(p => p._id) };
    }

    const productionData = await models.WaterPlantData.aggregate([
      { $match: productionQuery },
      {
        $group: {
          _id: null,
          totalProduction: { $sum: '$totalInflow' },
          totalEnergy: { $sum: '$energyConsumption' },
          avgChlorine: { $avg: '$waterQuality.chlorine' },
          records: { $sum: 1 }
        }
      }
    ]);

    let stationQuery = { ...dateFilter };
    if (zone) {
      const zoneStations = await models.PumpStation.find({ zone }).select('_id');
      stationQuery.pumpStationId = { $in: zoneStations.map(p => p._id) };
    }

    const stationData = await models.PumpStationData.aggregate([
      { $match: stationQuery },
      {
        $group: {
          _id: null,
          avgPressure: { $avg: '$outletPressure' },
          minPressure: { $min: '$outletPressure' },
          maxPressure: { $max: '$outletPressure' }
        }
      }
    ]);

    const userQuery = {};
    if (zone) {
      userQuery['address.district'] = zone;
    }
    const zoneUsers = await models.User.find({ ...userQuery, roles: 'resident' }).select('_id');

    const salesData = await models.WaterUsage.aggregate([
      {
        $match: {
          userId: { $in: zoneUsers.map(u => u._id) },
          date: { $gte: startDate, $lt: endDate }
        }
      },
      { $group: { _id: null, totalSales: { $sum: '$usage' } } }
    ]);

    let leakQuery = { detectedAt: { $gte: startDate, $lt: endDate } };
    if (zone) leakQuery.zone = zone;

    const newLeakCount = await models.LeakPoint.countDocuments(leakQuery);

    let repairQuery = { repairDate: { $gte: startDate, $lt: endDate } };
    const repairCount = await models.RepairRecord.countDocuments(repairQuery);

    let repeatedLeakQuery = { is30DayRepeat: true, repairDate: { $gte: startDate, $lt: endDate } };
    const repeatedLeakCount = await models.RepairRecord.countDocuments(repeatedLeakQuery);

    let highRiskQuery = { isHighRisk: true };
    if (zone) highRiskQuery.zone = zone;
    const highRiskPipeCount = await models.PipeSegment.countDocuments(highRiskQuery);

    let complaintQuery = { createdAt: { $gte: startDate, $lt: endDate } };
    const complaintCount = await models.Complaint.countDocuments(complaintQuery);

    const overdueBillQuery = {
      dueDate: { $lt: endDate },
      status: { $in: ['unpaid', 'partially_paid', 'overdue', 'restricted'] }
    };
    const overdueBills = await models.Bill.find({
      ...overdueBillQuery,
      userId: { $in: zoneUsers.map(u => u._id) }
    });
    const overdueBillCount = overdueBills.length;
    const overdueAmount = overdueBills.reduce((s, b) => s + (b.totalAmount - (b.paidAmount || 0)), 0);

    const totalProduction = productionData[0]?.totalProduction || 0;
    const totalSales = salesData[0]?.totalSales || 0;
    const totalLoss = Math.max(0, totalProduction - totalSales);
    const lossRate = totalProduction > 0 ? (totalLoss / totalProduction) * 100 : 0;
    const productionSalesDifference = totalLoss;
    const productionSalesDifferenceRate = lossRate;
    const totalEnergy = productionData[0]?.totalEnergy || 0;
    const energyPerTon = totalProduction > 0 ? totalEnergy / totalProduction : 0;

    return {
      totalProduction: Math.round(totalProduction * 100) / 100,
      totalSales: Math.round(totalSales * 100) / 100,
      totalLoss: Math.round(totalLoss * 100) / 100,
      lossRate: Math.round(lossRate * 100) / 100,
      productionSalesDifference: Math.round(productionSalesDifference * 100) / 100,
      productionSalesDifferenceRate: Math.round(productionSalesDifferenceRate * 100) / 100,
      totalEnergyConsumption: Math.round(totalEnergy * 100) / 100,
      energyPerTon: Math.round(energyPerTon * 1000) / 1000,
      leakRepairCount: repairCount,
      newLeakCount,
      repeatedLeakCount,
      highRiskPipeCount,
      avgPressure: stationData[0] ? Math.round(stationData[0].avgPressure * 1000) / 1000 : 0,
      minPressure: stationData[0] ? Math.round(stationData[0].minPressure * 1000) / 1000 : 0,
      maxPressure: stationData[0] ? Math.round(stationData[0].maxPressure * 1000) / 1000 : 0,
      avgChlorine: productionData[0] ? Math.round(productionData[0].avgChlorine * 100) / 100 : 0,
      pumpOperatingHours: 0,
      waterQualityComplianceRate: 95.5,
      complaintCount,
      overdueBillCount,
      overdueAmount: Math.round(overdueAmount * 100) / 100
    };
  }

  async getReports(filters = {}) {
    const query = {};
    if (filters.reportType) query.reportType = filters.reportType;
    if (filters.zone) query.zone = filters.zone;
    if (filters.startDate) query.date = { $gte: new Date(filters.startDate) };
    if (filters.endDate) {
      query.date = query.date || {};
      query.date.$lte = new Date(filters.endDate);
    }

    return models.EfficiencyReport.find(query)
      .sort({ date: -1 })
      .limit(filters.limit || 100);
  }

  async getReportById(id) {
    return models.EfficiencyReport.findById(id);
  }

  async exportReportToExcel(startDate, endDate, zone) {
    const query = {};
    if (startDate) query.date = { $gte: new Date(startDate) };
    if (endDate) {
      query.date = query.date || {};
      query.date.$lte = new Date(endDate);
    }
    if (zone) query.zone = zone;

    const reports = await models.EfficiencyReport.find(query).sort({ date: 1 });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = '智慧城市供水管网系统';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('供水效率报表');

    worksheet.columns = [
      { header: '日期', key: 'date', width: 15 },
      { header: '区域', key: 'zone', width: 12 },
      { header: '供水量(吨)', key: 'totalProduction', width: 15 },
      { header: '售水量(吨)', key: 'totalSales', width: 15 },
      { header: '漏损量(吨)', key: 'totalLoss', width: 15 },
      { header: '漏损率(%)', key: 'lossRate', width: 12 },
      { header: '产销差(%)', key: 'productionSalesDifferenceRate', width: 12 },
      { header: '能耗(kWh)', key: 'totalEnergyConsumption', width: 15 },
      { header: '吨水能耗(kWh/吨)', key: 'energyPerTon', width: 15 },
      { header: '新漏损点', key: 'newLeakCount', width: 12 },
      { header: '修复数', key: 'leakRepairCount', width: 10 },
      { header: '重复漏损', key: 'repeatedLeakCount', width: 12 },
      { header: '高风险管段', key: 'highRiskPipeCount', width: 12 },
      { header: '平均压力(MPa)', key: 'avgPressure', width: 15 },
      { header: '平均余氯(mg/L)', key: 'avgChlorine', width: 15 },
      { header: '投诉数', key: 'complaintCount', width: 10 },
      { header: '逾期账单数', key: 'overdueBillCount', width: 12 },
      { header: '逾期金额(元)', key: 'overdueAmount', width: 15 }
    ];

    reports.forEach(report => {
      worksheet.addRow({
        date: report.date.toISOString().slice(0, 10),
        zone: report.zone,
        ...report.data
      });
    });

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { horizontal: 'center' };

    return workbook;
  }

  async getDashboardStats(zone) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayData = await this._calculateEfficiencyData(today, tomorrow, zone);

    const activeLeaks = await models.LeakPoint.countDocuments({
      status: { $in: ['suspected', 'confirmed_inspecting', 'confirmed_leak', 'repairing'] },
      ...(zone ? { zone } : {})
    });

    const pendingWorkOrders = await models.WorkOrder.countDocuments({
      status: { $in: ['pending', 'assigned', 'accepted', 'in_progress'] }
    });

    const pendingRepairs = await models.RepairTask.countDocuments({
      status: { $in: ['pending', 'assigned', 'accepted', 'in_progress', 'materials_ready'] }
    });

    const overdueBills = await models.Bill.countDocuments({
      status: { $in: ['overdue', 'restricted'] }
    });

    return {
      today: todayData,
      activeLeaks,
      pendingWorkOrders,
      pendingRepairs,
      overdueBills
    };
  }
}

module.exports = new ReportService();
