const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');
const authenticateToken = require('../middleware/auth');
const { Op } = require('sequelize');

// Get user's cart items
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const cartItems = await Cart.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']]
    });
    
    res.json({
      success: true,
      data: cartItems
    });
  } catch (error) {
    console.error('Error fetching cart items:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cart items',
      error: error.message
    });
  }
});

// Add item to cart
router.post('/add', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, productName, price, quantity, imageURL } = req.body;
    
    // Log incoming request for debugging
    console.log('Cart add request:');
    console.log('- userId:', userId);
    console.log('- productId:', productId);
    console.log('- productName:', productName);
    console.log('- price:', price);
    console.log('- quantity:', quantity, 'type:', typeof quantity);
    
    // Validate required fields
    if (!productId || !productName || price === undefined || !quantity) {
      console.log('Missing required fields in cart add request');
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    // Ensure quantity is a number
    const numericQuantity = Number(quantity);
    
    if (isNaN(numericQuantity) || numericQuantity <= 0) {
      console.log('Invalid quantity value:', quantity);
      return res.status(400).json({
        success: false,
        message: 'Invalid quantity value'
      });
    }
    
    // Check if the item already exists in cart
    const existingItem = await Cart.findOne({
      where: {
        userId,
        productId
      }
    });
    
    if (existingItem) {
      console.log('Existing cart item found:');
      console.log('- Current quantity:', existingItem.quantity);
      console.log('- Adding quantity:', numericQuantity);
      
      // Update quantity if item already exists
      existingItem.quantity += numericQuantity;
      await existingItem.save();
      
      console.log('- New quantity:', existingItem.quantity);
      
      return res.json({
        success: true,
        message: 'Cart item quantity updated',
        data: existingItem
      });
    }
    
    // Create new cart item
    const newCartItem = await Cart.create({
      userId,
      productId,
      productName,
      price,
      quantity: numericQuantity,
      imageURL
    });
    
    console.log('New cart item created with quantity:', newCartItem.quantity);
    
    res.status(201).json({
      success: true,
      message: 'Item added to cart',
      data: newCartItem
    });
  } catch (error) {
    console.error('Error adding item to cart:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add item to cart',
      error: error.message
    });
  }
});

// Update cart item quantity
router.put('/update/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { quantity } = req.body;
    
    // Validate quantity
    if (quantity === undefined || quantity < 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid quantity'
      });
    }
    
    // Find the cart item
    const cartItem = await Cart.findOne({
      where: {
        id,
        userId
      }
    });
    
    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found'
      });
    }
    
    if (quantity === 0) {
      // Remove item if quantity is 0
      await cartItem.destroy();
      return res.json({
        success: true,
        message: 'Item removed from cart'
      });
    }
    
    // Update quantity
    cartItem.quantity = quantity;
    await cartItem.save();
    
    res.json({
      success: true,
      message: 'Cart item updated',
      data: cartItem
    });
  } catch (error) {
    console.error('Error updating cart item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update cart item',
      error: error.message
    });
  }
});

// Remove item from cart
router.delete('/remove/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    // Find and delete the cart item
    const result = await Cart.destroy({
      where: {
        id,
        userId
      }
    });
    
    if (result === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Item removed from cart'
    });
  } catch (error) {
    console.error('Error removing cart item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove cart item',
      error: error.message
    });
  }
});

// Clear entire cart
router.delete('/clear', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Delete all cart items for the user
    await Cart.destroy({
      where: { userId }
    });
    
    res.json({
      success: true,
      message: 'Cart cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear cart',
      error: error.message
    });
  }
});

module.exports = router; 