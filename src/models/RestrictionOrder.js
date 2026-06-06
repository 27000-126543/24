const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const restrictionOrderSchema = new Schema({
  code: { type: String, required: true, unique: true },
  billId: { type: Schema.Types.ObjectId, ref: 'Bill', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['notice', 'partial_restriction', 'full_shutdown'], default: 'notice' },
  status: { type: String, enum: ['pending', 'issued', 'in_effect', 'lifted', 'cancelled'], default: 'pending' },
  overdueDays: Number,
  overdueAmount: Number,
  restrictionStartDate: Date,
  restrictionEndDate: Date,
  issuedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  issuedAt: Date,
  collectorId: { type: Schema.Types.ObjectId, ref: 'User' },
  collectionNotes: String,
  liftedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  liftedAt: Date,
  liftReason: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('RestrictionOrder', restrictionOrderSchema);
