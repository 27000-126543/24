const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const waterPlantDataSchema = new Schema({
  waterPlantId: { type: Schema.Types.ObjectId, ref: 'WaterPlant', required: true, index: true },
  timestamp: { type: Date, default: Date.now, index: true },
  inflowRate: { type: Number, required: true },
  totalInflow: { type: Number, default: 0 },
  waterQuality: {
    chlorine: { type: Number, required: true },
    ph: Number,
    turbidity: Number,
    temperature: Number,
    hardness: Number
  },
  energyConsumption: { type: Number, default: 0 },
  chemicalUsage: {
    chlorine: { type: Number, default: 0 },
    coagulant: { type: Number, default: 0 }
  },
  status: { type: String, enum: ['normal', 'warning', 'alarm'], default: 'normal' }
}, { timestamps: true });

waterPlantDataSchema.index({ waterPlantId: 1, timestamp: -1 });

module.exports = mongoose.model('WaterPlantData', waterPlantDataSchema);
