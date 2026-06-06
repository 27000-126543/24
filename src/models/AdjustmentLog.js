const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const adjustmentLogSchema = new Schema({
  type: { type: String, enum: ['pump_frequency', 'chlorine_dosage', 'valve_control'], required: true },
  targetId: { type: Schema.Types.ObjectId, required: true },
  targetType: { type: String, enum: ['PumpStation', 'WaterPlant', 'PipeSegment'], required: true },
  previousValue: { type: Number, required: true },
  newValue: { type: Number, required: true },
  reason: String,
  trigger: { type: String, enum: ['auto', 'manual'], default: 'auto' },
  modelVersion: String,
  pressureSnapshot: {
    avgPressure: Number,
    minPressure: Number,
    maxPressure: Number,
    affectedZone: String
  },
  operatorId: { type: Schema.Types.ObjectId, ref: 'User' },
  executedAt: { type: Date, default: Date.now },
  result: { type: String, enum: ['success', 'failed', 'pending'], default: 'pending' },
  errorMessage: String
}, { timestamps: true });

adjustmentLogSchema.index({ targetId: 1, executedAt: -1 });
adjustmentLogSchema.index({ type: 1, executedAt: -1 });

module.exports = mongoose.model('AdjustmentLog', adjustmentLogSchema);
