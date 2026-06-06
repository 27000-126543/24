const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const billSchema = new Schema({
  code: { type: String, required: true, unique: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  waterMeterNo: String,
  billingMonth: { type: String, required: true, index: true },
  periodStart: Date,
  periodEnd: Date,
  previousReading: Number,
  currentReading: Number,
  totalUsage: { type: Number, required: true },
  priceTierDetails: [{
    tier: Number,
    usage: Number,
    price: Number,
    cost: Number
  }],
  baseFee: { type: Number, default: 0 },
  sewageFee: { type: Number, default: 0 },
  lateFee: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  status: {
    type: String,
    enum: ['unpaid', 'partially_paid', 'paid', 'overdue', 'restricted', 'written_off'],
    default: 'unpaid',
    index: true
  },
  paidAmount: { type: Number, default: 0 },
  dueDate: Date,
  issueDate: { type: Date, default: Date.now },
  paidDate: Date,
  overdueDays: { type: Number, default: 0 },
  isRestricted: { type: Boolean, default: false },
  restrictionOrderId: { type: Schema.Types.ObjectId, ref: 'RestrictionOrder' },
  collectorId: { type: Schema.Types.ObjectId, ref: 'User' },
  paymentMethod: { type: String, enum: ['online', 'bank', 'cash', 'auto_debit', null] },
  paymentTransactionId: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

billSchema.index({ userId: 1, billingMonth: -1 });
billSchema.index({ status: 1, dueDate: 1 });

module.exports = mongoose.model('Bill', billSchema);
