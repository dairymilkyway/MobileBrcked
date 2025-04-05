const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Define the push token schema
const PushTokenSchema = new mongoose.Schema({
  token: { type: String, required: true },
  device: { type: String, default: 'unknown' },
  createdAt: { type: Date, default: Date.now },
  lastUsed: { type: Date, default: Date.now }
});

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'user' },
  profilePicture: { 
    type: String, 
    default: 'https://minifigs.me/cdn/shop/products/32.png?v=1665143878' 
  },
  // Replace single pushToken with an array of tokens
  pushTokens: {
    type: [PushTokenSchema],
    default: []
  }
});

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password
UserSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

// Add method to add a push token
UserSchema.methods.addPushToken = function(token, device = 'unknown') {
  // Initialize the array if it doesn't exist yet
  if (!this.pushTokens) {
    this.pushTokens = [];
  }
  
  // Check if token already exists
  const existingIndex = this.pushTokens.findIndex(
    item => item && item.token === token
  );
  
  if (existingIndex !== -1) {
    // Update existing token
    this.pushTokens[existingIndex].lastUsed = new Date();
    this.pushTokens[existingIndex].device = device;
  } else {
    // Add new token
    this.pushTokens.push({
      token,
      device,
      createdAt: new Date(),
      lastUsed: new Date()
    });
  }
  
  return this;
};

// Add method to remove a push token
UserSchema.methods.removePushToken = function(token) {
  // Initialize the array if it doesn't exist yet
  if (!this.pushTokens) {
    this.pushTokens = [];
    return this;
  }
  
  // Remove the token
  this.pushTokens = this.pushTokens.filter(
    item => item && item.token !== token
  );
  
  return this;
};

// Correct module export
module.exports = mongoose.model('User', UserSchema);
