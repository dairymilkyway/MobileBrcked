const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User'); // Ensure path is correct

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('✅ Connected to MongoDB for seeding'))
  .catch(err => {
    console.error('❌ Failed to connect to MongoDB:', err);
    process.exit(1);
  });

// Admin user data
const adminUser = {
  username: 'admin',
  email: 'admin@gmail.com',
  password: 'admin',
  role: 'admin',
};

// Seed admin user
const seedAdmin = async () => {
  try {
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminUser.email });
    if (existingAdmin) {
      console.log('⚠️ Admin already exists. Skipping...');
      return;
    }

    // Create and save admin user
    const newAdmin = new User(adminUser);
    await newAdmin.save();
    console.log('✅ Admin seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding admin:', error);
  } finally {
    mongoose.connection.close();
  }
};

// Run the seeder
seedAdmin();
