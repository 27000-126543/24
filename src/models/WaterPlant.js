const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const waterPlantSchema = new Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    address: String
  },
  capacity: { type: Number, required: true },
  currentOutput: { type: Number, default: 0 },
  pumpCount: { type: Number, default: 0 },
  chlorineDosageRate: { type: Number, default: 0.4 },
  status: { type: String, enum: ['running', 'maintenance', 'stopped'], default: 'running' },
  operatorId: { type: Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('WaterPlant', waterPlantSchema);
