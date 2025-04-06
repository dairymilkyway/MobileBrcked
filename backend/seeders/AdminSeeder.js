const mongoose = require('mongoose');
const User = require('../models/User');

const seedAdmin = async () => {
  try {
    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    
    if (existingAdmin) {
      console.log('Admin user already exists');
      return;
    }
    
    // Create admin user
    const adminUser = new User({
      username: 'admin',
      email: 'admin@gmail.com',
      password: 'admin', // Will be hashed automatically via pre-save hook
      role: 'admin',
      profilePicture: 'https://minifigs.me/cdn/shop/products/32.png?v=1665143878'
    });
    
    await adminUser.save();
    console.log('Admin user created successfully');
    
  } catch (error) {
    console.error('Error seeding admin user:', error);
  }
};

module.exports = seedAdmin;
