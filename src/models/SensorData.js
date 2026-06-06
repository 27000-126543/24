const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const sensorDataSchema = new Schema({
  sensorId: { type: Schema.Types.ObjectId, ref: 'Sensor', required: true, index: true },
  sensorCode: { type: String, index: true },
  timestamp: { type: Date, default: Date.now, index: true },
  value: { type: Number, required: true },
  isAbnormal: { type: Boolean, default: false },
  abnormalType: {
    type: String,
    enum: ['low_pressure', 'high_pressure', 'sudden_drop', 'sudden_rise', 'no_data', null],
    default: null
  },
  baselineValue: Number,
  deviation: Number,
  metadata: Schema.Types.Mixed
}, { timestamps: true });

sensorDataSchema.index({ sensorId: 1, timestamp: -1 });
sensorDataSchema.index({ isAbnormal: 1, timestamp: -1 });

module.exports = mongoose.model('SensorData', sensorDataSchema);
