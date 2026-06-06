const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const notificationSchema = new Schema({
  recipientId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  recipientRole: { type: String, index: true },
  type: {
    type: String,
    enum: ['alert', 'work_order', 'repair_task', 'bill', 'complaint', 'system', 'restriction', 'report'],
    required: true
  },
  title: { type: String, required: true },
  content: String,
  relatedId: Schema.Types.ObjectId,
  relatedType: String,
  priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  isRead: { type: Boolean, default: false, index: true },
  readAt: Date,
  pushedViaSocket: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipientRole: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
