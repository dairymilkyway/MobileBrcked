const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Review = require('../models/Review');
const Order = require('../models/Order');
const Product = require('../models/Product');
const authenticateToken = require('../middleware/auth');

// Get all reviews for a specific product
router.get('/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    
    // Convert string ID to MongoDB ObjectId safely
    let productObjectId;
    try {
      productObjectId = new mongoose.Types.ObjectId(productId);
    } catch (err) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid product ID format' 
      });
    }
    
    const reviews = await Review.find({ ProductID: productObjectId })
      .sort({ Reviewdate: -1 }) // Sort by newest first
      .populate('UserID', 'username email'); // Populate user details
    
    // Return empty array if no reviews found
    return res.status(200).json({
      success: true,
      count: reviews.length,
      reviews
    });
    
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching reviews' 
    });
  }
});

// Get average rating for a specific product
router.get('/product/:productId/rating', async (req, res) => {
  try {
    const { productId } = req.params;
    
    // Convert string ID to MongoDB ObjectId safely
    let productObjectId;
    try {
      productObjectId = new mongoose.Types.ObjectId(productId);
    } catch (err) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid product ID format',
        averageRating: 0,
        totalReviews: 0
      });
    }
    
    const result = await Review.aggregate([
      { $match: { ProductID: productObjectId } },
      { $group: {
        _id: "$ProductID",
        averageRating: { $avg: "$Rating" },
        totalReviews: { $sum: 1 }
      }}
    ]);
    
    if (result.length === 0) {
      return res.status(200).json({ 
        success: true,
        averageRating: 0, 
        totalReviews: 0 
      });
    }
    
    res.status(200).json({
      success: true,
      averageRating: result[0].averageRating,
      totalReviews: result[0].totalReviews
    });
    
  } catch (error) {
    console.error('Error calculating average rating:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while calculating rating',
      averageRating: 0,
      totalReviews: 0
    });
  }
});

// Check if a user has purchased a product
const hasUserPurchasedProduct = async (userId, productId) => {
  try {
    // Find any completed orders (delivered status) where this user purchased this product
    const orders = await Order.find({
      userId: userId,
      status: 'delivered',
      'items.productId': productId
    });
    
    return orders.length > 0;
  } catch (error) {
    console.error('Error checking purchase history:', error);
    return false;
  }
};

// Create a new review for a product (only if purchased)
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const { productId, rating, comment } = req.body;
    const userId = req.user.id;
    
    if (!productId || !rating || !comment) {
      return res.status(400).json({
        success: false,
        message: 'Product ID, rating, and comment are required'
      });
    }
    
    // Validate rating
    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }
    
    // Check if user has purchased the product
    const hasPurchased = await hasUserPurchasedProduct(userId, productId);
    
    if (!hasPurchased) {
      return res.status(403).json({
        success: false,
        message: 'You can only review products you have purchased'
      });
    }
    
    // Get product details
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Get user name from req.user
    const user = await mongoose.model('User').findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if user has already reviewed this product
    const existingReview = await Review.findOne({
      UserID: userId,
      ProductID: productId
    });
    
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this product. Please use the update endpoint.'
      });
    }
    
    // Create new review
    const review = new Review({
      UserID: userId,
      Name: user.username || user.name || 'User',
      ProductID: productId,
      Productname: product.name,
      Rating: rating,
      Comment: comment,
      Reviewdate: new Date()
    });
    
    const savedReview = await review.save();
    
    res.status(201).json({
      success: true,
      message: 'Review created successfully',
      review: savedReview
    });
    
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating review'
    });
  }
});

// Update an existing review
router.put('/update/:reviewId', authenticateToken, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.id;
    
    if (!rating && !comment) {
      return res.status(400).json({
        success: false,
        message: 'At least one field (rating or comment) must be provided for update'
      });
    }
    
    // Validate rating if provided
    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }
    
    // Find the review
    const review = await Review.findById(reviewId);
    
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }
    
    // Check if the review belongs to this user
    if (review.UserID.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own reviews'
      });
    }
    
    // Update review fields
    if (rating) review.Rating = rating;
    if (comment) review.Comment = comment;
    review.Reviewdate = new Date(); // Update the review date
    
    const updatedReview = await review.save();
    
    res.status(200).json({
      success: true,
      message: 'Review updated successfully',
      review: updatedReview
    });
    
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating review'
    });
  }
});

// Get reviews by user
router.get('/user', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const reviews = await Review.find({ UserID: userId })
      .sort({ Reviewdate: -1 })
      .populate('ProductID', 'name imageURL');
    
    res.status(200).json({
      success: true,
      count: reviews.length,
      reviews
    });
    
  } catch (error) {
    console.error('Error fetching user reviews:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user reviews'
    });
  }
});

// Check if user can review a product
router.get('/can-review/:productId', authenticateToken, async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user.id;
    
    // Check if user has purchased the product
    const hasPurchased = await hasUserPurchasedProduct(userId, productId);
    
    // Check if user has already reviewed this product
    const existingReview = await Review.findOne({
      UserID: userId,
      ProductID: productId
    });
    
    res.status(200).json({
      success: true,
      canReview: hasPurchased && !existingReview,
      hasPurchased,
      hasReviewed: !!existingReview,
      existingReviewId: existingReview ? existingReview._id : null
    });
    
  } catch (error) {
    console.error('Error checking review eligibility:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while checking review eligibility'
    });
  }
});

// Get all reviews (sorted from newest to oldest)
router.get('/all', async (req, res) => {
  try {
    const reviews = await Review.find({})
      .sort({ Reviewdate: -1 }) // Sort by newest first
      .populate('UserID', 'username email')
      .populate('ProductID', 'name imageURL');
    
    return res.status(200).json({
      success: true,
      count: reviews.length,
      reviews
    });
    
  } catch (error) {
    console.error('Error fetching all reviews:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching reviews' 
    });
  }
});

// Delete a review - allow admin to delete any review
router.delete('/delete/:reviewId', authenticateToken, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    // Find the review
    const review = await Review.findById(reviewId);
    
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }
    
    // Check if the user is admin or the review owner
    if (!isAdmin && review.UserID.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own reviews'
      });
    }
    
    // Delete the review
    await Review.findByIdAndDelete(reviewId);
    
    res.status(200).json({
      success: true,
      message: 'Review deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting review'
    });
  }
});

module.exports = router;
