const mongoose = require('mongoose');

// Create a notification receipt schema
const notificationReceiptSchema = new mongoose.Schema({
  orderId: { type: String, required: true },
  userId: { type: String, required: true },
  status: { type: String, required: true },
  previousStatus: { type: String },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now },
  forceShow: { type: Boolean, default: true },
  showModal: { type: Boolean, default: false },
  uniqueId: { type: String }
});

// Create and export the model
module.exports = mongoose.models.NotificationReceipt || 
  mongoose.model('NotificationReceipt', notificationReceiptSchema); 