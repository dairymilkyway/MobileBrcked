const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const authenticateToken = require('../middleware/auth');

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
    console.log('Order saved successfully:', savedOrder._id);
    
    // Update product stock quantities
    const stockUpdatePromises = items.map(async (item) => {
      try {
        // Find the product by its MongoDB ID
        const product = await Product.findById(item.productId);
        
        if (!product) {
          console.log(`Product not found: ${item.productId}`);
          return;
        }
        
        // Calculate new stock quantity
        const newStock = Math.max(0, product.stock - item.quantity);
        console.log(`Updating stock for product ${product.name} from ${product.stock} to ${newStock}`);
        
        // Update the product stock
        await Product.findByIdAndUpdate(
          item.productId,
          { $set: { stock: newStock } },
          { new: true }
        );
      } catch (stockError) {
        console.error(`Error updating stock for product ${item.productId}:`, stockError);
        // Continue processing other products even if one fails
      }
    });
    
    // Wait for all stock updates to complete
    await Promise.all(stockUpdatePromises);
    console.log('Finished updating product stock quantities');
    
    // Delete the items from cart using cart item IDs instead of product IDs
    // The frontend sends cart items with 'id' which is the SQLite primary key
    const cartItemIds = items.map(item => item.id).filter(id => id);
    console.log('Removing items from cart with cartItemIds:', cartItemIds);
    
    if (cartItemIds.length > 0) {
      try {
        const deleteResult = await Cart.destroy({
          where: {
            id: cartItemIds
          }
        });
        console.log('Items removed from cart:', deleteResult);
      } catch (cartError) {
        console.error('Error removing items from cart but order was created:', cartError);
        // Continue since the order was created successfully
      }
    } else {
      console.log('No valid cart IDs found to remove');
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

module.exports = router;
