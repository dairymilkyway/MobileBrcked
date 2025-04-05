const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authenticateToken = require('../middleware/auth');
const multer = require('multer');
const { uploadToCloudinary } = require('../utils/cloudinary');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// Get user profile (for authenticated user)
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        // Get the user's ID from the authenticated token
        const userId = req.user.id;
        
        // Get user from database (excluding password)
        const user = await User.findById(userId).select('-password');
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        
        res.json({ success: true, data: user });
    } catch (err) {
        console.error('Error fetching user profile:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get current user info (alternative endpoint for '/profile')
router.get('/me', authenticateToken, async (req, res) => {
    try {
        // Get the user's ID from the authenticated token
        const userId = req.user.id;
        
        // Get user from database (excluding password)
        const user = await User.findById(userId).select('-password');
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        
        res.json({ success: true, data: user });
    } catch (err) {
        console.error('Error fetching current user data:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Update user profile (for authenticated user)
router.put('/profile', authenticateToken, upload.single('profilePicture'), async (req, res) => {
    try {
        // Get the user's ID from the authenticated token
        const userId = req.user.id;
        
        const { username, email, currentPassword, newPassword } = req.body;
        
        // Find the user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Create update object
        const updateData = {};
        
        // Update email if provided and different
        if (email && email !== user.email) {
            // Check if email is already in use by another user
            const existingUser = await User.findOne({ email, _id: { $ne: userId } });
            if (existingUser) {
                return res.status(400).json({ error: 'Email already in use by another account' });
            }
            updateData.email = email;
        }
        
        // Update username if provided and different
        if (username && username !== user.username) {
            // Check if username is already in use by another user
            const existingUser = await User.findOne({ username, _id: { $ne: userId } });
            if (existingUser) {
                return res.status(400).json({ error: 'Username already in use by another account' });
            }
            updateData.username = username;
        }
        
        // If user wants to change password
        if (currentPassword && newPassword) {
            // Verify current password
            const isMatch = await user.comparePassword(currentPassword);
            if (!isMatch) {
                return res.status(400).json({ error: 'Current password is incorrect' });
            }
            
            // Set new password
            updateData.password = newPassword;
        }
        
        // Handle profile picture upload if file is provided
        if (req.file) {
            try {
                const result = await uploadToCloudinary(req.file.path, 'brcked_users');
                updateData.profilePicture = result.secure_url;
                console.log('Profile picture uploaded to Cloudinary:', result.secure_url);
            } catch (uploadError) {
                console.error('Error uploading to Cloudinary:', uploadError);
                // Continue even if image upload fails
            }
        }
        
        // Only update if there are changes
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: 'No changes to update' });
        }
        
        // Update user
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');
        
        res.json({ data: updatedUser, message: 'Profile updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all users (admin only)
router.get('/', authenticateToken, async (req, res) => {
    // Check if user is admin
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied. Admins only.' });
    }

    try {
        // Get users from database (excluding password)
        const users = await User.find().select('-password');
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get single user by ID (admin only)
router.get('/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied. Admins only.' });
    }

    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create new user (admin only)
router.post('/', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied. Admins only.' });
    }

    try {
        const { username, email, password, role = 'user' } = req.body;
        
        // Check if user already exists
        const existingUser = await User.findOne({ 
            $or: [{ email }, { username }]
        });
        
        if (existingUser) {
            return res.status(400).json({ 
                error: 'User with this email or username already exists' 
            });
        }

        const user = new User({ username, email, password, role });
        await user.save();
        res.status(201).json({ message: 'User created successfully' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Update user (admin only)
router.put('/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied. Admins only.' });
    }

    try {
        const { username, email, role } = req.body;
        const updateData = { username, email, role };
        
        // If password is provided, include it
        if (req.body.password) {
            updateData.password = req.body.password;
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(user);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Delete user (admin only)
router.delete('/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied. Admins only.' });
    }

    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Register push notification token
router.post('/register-push-token', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { pushToken, deviceInfo } = req.body;

    if (!pushToken) {
      return res.status(400).json({
        success: false,
        message: 'Push token is required'
      });
    }

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if addPushToken method exists
    if (typeof user.addPushToken === 'function') {
      // Use the method if it exists
      user.addPushToken(pushToken, deviceInfo || 'unknown');
    } else {
      // Fallback implementation if the method doesn't exist
      console.log('addPushToken method not found, using fallback implementation');
      
      // Initialize pushTokens array if it doesn't exist
      if (!Array.isArray(user.pushTokens)) {
        user.pushTokens = [];
      }
      
      // Check if token already exists
      const existingIndex = user.pushTokens.findIndex(
        item => item && item.token === pushToken
      );
      
      if (existingIndex !== -1) {
        // Update existing token
        user.pushTokens[existingIndex].lastUsed = new Date();
        if (deviceInfo) {
          user.pushTokens[existingIndex].device = deviceInfo;
        }
      } else {
        // Add new token
        user.pushTokens.push({
          token: pushToken,
          device: deviceInfo || 'unknown',
          createdAt: new Date(),
          lastUsed: new Date()
        });
      }
    }
    
    // Handle old schema migration - if pushToken field exists
    if (user.pushToken !== undefined) {
      console.log('Found old pushToken field, consider migration to pushTokens array');
      // Keep the old field updated too for backward compatibility
      user.pushToken = pushToken;
    }
    
    // Save the user with updated pushTokens
    await user.save();

    console.log(`Push token registered for user ${userId}`);

    res.json({
      success: true,
      message: 'Push token registered successfully'
    });
  } catch (error) {
    console.error('Error registering push token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register push token',
      error: error.message
    });
  }
});

// Remove push notification token
router.delete('/remove-push-token', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { pushToken } = req.body;

    if (!pushToken) {
      return res.status(400).json({
        success: false,
        message: 'Push token is required'
      });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Store the original count to check if anything was removed
    const originalCount = user.pushTokens ? user.pushTokens.length : 0;
    
    // Check if removePushToken method exists
    if (typeof user.removePushToken === 'function') {
      // Use the method if it exists
      user.removePushToken(pushToken);
    } else {
      // Fallback implementation if the method doesn't exist
      console.log('removePushToken method not found, using fallback implementation');
      
      // Initialize pushTokens array if it doesn't exist
      if (!Array.isArray(user.pushTokens)) {
        user.pushTokens = [];
      } else {
        // Filter out the token to remove
        user.pushTokens = user.pushTokens.filter(
          item => item && item.token !== pushToken
        );
      }
    }
    
    // Handle old schema as well - if pushToken field exists
    if (user.pushToken !== undefined && user.pushToken === pushToken) {
      console.log('Found matching token in old pushToken field, clearing it');
      user.pushToken = null;
    }
    
    // Save the user with updated pushTokens
    await user.save();
    
    const tokensRemoved = originalCount - (user.pushTokens ? user.pushTokens.length : 0);

    console.log(`${tokensRemoved} push tokens removed for user ${userId}`);

    res.json({
      success: true,
      message: `${tokensRemoved} push tokens removed successfully`
    });
  } catch (error) {
    console.error('Error removing push token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove push token',
      error: error.message
    });
  }
});

// Remove stale tokens - tokens not used in the last 30 days
router.post('/cleanup-push-tokens', authenticateToken, async (req, res) => {
  try {
    // Only admins can trigger manual cleanup
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Find all users and update their push tokens
    const users = await User.find({
      'pushTokens.0': { $exists: true } // Users who have at least one push token
    });

    let totalRemoved = 0;
    for (const user of users) {
      const originalCount = user.pushTokens.length;
      user.pushTokens = user.pushTokens.filter(token => 
        token.lastUsed > thirtyDaysAgo
      );
      
      if (user.pushTokens.length !== originalCount) {
        await user.save();
        totalRemoved += (originalCount - user.pushTokens.length);
      }
    }

    res.json({
      success: true,
      message: `Removed ${totalRemoved} stale push tokens`
    });
  } catch (error) {
    console.error('Error cleaning up push tokens:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clean up push tokens',
      error: error.message
    });
  }
});

module.exports = router; 