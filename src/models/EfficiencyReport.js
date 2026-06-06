const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const efficiencyReportSchema = new Schema({
  code: { type: String, required: true, unique: true },
  date: { type: Date, required: true, index: true },
  reportType: { type: String, enum: ['daily', 'weekly', 'monthly'], default: 'daily' },
  zone: String,
  data: {
    totalProduction: { type: Number, default: 0 },
    totalSales: { type: Number, default: 0 },
    totalLoss: { type: Number, default: 0 },
    lossRate: { type: Number, default: 0 },
    productionSalesDifference: { type: Number, default: 0 },
    productionSalesDifferenceRate: { type: Number, default: 0 },
    totalEnergyConsumption: { type: Number, default: 0 },
    energyPerTon: { type: Number, default: 0 },
    leakRepairCount: { type: Number, default: 0 },
    newLeakCount: { type: Number, default: 0 },
    repeatedLeakCount: { type: Number, default: 0 },
    highRiskPipeCount: { type: Number, default: 0 },
    avgPressure: { type: Number, default: 0 },
    minPressure: { type: Number, default: 0 },
    maxPressure: { type: Number, default: 0 },
    avgChlorine: { type: Number, default: 0 },
    pumpOperatingHours: { type: Number, default: 0 },
    waterQualityComplianceRate: { type: Number, default: 0 },
    complaintCount: { type: Number, default: 0 },
    overdueBillCount: { type: Number, default: 0 },
    overdueAmount: { type: Number, default: 0 }
  },
  generatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

efficiencyReportSchema.index({ date: -1, zone: 1 });

module.exports = mongoose.model('EfficiencyReport', efficiencyReportSchema);
