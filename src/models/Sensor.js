const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const sensorSchema = new Schema({
  code: { type: String, required: true, unique: true },
  type: {
    type: String,
    enum: ['pressure', 'flow', 'chlorine', 'ph', 'turbidity', 'temperature', 'water_meter'],
    required: true
  },
  name: { type: String, required: true },
  pipeSegmentId: { type: Schema.Types.ObjectId, ref: 'PipeSegment' },
  pumpStationId: { type: Schema.Types.ObjectId, ref: 'PumpStation' },
  waterPlantId: { type: Schema.Types.ObjectId, ref: 'WaterPlant' },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  zone: String,
  normalMin: Number,
  normalMax: Number,
  lastValue: Number,
  lastReadAt: Date,
  status: { type: String, enum: ['active', 'inactive', 'faulty', 'maintenance'], default: 'active' },
  installationDate: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Sensor', sensorSchema);
