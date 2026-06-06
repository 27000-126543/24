const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const workOrderSchema = new Schema({
  code: { type: String, required: true, unique: true },
  type: { type: String, enum: ['inspection', 'maintenance', 'emergency'], default: 'inspection' },
  leakPointId: { type: Schema.Types.ObjectId, ref: 'LeakPoint', index: true },
  title: { type: String, required: true },
  description: String,
  location: {
    lat: Number,
    lng: Number,
    address: String
  },
  zone: String,
  priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  status: {
    type: String,
    enum: ['pending', 'assigned', 'accepted', 'in_progress', 'completed', 'cancelled'],
    default: 'pending',
    index: true
  },
  assigneeId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  assigneeLocation: {
    lat: Number,
    lng: Number
  },
  distanceToSite: Number,
  assignedAt: Date,
  acceptedAt: Date,
  startedAt: Date,
  completedAt: Date,
  deadline: Date,
  inspectionResult: {
    isRealLeak: Boolean,
    leakType: String,
    leakSize: String,
    photos: [String],
    notes: String,
    confirmedLeakLevel: Number
  },
  creatorId: { type: Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

workOrderSchema.index({ assigneeId: 1, status: 1 });
workOrderSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('WorkOrder', workOrderSchema);
