const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const User = require('../models/User');
const { sendPushNotification } = require('../utils/notificationService');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const NotificationReceipt = require('../models/NotificationReceipt');

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

// Test endpoint to simulate an order notification that will open the modal
router.post('/simulate-order-notification', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.body;
    
    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: orderId'
      });
    }
    
    // Get the current user's push token
    const user = await User.findById(req.user.id);
    if (!user || !user.pushTokens || user.pushTokens.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'User does not have a push token registered'
      });
    }
    
    // Get the most recent token
    const mostRecentToken = user.pushTokens
      .sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed))[0]?.token;
    
    // Check if the order exists and belongs to the user
    const order = await Order.findOne({ orderId, userId: req.user.id });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or does not belong to this user'
      });
    }
    
    // Prepare notification data
    const title = 'Order Update';
    const body = `Your order #${orderId} status has been updated to ${order.status}.`;
    
    // Send the notification with special payload for modal display
    const result = await sendPushNotification(
      mostRecentToken,
      title,
      body,
      { 
        type: 'orderUpdate',
        orderId,
        status: order.status,
        showModal: true, // Special flag to directly show the modal
        forceShow: true,  // Force notification to show 
        immediate: true   // Show immediately
      }
    );
    
    if (result.error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send notification',
        error: result.error
      });
    }
    
    // Return detailed data for debugging
    return res.json({
      success: true,
      message: 'Test notification sent successfully',
      data: {
        notificationData: { 
          type: 'orderUpdate',
          orderId,
          status: order.status,
          showModal: true 
        }
      }
    });
  } catch (error) {
    console.error('Error in simulate-order-notification:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Test endpoint to simulate an order placed notification
router.post('/simulate-order-placed', authenticateToken, async (req, res) => {
  try {
    const { orderId, timestamp = Date.now() + Math.floor(Math.random() * 1000), total = 99.99 } = req.body;
    
    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: orderId'
      });
    }
    
    console.log(`Simulating order placed notification for order ${orderId} with timestamp ${timestamp}`);
    
    // Get the current user's push token - use a fresh query to get up-to-date token
    const user = await User.findById(req.user.id).select('pushTokens email');
    
    console.log(`User found: ${!!user}, Push tokens available: ${user?.pushTokens?.length > 0 ? 'Yes' : 'No'}`);
    if (user?.pushTokens?.length > 0) {
      console.log(`Available tokens: ${user.pushTokens.length}`);
    }
    
    if (!user || !user.pushTokens || user.pushTokens.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'User does not have a push token registered'
      });
    }
    
    // Get the most recent token
    const mostRecentToken = user.pushTokens
      .sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed))[0]?.token;
    
    // Check if the order exists and belongs to the user
    const order = await Order.findOne({ orderId, userId: req.user.id });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or does not belong to this user'
      });
    }
    
    // Prepare notification data with guaranteed uniqueness
    const title = 'Order Placed';
    const body = `Your Order Placed Successfully!`;
    const uniqueId = `order-placed-${orderId}-${timestamp}`;
    
    // Send the notification with special payload for modal display
    const result = await sendPushNotification(
      mostRecentToken,
      title,
      body,
      { 
        type: 'orderPlaced',
        orderId,
        status: 'pending',
        showModal: true, // Special flag to directly show the modal
        forceShow: true,  // Force notification to show 
        immediate: true,  // Show immediately
        timestamp,        // Add timestamp for uniqueness
        uniqueId          // Additional uniqueness
      }
    );
    
    console.log(`Notification result:`, JSON.stringify(result));
    
    if (result.error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send notification',
        error: result.error
      });
    }
    
    // Also add a receipt to the database
    try {
      const receipt = new NotificationReceipt({
        orderId,
        userId: req.user.id,
        status: 'pending',
        previousStatus: order.status,
        message: body,
        timestamp: new Date(),
        forceShow: true,
        showModal: true, // Add the showModal flag here too
        uniqueId         // Use the same unique ID for consistency
      });
      
      await receipt.save();
      console.log(`Notification receipt created with ID: ${uniqueId}`);
    } catch (error) {
      console.error('Error creating notification receipt:', error);
      // Continue since the notification was sent
    }
    
    // Also add the notification data to the response for debugging
    res.json({
      success: true,
      message: 'Order placed notification sent successfully',
      data: {
        ...result,
        notificationData: { 
          type: 'orderPlaced',
          orderId,
          status: 'pending',
          showModal: true,
          forceShow: true,
          immediate: true,
          timestamp,
          uniqueId
        }
      }
    });
  } catch (error) {
    console.error('Error in simulate-order-placed:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router; 