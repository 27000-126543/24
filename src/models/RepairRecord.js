const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const repairRecordSchema = new Schema({
  repairTaskId: { type: Schema.Types.ObjectId, ref: 'RepairTask', required: true, unique: true },
  pipeSegmentId: { type: Schema.Types.ObjectId, ref: 'PipeSegment', index: true },
  leakPointId: { type: Schema.Types.ObjectId, ref: 'LeakPoint' },
  repairDate: { type: Date, default: Date.now },
  repairType: { type: String, enum: ['clamp', 'replacement', 'welding', 'sleeve', 'other'] },
  pipeCondition: {
    material: String,
    diameter: Number,
    age: Number,
    corrosionLevel: String
  },
  leakCause: String,
  solution: String,
  warrantyPeriod: Number,
  replacedPipeLength: Number,
  qualityCheckPassed: { type: Boolean, default: true },
  inspectorId: { type: Schema.Types.ObjectId, ref: 'User' },
  is30DayRepeat: { type: Boolean, default: false },
  riskReassessment: String
}, { timestamps: true });

module.exports = mongoose.model('RepairRecord', repairRecordSchema);
