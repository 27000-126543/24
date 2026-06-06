const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const waterUsageSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  waterMeterNo: { type: String, index: true },
  date: { type: Date, required: true, index: true },
  usage: { type: Number, required: true },
  cumulativeUsage: { type: Number, default: 0 },
  meterReading: Number,
  isEstimated: { type: Boolean, default: false },
  source: { type: String, enum: ['auto_meter', 'manual_read', 'estimated'], default: 'auto_meter' },
  anomalyScore: Number,
  isAnomalous: { type: Boolean, default: false },
  notes: String
}, { timestamps: true });

waterUsageSchema.index({ userId: 1, date: -1 });
waterUsageSchema.index({ waterMeterNo: 1, date: -1 });

module.exports = mongoose.model('WaterUsage', waterUsageSchema);
