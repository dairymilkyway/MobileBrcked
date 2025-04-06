const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const authenticateToken = require('../middleware/auth');
const NotificationReceipt = require('../models/NotificationReceipt');
const User = require('../models/User');
const { sendNewProductNotification } = require('../utils/notificationService');

// Create a new notification receipt
router.post('/receipt', authenticateToken, async (req, res) => {
  try {
    console.log('Creating notification receipt');
    const { orderId, productId, status, previousStatus, message, timestamp, forceShow, type } = req.body;
    const userId = req.user.id;
    
    // Validate input based on notification type
    if (type === 'newProduct' && !productId) {
      return res.status(400).json({
        success: false,
        message: 'Missing productId for product notification'
      });
    } else if ((type === 'orderUpdate' || type === 'orderPlaced') && !orderId) {
      return res.status(400).json({
        success: false,
        message: 'Missing orderId for order notification'
      });
    }
    
    if (!status || !message) {
      return res.status(400).json({
        success: false,
        message: 'Missing status or message'
      });
    }
    
    // Create the receipt
    const receipt = new NotificationReceipt({
      orderId,
      productId,
      userId,
      status,
      previousStatus,
      message,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      forceShow: forceShow !== undefined ? forceShow : true,
      type: type || 'orderUpdate'
    });
    
    await receipt.save();
    console.log(`Notification receipt created for ${type === 'newProduct' ? 'product ' + productId : 'order ' + orderId}`);
    
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

// Send product notification to all users
router.post('/send-product-notification', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only admin can send product notifications.'
      });
    }
    
    const { productId, productName } = req.body;
    
    if (!productId || !productName) {
      return res.status(400).json({
        success: false,
        message: 'Missing productId or productName'
      });
    }
    
    console.log(`Admin sending product notification for ${productName} (${productId})`);
    
    // Find all users with push tokens
    const users = await User.find({ 
      'pushTokens.0': { $exists: true }, // Check if the user has at least one push token
      role: 'user' // Only notify regular users, not admins
    });
    
    console.log(`Found ${users.length} users with push tokens to notify about new product`);
    
    const notificationPromises = [];
    const receiptPromises = [];
    const timestamp = Date.now();
    
    // For each user, send a notification and create a receipt
    for (const user of users) {
      // Process each token for this user
      user.pushTokens.forEach(tokenObj => {
        if (tokenObj && tokenObj.token) {
          // Send push notification to each token
          notificationPromises.push(
            sendNewProductNotification(tokenObj.token, productId, productName, timestamp)
          );
          
          console.log(`Queuing push notification to token: ${tokenObj.token.substring(0, 10)}...`);
        }
      });
      
      // Create notification receipt (only once per user, regardless of token count)
      const receipt = new NotificationReceipt({
        productId,
        userId: user._id.toString(),
        status: 'new',
        message: `Check out our new product: ${productName}`,
        timestamp: new Date(),
        forceShow: true,
        showModal: true,
        type: 'newProduct'
      });
      
      receiptPromises.push(receipt.save());
    }
    
    // Wait for all notifications and receipts to be created
    const [notificationResults, receipts] = await Promise.all([
      Promise.all(notificationPromises),
      Promise.all(receiptPromises)
    ]);
    
    // Count successful notifications
    const successfulNotifications = notificationResults.filter(result => result.success).length;
    
    res.status(200).json({
      success: true,
      message: `Sent ${successfulNotifications} product notifications out of ${users.length} users`,
      data: {
        notificationsSent: successfulNotifications,
        receiptsCreated: receipts.length
      }
    });
  } catch (error) {
    console.error('Error sending product notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send product notifications',
      error: error.message
    });
  }
});

module.exports = router; 