const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const authenticateToken = require('../middleware/auth');

// Create a simple notification receipt schema
const notificationReceiptSchema = new mongoose.Schema({
  orderId: { type: String, required: true },
  userId: { type: String, required: true },
  status: { type: String, required: true },
  previousStatus: { type: String },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now },
  forceShow: { type: Boolean, default: true }
});

// Create the model if it doesn't exist
const NotificationReceipt = mongoose.models.NotificationReceipt || 
  mongoose.model('NotificationReceipt', notificationReceiptSchema);

// Create a new notification receipt
router.post('/receipt', authenticateToken, async (req, res) => {
  try {
    console.log('Creating notification receipt');
    const { orderId, status, previousStatus, message, timestamp, forceShow } = req.body;
    const userId = req.user.id;
    
    // Validate input
    if (!orderId || !status || !message) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    // Create the receipt
    const receipt = new NotificationReceipt({
      orderId,
      userId,
      status,
      previousStatus,
      message,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      forceShow: forceShow !== undefined ? forceShow : true
    });
    
    await receipt.save();
    console.log(`Notification receipt created for order ${orderId}`);
    
    res.status(201).json({
      success: true,
      message: 'Notification receipt created',
      data: receipt
    });
  } catch (error) {
    console.error('Error creating notification receipt:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create notification receipt',
      error: error.message
    });
  }
});

// Get unread notification receipts for a user
router.get('/receipts', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const since = req.query.since ? new Date(parseInt(req.query.since)) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    console.log(`Getting notification receipts for user ${userId} since ${since}`);
    
    // Find unread receipts
    const receipts = await NotificationReceipt.find({
      userId,
      timestamp: { $gte: since }
    }).sort({ timestamp: -1 });
    
    // Mark receipts as read if specified
    if (req.query.markAsRead === 'true') {
      await NotificationReceipt.updateMany(
        { userId, isRead: false },
        { $set: { isRead: true } }
      );
    }
    
    res.json({
      success: true,
      data: receipts
    });
  } catch (error) {
    console.error('Error fetching notification receipts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification receipts',
      error: error.message
    });
  }
});

module.exports = router; 