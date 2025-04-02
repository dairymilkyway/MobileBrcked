const mongoose = require('mongoose');
const Review = require('../models/Review');
const Product = require('../models/Product');
const User = require('../models/User');

// Sample reviews creation function
const createReviews = (users, products) => {
  const reviews = [];
  
  // Create 1-3 reviews for each product
  products.forEach(product => {
    // Randomly select 1-3 users to review each product
    const numReviewers = Math.floor(Math.random() * 3) + 1;
    const reviewers = [...users].sort(() => 0.5 - Math.random()).slice(0, numReviewers);
    
    reviewers.forEach(user => {
      reviews.push({
        UserID: user._id,
        Name: user.name || user.username || 'Anonymous User', // Adjust based on your User model
        ProductID: product._id,
        Productname: product.name,
        Rating: Math.floor(Math.random() * 5) + 1, // Random rating 1-5
        Comment: getRandomComment(product.name, product.category),
        Reviewdate: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000) // Random date in last 30 days
      });
    });
  });
  
  return reviews;
};

// Generate random review comments
const getRandomComment = (productName, category) => {
  const comments = [
    `This ${productName} is amazing! Definitely worth the price.`,
    `I've been using this ${category.toLowerCase()} for a month now and I'm very satisfied.`,
    `Good quality, fast delivery. Exactly as described.`,
    `Love this ${productName}! Would recommend to anyone interested.`,
    `Decent product but could be better. Still satisfied with my purchase.`,
    `Exceeded my expectations! Will buy from this store again.`,
    `Great value for money. My kids love this ${category.toLowerCase()}.`,
    `Solid construction and nice design. Very happy with this purchase.`,
    `Works as advertised. No complaints so far.`,
    `Perfect addition to my collection! 5 stars!`
  ];
  
  return comments[Math.floor(Math.random() * comments.length)];
};

// Seed reviews function
const seedReviews = async () => {
  try {
    // Clear existing reviews
    await Review.deleteMany({});
    console.log('Reviews collection cleared');
    
    // Fetch existing products and users
    const products = await Product.find();
    console.log(`Found ${products.length} existing products`);
    
    const users = await User.find();
    console.log(`Found ${users.length} existing users`);
    
    if (products.length === 0 || users.length === 0) {
      console.warn('No products or users found. Make sure to seed products and users first.');
      return;
    }
    
    // Generate and insert reviews
    const reviews = createReviews(users, products);
    await Review.insertMany(reviews);
    console.log(`${reviews.length} reviews seeded successfully`);
    
  } catch (error) {
    console.error('Error seeding reviews:', error);
    throw error;
  }
};

// Connect to MongoDB and run seeder
const seedDB = async () => {
    try {
      console.log('Attempting to connect to MongoDB...');
      // Using the same connection string as productSeeder.js
      await mongoose.connect('mongodb+srv://mongodebisch:7lEGY6RKLrw0M9Ql@cluster0.2qg9m.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');
      console.log('MongoDB Atlas connected successfully');
      
      await seedReviews();
      
      // Close connection after seeding
      await mongoose.connection.close();
      console.log('Database connection closed');
    } catch (error) {
      console.error('Error in database operation:', error.message);
      if (error.name === 'MongoNetworkError') {
        console.error('Could not connect to MongoDB. Is the database running?');
      }
      process.exit(1);
    }
};

// Execute the seeder
seedDB();

// Export for potential use in other files
module.exports = { seedReviews };
