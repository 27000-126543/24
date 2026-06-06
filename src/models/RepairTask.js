const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const repairTaskSchema = new Schema({
  code: { type: String, required: true, unique: true },
  workOrderId: { type: Schema.Types.ObjectId, ref: 'WorkOrder' },
  leakPointId: { type: Schema.Types.ObjectId, ref: 'LeakPoint', index: true },
  pipeSegmentId: { type: Schema.Types.ObjectId, ref: 'PipeSegment' },
  title: { type: String, required: true },
  description: String,
  location: {
    lat: Number,
    lng: Number,
    address: String
  },
  zone: String,
  leakLevel: Number,
  leakLevelName: String,
  priority: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
  requiredSkills: [{ type: String }],
  status: {
    type: String,
    enum: ['pending', 'assigned', 'accepted', 'in_progress', 'materials_ready', 'completed', 'verified', 'cancelled'],
    default: 'pending',
    index: true
  },
  assigneeTeamId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  teamMembers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  assignedAt: Date,
  acceptedAt: Date,
  startedAt: Date,
  materialsReadyAt: Date,
  completedAt: Date,
  verifiedAt: Date,
  deadline: Date,
  estimatedDuration: Number,
  actualDuration: Number,
  materialsUsed: [{
    name: String,
    quantity: Number,
    unit: String,
    cost: Number
  }],
  totalMaterialCost: { type: Number, default: 0 },
  laborCost: { type: Number, default: 0 },
  totalCost: { type: Number, default: 0 },
  repairPhotos: [String],
  repairNotes: String,
  repairMethod: String,
  affectedResidentCount: Number,
  waterOutageHours: Number,
  verifierId: { type: Schema.Types.ObjectId, ref: 'User' },
  verificationNotes: String,
  creatorId: { type: Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

repairTaskSchema.index({ assigneeTeamId: 1, status: 1 });
repairTaskSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('RepairTask', repairTaskSchema);
