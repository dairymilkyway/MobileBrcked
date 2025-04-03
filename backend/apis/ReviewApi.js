const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Review = require('../models/Review');

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

module.exports = router;
