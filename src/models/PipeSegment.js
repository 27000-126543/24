const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const pipeSegmentSchema = new Schema({
  code: { type: String, required: true, unique: true },
  fromPumpStationId: { type: Schema.Types.ObjectId, ref: 'PumpStation' },
  toPumpStationId: { type: Schema.Types.ObjectId, ref: 'PumpStation' },
  startPoint: {
    lat: Number,
    lng: Number
  },
  endPoint: {
    lat: Number,
    lng: Number
  },
  diameter: { type: Number, required: true },
  length: { type: Number, required: true },
  material: { type: String, enum: ['PVC', 'PE', 'steel', 'cast_iron', 'concrete', 'other'] },
  installationDate: Date,
  expectedLifespan: Number,
  depth: Number,
  zone: String,
  isHighRisk: { type: Boolean, default: false },
  riskLevel: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'low' },
  riskReason: String,
  leakCount30Days: { type: Number, default: 0 },
  lastLeakDate: Date,
  status: { type: String, enum: ['normal', 'suspicious', 'leaking', 'repairing', 'repaired'], default: 'normal' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('PipeSegment', pipeSegmentSchema);
