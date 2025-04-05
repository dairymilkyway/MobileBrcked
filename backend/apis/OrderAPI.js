const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const User = require('../models/User');
const authenticateToken = require('../middleware/auth');
const { sendOrderStatusNotification, sendOrderPlacedNotification } = require('../utils/notificationService');

// Helper function to get order status message
const getStatusMessage = (orderId, status) => {
  let message = `Your order #${orderId} `;
  
  switch (status) {
    case 'processing':
      message += 'is now being processed.';
      break;
    case 'shipped':
      message += 'has been shipped! Your package is on the way.';
      break;
    case 'delivered':
      message += 'has been delivered. Enjoy!';
      break;
    case 'cancelled':
      message += 'has been cancelled.';
      break;
    default:
      message += `status has been updated to: ${status}`;
  }
  
  return message;
};

// Create a new order
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('Creating order for user:', userId);
    
    const { 
      orderId, 
      items, 
      shippingDetails, 
      paymentMethod, 
      subtotal, 
      shipping, 
      tax, 
      total, 
      orderDate 
    } = req.body;
    
    // Log the request payload for debugging
    console.log('Order request payload:');
    console.log('- orderId:', orderId);
    console.log('- items length:', items?.length || 0);
    console.log('- paymentMethod:', paymentMethod);
    console.log('- subtotal:', subtotal);
    console.log('- shipping:', shipping);
    console.log('- tax:', tax);
    console.log('- total:', total);
    
    if (!orderId || !items || !items.length || !shippingDetails || !subtotal || shipping === undefined || tax === undefined || !total) {
      console.log('Missing required order information:');
      if (!orderId) console.log('- missing orderId');
      if (!items || !items.length) console.log('- missing items');
      if (!shippingDetails) console.log('- missing shippingDetails');
      if (!subtotal) console.log('- missing subtotal');
      if (shipping === undefined) console.log('- missing shipping');
      if (tax === undefined) console.log('- missing tax');
      if (!total) console.log('- missing total');
      
      return res.status(400).json({
        success: false,
        message: 'Missing required order information'
      });
    }
    
    console.log('Creating order in database...');
    
    // Create the order
    const order = new Order({
      orderId,
      userId,
      items,
      shippingDetails,
      paymentMethod,
      subtotal,
      shipping,
      tax,
      total,
      status: 'pending',
      orderDate: orderDate || new Date().toISOString(),
      createdAt: new Date()
    });
    
    const savedOrder = await order.save();
    console.log(`Order ${orderId} saved successfully`);
    
    // Update product stock quantities - subtract ordered quantities from stock
    try {
      console.log('Updating product stock quantities...');
      
      for (const item of items) {
        const { productId, quantity } = item;
        
        // Find the product and update its stock
        const product = await Product.findById(productId);
        
        if (product) {
          // Calculate new stock level (ensure it doesn't go below zero)
          const newStock = Math.max(0, product.stock - quantity);
          console.log(`Updating stock for product ${productId}: ${product.stock} -> ${newStock} (ordered: ${quantity})`);
          
          // Update the product stock
          await Product.updateOne(
            { _id: productId },
            { $set: { stock: newStock } }
          );
        } else {
          console.warn(`Product ${productId} not found when updating stock`);
        }
      }
      
      console.log('Product stock quantities updated successfully');
    } catch (stockError) {
      console.error('Error updating product stock quantities:', stockError);
      // Continue since the order was created successfully
    }
    
    // After saving the order, attempt to send a notification to the user
    try {
      // Find the user to get their push token - use findById with a fresh query to avoid stale data
      const user = await User.findById(userId).select('pushTokens email');
      
      console.log(`Notification attempt for order ${orderId}:`, {
        userId,
        userFound: !!user,
        hasPushTokens: user?.pushTokens?.length > 0 ? 'Yes' : 'No',
        pushTokensCount: user?.pushTokens?.length || 0
      });
      
      if (user && user.pushTokens && user.pushTokens.length > 0) {
        // Get the most recently used token from the array
        const mostRecentToken = user.pushTokens
          .sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed))[0]?.token;
        
        console.log(`User ${userId} has push tokens (${user.pushTokens.length}). Using most recent token: ${mostRecentToken?.substring(0, 15)}...`);
        
        // Add random identifier to prevent notification deduplication by expo
        const uniqueTimestamp = Date.now() + Math.floor(Math.random() * 1000);
        
        // Send the order placed notification
        const notificationResult = await sendOrderPlacedNotification(
          mostRecentToken,
          orderId,
          total,
          uniqueTimestamp // Use a unique timestamp for each notification
        );
        
        // Log detailed notification result
        console.log(`Notification result for order ${orderId}:`, JSON.stringify(notificationResult));
        
        if (notificationResult.success) {
          console.log(`Order placed notification sent successfully to user ${userId} for order ${orderId}`);
        } else {
          console.error(`Failed to send order placed notification: ${notificationResult.error || 'Unknown error'}`);
        }
        
        // Create a notification receipt
        try {
          // Get notification receipt model
          const NotificationReceipt = require('mongoose').model('NotificationReceipt');
          
          // Create receipt with unique ID
          const timestamp = uniqueTimestamp; // Use the same unique timestamp
          const message = `Your Order Placed Successfully!`;
          const receipt = new NotificationReceipt({
            orderId,
            userId,
            status: 'pending',
            message,
            timestamp: new Date(),
            forceShow: true,
            showModal: true,
            uniqueId: `order-placed-${orderId}-${timestamp}`
          });
          
          await receipt.save();
          console.log(`Order placed notification receipt created for order ${orderId}`);
        } catch (receiptError) {
          console.error('Error creating order placed notification receipt:', receiptError);
          // Continue anyway since the order was created successfully
        }
      } else {
        console.log(`User ${userId} doesn't have any valid push tokens configured, skipping notification`);
      }
    } catch (notificationError) {
      console.error('Error sending order placed notification:', notificationError);
      // Continue since the order was created successfully
    }
    
    // Empty only the ordered items from the user's cart after successful order creation
    try {
      console.log(`Removing ordered items from cart for user ${userId}...`);
      
      // Get the product IDs from the order items
      const orderedProductIds = items.map(item => item.productId);
      console.log(`Ordered product IDs:`, orderedProductIds);
      
      // Delete only the items that were ordered
      const deleteCount = await Cart.destroy({
        where: { 
          userId: userId,
          productId: orderedProductIds 
        }
      });
      
      console.log(`Removed ${deleteCount} items from cart for user ${userId}`);
    } catch (cartError) {
      console.error('Error removing ordered items from cart:', cartError);
      // Continue since the order was created successfully
    }
    
    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: error.message
    });
  }
});

// Get all orders (admin only)
router.get('/admin', authenticateToken, async (req, res) => {
  try {
    // Check if the user is an admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }
    
    // Get all orders sorted by creation date (newest first)
    const orders = await Order.find()
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('Error fetching all orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message
    });
  }
});

// Get order details by ID (admin)
router.get('/admin/:orderId', authenticateToken, async (req, res) => {
  try {
    // Check if the user is an admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }
    
    const { orderId } = req.params;
    
    const order = await Order.findOne({ orderId });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error fetching order details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order details',
      error: error.message
    });
  }
});

// Update order status (admin only)
router.patch('/admin/status/:orderId', authenticateToken, async (req, res) => {
  try {
    console.log(`==== ORDER STATUS UPDATE REQUEST ====`);
    console.log(`User: ${req.user.id}, Role: ${req.user.role}`);
    console.log(`Order ID: ${req.params.orderId}, New Status: ${req.body.status}`);
    
    // Check if the user is an admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }
    
    const { orderId } = req.params;
    const { status } = req.body;
    
    if (!status || !['pending', 'processing', 'shipped', 'delivered', 'cancelled'].includes(status)) {
      console.log(`Invalid status: ${status}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }
    
    const order = await Order.findOne({ orderId });
    
    if (!order) {
      console.log(`Order not found: ${orderId}`);
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    console.log(`Found order: ${order._id}, Current status: ${order.status}, New status: ${status}`);
    console.log(`User ID associated with order: ${order.userId}`);

    // Note the previous status for including in the response
    const previousStatus = order.status;

    // Update the status
    order.status = status;
    
    // Set delivered or cancelled dates if applicable
    if (status === 'delivered' && !order.deliveredAt) {
      order.deliveredAt = new Date();
      console.log(`Set deliveredAt to ${order.deliveredAt}`);
    } else if (status === 'cancelled' && !order.cancelledAt) {
      order.cancelledAt = new Date();
      console.log(`Set cancelledAt to ${order.cancelledAt}`);
    }
    
    // Force update timestamp
    order.updatedAt = new Date();
    await order.save();
    console.log(`Order status updated successfully in database`);
    
    let notificationSent = false;
    let notificationError = null;
    
    // Create a notification receipt for the user (new feature)
    let notificationReceiptCreated = false;
    try {
      // Get notification receipt model
      const NotificationReceipt = require('mongoose').model('NotificationReceipt');
      
      // Create receipt
      const message = getStatusMessage(orderId, status);
      const receipt = new NotificationReceipt({
        orderId,
        userId: order.userId,
        status,
        previousStatus,
        message,
        timestamp: new Date(),
        forceShow: true
      });
      
      await receipt.save();
      console.log(`Notification receipt created for order ${orderId}`);
      notificationReceiptCreated = true;
    } catch (receiptError) {
      console.error('Error creating notification receipt:', receiptError);
      // Continue with normal push notification
    }
    
    // Send push notification to the user if they have a push token
    try {
      console.log(`Attempting to send push notification for order ${orderId}`);
      
      // Find the user who placed the order
      const user = await User.findById(order.userId);
      console.log(`User found: ${user ? 'Yes' : 'No'}`);
      
      if (user) {
        console.log(`User email: ${user.email}, Push token exists: ${user.pushTokens ? 'Yes' : 'No'}`);
      }
      
      if (user && user.pushTokens && user.pushTokens.length > 0) {
        console.log(`User has push tokens: ${user.pushTokens.length}`);
        
        // Send the notification with special flags for immediate display
        const notificationResult = await sendOrderStatusNotification(
          user.pushTokens[user.pushTokens.length - 1].token, 
          orderId, 
          status
        );
        
        if (notificationResult.success) {
          console.log(`Push notification sent successfully to user ${user._id} for order ${orderId}`);
          notificationSent = true;
        } else {
          console.error(`Failed to send push notification: ${notificationResult.error || 'Unknown error'}`);
          notificationError = notificationResult.error || 'Unknown error';
        }
      } else {
        console.log(`User ${order.userId} doesn't have any valid push tokens configured`);
        notificationError = 'User does not have any valid push tokens configured';
      }
    } catch (notificationError) {
      console.error('Error in notification process:', notificationError);
      // Continue since the order was updated successfully
    }
    
    // Return data that will be useful for client-side handling
    res.json({
      success: true,
      message: 'Order status updated successfully',
      notificationSent,
      notificationError,
      notificationReceiptCreated,
      data: order,
      statusChanged: true,
      previousStatus,
      newStatus: status,
      timestamp: new Date().toISOString(),
      forceShow: true
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status',
      error: error.message
    });
  }
});

// Get user's orders
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const orders = await Order.find({ userId })
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message
    });
  }
});

// Add a new endpoint to get recent order status updates
router.get('/recent-status-updates', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const lastChecked = req.query.lastChecked || Date.now() - (24 * 60 * 60 * 1000); // Default to 24 hours ago
    
    console.log(`Getting recent order status updates for user ${userId} since ${new Date(parseInt(lastChecked)).toISOString()}`);
    
    // Find orders that have been updated since the last check
    const orders = await Order.find({
      userId,
      updatedAt: { $gte: new Date(parseInt(lastChecked)) }
    });
    
    console.log(`Found ${orders.length} orders updated since last check`);
    
    // Extract the status updates
    const statusUpdates = orders.map(order => ({
      orderId: order.orderId,
      status: order.status,
      updatedAt: order.updatedAt
    }));
    
    res.json({
      success: true,
      data: statusUpdates,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error fetching recent order status updates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent status updates',
      error: error.message
    });
  }
});

// Get single order by ID
router.get('/:orderId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;
    
    const order = await Order.findOne({ orderId, userId });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order',
      error: error.message
    });
  }
});

// Test push notification for an order (admin only)
router.post('/test-notification/:orderId', authenticateToken, async (req, res) => {
  try {
    // Check if the user is an admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }
    
    const { orderId } = req.params;
    let { status } = req.body;
    
    if (!status) {
      status = 'processing'; // Default status if not provided
    }
    
    if (!['pending', 'processing', 'shipped', 'delivered', 'cancelled'].includes(status)) {
      console.log(`Invalid status for test: ${status}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }
    
    console.log(`==== TEST NOTIFICATION REQUEST ====`);
    console.log(`Order ID: ${orderId}, Status: ${status}`);
    
    const order = await Order.findOne({ orderId });
    
    if (!order) {
      console.log(`Order not found: ${orderId}`);
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    console.log(`Found order: ${order._id}, User ID: ${order.userId}`);
    
    // Find the user who placed the order
    const user = await User.findById(order.userId);
    
    if (!user) {
      console.log(`User not found: ${order.userId}`);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    console.log(`User found: ${user._id}, Has push token: ${user.pushTokens ? 'Yes' : 'No'}`);
    
    if (!user.pushTokens || user.pushTokens.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'User does not have any valid push tokens registered'
      });
    }
    
    // Send the notification
    const notificationResult = await sendOrderStatusNotification(user.pushTokens[user.pushTokens.length - 1].token, orderId, status);
    
    if (notificationResult.success) {
      console.log(`Test push notification sent successfully to user ${user._id} for order ${orderId}`);
      
      // Also create a notification receipt for direct client access
      try {
        // Get notification receipt model
        const NotificationReceipt = require('mongoose').model('NotificationReceipt');
        
        // Create receipt
        const message = getStatusMessage(orderId, status);
        const receipt = new NotificationReceipt({
          orderId,
          userId: order.userId,
          status,
          previousStatus: order.status,
          message,
          timestamp: new Date(),
          forceShow: true
        });
        
        await receipt.save();
        console.log(`Test notification receipt created for order ${orderId}`);
      } catch (receiptError) {
        console.error('Error creating test notification receipt:', receiptError);
        // Continue anyway
      }
      
      // Also update the order's status to match
      order.status = status;
      await order.save();
      console.log(`Updated order status to ${status} for demonstration purposes`);
      
      res.json({
        success: true,
        message: 'Test notification sent successfully and order status updated',
        data: notificationResult
      });
    } else {
      console.error(`Failed to send test push notification: ${notificationResult.error || 'Unknown error'}`);
      res.status(500).json({
        success: false,
        message: 'Failed to send test notification',
        error: notificationResult.error || 'Unknown error'
      });
    }
  } catch (error) {
    console.error('Error sending test push notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test notification',
      error: error.message
    });
  }
});

module.exports = router;
