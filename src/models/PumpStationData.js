const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const pumpStationDataSchema = new Schema({
  pumpStationId: { type: Schema.Types.ObjectId, ref: 'PumpStation', required: true, index: true },
  timestamp: { type: Date, default: Date.now, index: true },
  inflowRate: { type: Number, required: true },
  totalInflow: { type: Number, default: 0 },
  inletPressure: { type: Number, required: true },
  outletPressure: { type: Number, required: true },
  pumps: [{
    pumpId: String,
    frequency: Number,
    power: Number,
    status: String,
    runtimeHours: Number
  }],
  waterQuality: {
    chlorine: Number,
    ph: Number,
    turbidity: Number
  },
  energyConsumption: { type: Number, default: 0 },
  status: { type: String, enum: ['normal', 'warning', 'alarm'], default: 'normal' }
}, { timestamps: true });

pumpStationDataSchema.index({ pumpStationId: 1, timestamp: -1 });

module.exports = mongoose.model('PumpStationData', pumpStationDataSchema);
