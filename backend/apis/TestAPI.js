const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const User = require('../models/User');
const { sendPushNotification } = require('../utils/notificationService');

// Test endpoint to send a push notification
router.post('/send-notification', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const { userId, title, body, data } = req.body;

    if (!userId || !title || !body) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: userId, title, body'
      });
    }

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user has push token
    if (!user.pushToken) {
      return res.status(400).json({
        success: false,
        message: 'User does not have a push token registered'
      });
    }

    // Send the notification
    const result = await sendPushNotification(
      user.pushToken,
      title,
      body,
      data || {}
    );

    if (result.error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send notification',
        error: result.error
      });
    }

    res.json({
      success: true,
      message: 'Notification sent successfully',
      data: result
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test notification',
      error: error.message
    });
  }
});

// Test endpoint to send a simulated order status update
router.post('/order-status-update', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const { userId, orderId, status } = req.body;

    if (!userId || !orderId || !status) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: userId, orderId, status'
      });
    }

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user has push token
    if (!user.pushToken) {
      return res.status(400).json({
        success: false,
        message: 'User does not have a push token registered'
      });
    }

    // Prepare notification content
    let title = 'Order Update';
    let body = `Your order #${orderId} `;

    switch (status) {
      case 'processing':
        body += 'is now being processed.';
        break;
      case 'shipped':
        body += 'has been shipped! Your package is on the way.';
        break;
      case 'delivered':
        body += 'has been delivered. Enjoy!';
        break;
      case 'cancelled':
        body += 'has been cancelled.';
        break;
      default:
        body += `status has been updated to: ${status}`;
    }

    // Send the notification
    const result = await sendPushNotification(
      user.pushToken,
      title,
      body,
      { orderId, status }
    );

    if (result.error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send notification',
        error: result.error
      });
    }

    res.json({
      success: true,
      message: 'Order status notification sent successfully',
      data: result
    });
  } catch (error) {
    console.error('Error sending order status notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send order status notification',
      error: error.message
    });
  }
});

module.exports = router; 