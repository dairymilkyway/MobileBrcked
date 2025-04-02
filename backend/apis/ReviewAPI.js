const express = require('express');
const router = express.Router();
const Review = require('../../models/Review');

// GET all reviews
router.get('/reviews', async (req, res) => {
  try {
    const reviews = await Review.find()
      .sort({ Reviewdate: -1 }); // Sort by date, newest first
    
    res.status(200).json({
      success: true,
      count: reviews.length,
      data: reviews
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: error.message
    });
  }
});

module.exports = router;
