const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const pumpStationSchema = new Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  waterPlantId: { type: Schema.Types.ObjectId, ref: 'WaterPlant', required: true },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    address: String
  },
  pumps: [{
    pumpId: { type: String, required: true },
    name: String,
    currentFrequency: { type: Number, default: 50 },
    targetFrequency: { type: Number, default: 50 },
    maxFrequency: { type: Number, default: 60 },
    minFrequency: { type: Number, default: 20 },
    ratedPower: Number,
    status: { type: String, enum: ['running', 'stopped', 'maintenance'], default: 'stopped' }
  }],
  inletPressure: { type: Number, default: 0 },
  outletPressure: { type: Number, default: 0 },
  flowRate: { type: Number, default: 0 },
  status: { type: String, enum: ['running', 'maintenance', 'stopped'], default: 'running' },
  operatorId: { type: Schema.Types.ObjectId, ref: 'User' },
  zone: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('PumpStation', pumpStationSchema);
