const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const complaintSchema = new Schema({
  code: { type: String, required: true, unique: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['bill_anomaly', 'water_quality', 'pressure_issue', 'leak_report', 'other'], default: 'bill_anomaly' },
  title: { type: String, required: true },
  description: String,
  billId: { type: Schema.Types.ObjectId, ref: 'Bill' },
  status: {
    type: String,
    enum: ['submitted', 'analyzing', 'awaiting_user', 'resolved', 'rejected', 'escalated'],
    default: 'submitted',
    index: true
  },
  analysisResult: {
    isInternalLeak: Boolean,
    usageComparison: {
      user30DayAvg: Number,
      sameTypeAvg: Number,
      deviationPercent: Number
    },
    usageCurveData: [{
      date: Date,
      usage: Number
    }],
    recommendation: String,
    anomalyScore: Number,
    suggestedNextStep: String
  },
  response: String,
  handlerId: { type: Schema.Types.ObjectId, ref: 'User' },
  submittedAt: { type: Date, default: Date.now },
  resolvedAt: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

complaintSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('Complaint', complaintSchema);
