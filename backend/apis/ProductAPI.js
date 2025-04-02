const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const upload = require('../middleware/upload');
const authenticateToken = require('../middleware/auth');
const fs = require('fs');
const path = require('path');

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

/**
 * @route   POST /api/products
 * @desc    Create a new product with image upload
 * @access  Private/Admin
 */
router.post('/', authenticateToken, upload.array('images', 5), async (req, res) => {
  try {
    console.log('Product creation request received');
    console.log('Request body:', req.body);
    console.log('Files received:', req.files ? req.files.length : 0);
    
    // Check if user is admin
    if (req.user.role !== 'admin') {
      console.log('Access denied: User is not admin');
      // Delete uploaded files if user is not admin
      if (req.files && req.files.length > 0) {
        req.files.forEach(file => {
          fs.unlinkSync(file.path);
        });
      }
      
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only admin can create products.'
      });
    }
    
    const { name, price, stock, description, category, pieces } = req.body;
    console.log('Product data:', { name, price, stock, description, category, pieces });
    
    // Validate required fields
    if (!name || !price || !description || !category) {
      console.log('Validation failed: Missing required fields');
      // Delete uploaded files if validation fails
      if (req.files && req.files.length > 0) {
        req.files.forEach(file => {
          fs.unlinkSync(file.path);
        });
      }
      
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: name, price, description, category'
      });
    }
    
    // Process uploaded images
    const imageURLs = [];
    if (req.files && req.files.length > 0) {
      console.log('Processing uploaded files');
      req.files.forEach(file => {
        console.log('File path:', file.path);
        // Convert Windows path to URL format
        const relativePath = file.path.replace(/\\/g, '/').split('uploads/')[1];
        const imageURL = `/uploads/${relativePath}`;
        console.log('Image URL created:', imageURL);
        imageURLs.push(imageURL);
      });
    } else {
      console.log('No files were uploaded');
    }
    
    const product = new Product({
      name,
      price,
      stock: stock || 0,
      description,
      category,
      pieces: pieces || 1,
      imageURL: imageURLs.length > 0 ? imageURLs : ['https://via.placeholder.com/300']
    });
    
    console.log('Product object created:', product);
    
    await product.save();
    console.log('Product saved successfully');
    
    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product
    });
  } catch (error) {
    console.error('Error creating product:', error);
    // Delete uploaded files if product creation fails
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        fs.unlinkSync(file.path);
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create product',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/products/:id
 * @desc    Update a product with optional image upload
 * @access  Private/Admin
 */
router.put('/:id', authenticateToken, upload.array('images', 5), async (req, res) => {
  try {
    console.log('Updating product:', req.params.id);
    console.log('Request body:', req.body);
    console.log('Files received:', req.files ? req.files.length : 0);
    
    // Check if user is admin
    if (req.user.role !== 'admin') {
      console.log('Access denied: User is not admin');
      // Delete uploaded files if user is not admin
      if (req.files && req.files.length > 0) {
        req.files.forEach(file => {
          fs.unlinkSync(file.path);
        });
      }
      
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only admin can update products.'
      });
    }
    
    const { name, price, stock, description, category, pieces } = req.body;
    
    // Find product
    const product = await Product.findById(req.params.id);
    if (!product) {
      console.log('Product not found:', req.params.id);
      // Delete uploaded files if product not found
      if (req.files && req.files.length > 0) {
        req.files.forEach(file => {
          fs.unlinkSync(file.path);
        });
      }
      
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    console.log('Current images:', product.imageURL);
    
    // Process uploaded images
    let imageURLs = [...product.imageURL]; // Keep existing images by default
    
    // Check if removeImages is true
    if (req.body.removeImages === 'true') {
      console.log('removeImages flag is true');
      
      // If existingImages is provided, use those instead of clearing all images
      if (req.body.existingImages) {
        try {
          // Parse the JSON string of existing images to keep
          console.log('existingImages provided:', req.body.existingImages);
          const existingImages = JSON.parse(req.body.existingImages);
          
          if (Array.isArray(existingImages)) {
            console.log('Using provided existingImages array:', existingImages);
            imageURLs = existingImages;
          } else {
            console.log('existingImages is not an array, clearing all images');
            imageURLs = []; // Clear existing images if format is invalid
          }
        } catch (error) {
          console.error('Error parsing existingImages:', error);
          imageURLs = []; // Clear existing images on parsing error
        }
      } else {
        console.log('removeImages is true without existingImages, clearing all images');
        imageURLs = []; // Clear existing images if no existingImages provided
      }
    } else {
      console.log('Keeping all existing images');
    }
    
    // Add new uploaded images
    if (req.files && req.files.length > 0) {
      console.log('Processing', req.files.length, 'new uploaded files');
      req.files.forEach(file => {
        // Convert Windows path to URL format
        const relativePath = file.path.replace(/\\/g, '/').split('uploads/')[1];
        const imageURL = `/uploads/${relativePath}`;
        console.log('Adding new image URL:', imageURL);
        imageURLs.push(imageURL);
      });
    }
    
    // If no images are left, use placeholder
    if (imageURLs.length === 0) {
      console.log('No images left, using placeholder');
      imageURLs = ['https://via.placeholder.com/300'];
    }
    
    console.log('Final image URLs to save:', imageURLs);
    
    // Update product
    product.name = name || product.name;
    product.price = price || product.price;
    product.stock = stock !== undefined ? stock : product.stock;
    product.description = description || product.description;
    product.category = category || product.category;
    product.pieces = pieces || product.pieces;
    product.imageURL = imageURLs;
    
    await product.save();
    console.log('Product updated successfully');
    
    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: product
    });
  } catch (error) {
    console.error('Error updating product:', error);
    // Delete uploaded files if product update fails
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        fs.unlinkSync(file.path);
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to update product',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/products/:id
 * @desc    Delete a product
 * @access  Private/Admin
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only admin can delete products.'
      });
    }
    
    // Find product
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Clean up image files (optional)
    product.imageURL.forEach(imageURL => {
      if (!imageURL.includes('placeholder.com')) {
        const imagePath = path.join(__dirname, '..', imageURL);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      }
    });
    
    await Product.findByIdAndDelete(req.params.id);
    
    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete product',
      error: error.message
    });
  }
});

module.exports = router;