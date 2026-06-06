const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const leakPointSchema = new Schema({
  code: { type: String, required: true, unique: true },
  pipeSegmentId: { type: Schema.Types.ObjectId, ref: 'PipeSegment', index: true },
  sensorId: { type: Schema.Types.ObjectId, ref: 'Sensor' },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    address: String
  },
  zone: String,
  detectedAt: { type: Date, default: Date.now },
  detectionMethod: { type: String, enum: ['pressure_anomaly', 'flow_anomaly', 'manual_report', 'acoustic'], required: true },
  pressureDrop: Number,
  flowAnomaly: Number,
  estimatedLeakRate: Number,
  leakLevel: { type: Number, min: 1, max: 4 },
  leakLevelName: String,
  priority: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
  status: {
    type: String,
    enum: ['suspected', 'confirmed_inspecting', 'confirmed_leak', 'repairing', 'repaired', 'false_alarm'],
    default: 'suspected',
    index: true
  },
  relatedSensorDataIds: [{ type: Schema.Types.ObjectId, ref: 'SensorData' }],
  historySimilarCases: Number,
  historicalAccuracyRate: Number,
  inspectionWorkOrderId: { type: Schema.Types.ObjectId, ref: 'WorkOrder' },
  repairTaskId: { type: Schema.Types.ObjectId, ref: 'RepairTask' },
  isFalseAlarm: { type: Boolean, default: false },
  confirmedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  confirmedAt: Date,
  repairedAt: Date,
  notes: String
}, { timestamps: true });

leakPointSchema.index({ status: 1, detectedAt: -1 });

module.exports = mongoose.model('LeakPoint', leakPointSchema);
