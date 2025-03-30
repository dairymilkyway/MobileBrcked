const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

/**
 * @route   GET /api/products
 * @desc    Get all products with optional filters
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const { limit = 10, page = 1, sort, minPrice, maxPrice } = req.query;
    
    // Build filter object
    const filter = {};
    
    if (minPrice && maxPrice) {
      filter.price = { $gte: parseFloat(minPrice), $lte: parseFloat(maxPrice) };
    } else if (minPrice) {
      filter.price = { $gte: parseFloat(minPrice) };
    } else if (maxPrice) {
      filter.price = { $lte: parseFloat(maxPrice) };
    }
    
    // Build sort object
    const sortOptions = {};
    if (sort) {
      const [field, order] = sort.split(':');
      sortOptions[field] = order === 'desc' ? -1 : 1;
    } else {
      sortOptions.createdAt = -1; // Default sort by newest
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const products = await Product.find(filter)
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip(skip);
    
    const totalProducts = await Product.countDocuments(filter);
    
    res.status(200).json({
      success: true,
      count: products.length,
      total: totalProducts,
      totalPages: Math.ceil(totalProducts / parseInt(limit)),
      currentPage: parseInt(page),
      data: products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/products/category/:category
 * @desc    Get products by category
 * @access  Public
 */
router.get('/category/:category', async (req, res) => {
  try {
    const { limit = 10, page = 1, sort } = req.query;
    const { category } = req.params;
    
    // Validate category
    const validCategories = ['Minifigure', 'Set', 'Piece'];
    
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category. Must be Minifigure, Set, or Piece.'
      });
    }
    
    // Build sort object
    const sortOptions = {};
    if (sort) {
      const [field, order] = sort.split(':');
      sortOptions[field] = order === 'desc' ? -1 : 1;
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const products = await Product.find({ category })
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip(skip);
    
    const totalProducts = await Product.countDocuments({ category });
    
    res.status(200).json({
      success: true,
      count: products.length,
      total: totalProducts,
      totalPages: Math.ceil(totalProducts / parseInt(limit)),
      currentPage: parseInt(page),
      data: products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products by category',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/products/search/:query
 * @desc    Search products by name
 * @access  Public
 */
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const { limit = 10, page = 1 } = req.query;
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const products = await Product.find({
      name: { $regex: query, $options: 'i' }
    })
    .limit(parseInt(limit))
    .skip(skip);
    
    const totalProducts = await Product.countDocuments({
      name: { $regex: query, $options: 'i' }
    });
    
    res.status(200).json({
      success: true,
      count: products.length,
      total: totalProducts,
      totalPages: Math.ceil(totalProducts / parseInt(limit)),
      currentPage: parseInt(page),
      data: products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to search products',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/products/:id
 * @desc    Get product by ID
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Invalid product ID format'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product',
      error: error.message
    });
  }
});

module.exports = router;