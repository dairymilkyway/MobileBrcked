// Load environment variables right at the beginning to ensure they're available throughout the app
require('dotenv').config();

// Debug Cloudinary configuration 
console.log('Cloudinary Config Check:');
console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME);
console.log('CLOUDINARY_API_KEY exists:', !!process.env.CLOUDINARY_API_KEY);
console.log('CLOUDINARY_API_SECRET exists:', !!process.env.CLOUDINARY_API_SECRET);

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const User = require('./models/User');
const reviewRoutes = require('./apis/ReviewAPI');
// Import the product routes
const productRoutes = require('./apis/ProductAPI');
const userRoutes = require('./apis/UserAPI');
const cartRoutes = require('./apis/CartAPI'); // Import cart routes
const orderRoutes = require('./apis/OrderAPI'); // Import order routes
const testRoutes = require('./apis/TestAPI'); // Import test routes
const authenticateToken = require('./middleware/auth'); // ✅ Import auth middleware
const { generateToken, blacklistToken, cleanupExpiredTokens } = require('./utils/tokenManager');
const { uploadToCloudinary } = require('./utils/cloudinary');
const { scheduleTokenCleanup } = require('./utils/scheduledTasks');

// Initialize express
const app = express();
app.use(express.json());

// ✅ CORS configuration
const corsOptions = {
  origin: '*', // Change to your frontend URL if needed
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

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

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Initialize SQLite database and MongoDB connections in parallel
const initDatabases = async () => {
  // Start MongoDB connection
  try {
    await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ Error connecting to MongoDB:', err);
  }

  // Initialize SQLite database by importing the Token model
  try {
    // First check if the file exists and is not empty
    const dbPath = path.join(__dirname, 'database', 'database.sqlite');
    const needsRebuild = !fs.existsSync(dbPath) || fs.statSync(dbPath).size < 100;
    
    if (needsRebuild) {
      console.log('SQLite database needs initialization...');
      // Import dynamically to avoid circular dependencies
      const { Sequelize, DataTypes } = require('sequelize');
      const sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: dbPath,
        logging: false
      });
      
      // Define Token model
      const Token = sequelize.define('Token', {
        userId: {
          type: DataTypes.STRING,
          allowNull: false
        },
        email: {
          type: DataTypes.STRING,
          allowNull: true,
          comment: 'User email associated with this token'
        },
        token: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: true
        },
        expiresAt: {
          type: DataTypes.DATE,
          allowNull: false
        },
        blacklisted: {
          type: DataTypes.BOOLEAN,
          defaultValue: false
        }
      });
      
      // Force sync to create tables
      await Token.sync({ force: true });
      
      console.log('✅ SQLite database initialized successfully');
    } else {
      // Just importing the model will initialize it
      require('./models/Token');
      console.log('✅ SQLite database connected');
    }
  } catch (error) {
    console.error('❌ Error initializing SQLite database:', error);
  }
};

// Initialize databases before starting server
initDatabases().then(() => {
  // Setup scheduled cleanup tasks
  scheduleTokenCleanup();
  
  // ✅ Register route with image upload
  app.post('/api/register', upload.single('profilePicture'), async (req, res) => {
    try {
      const { username, email, password, role = 'user' } = req.body;
      
      let profilePicture = undefined;
      
      // If there's an uploaded file, upload it to Cloudinary
      if (req.file) {
        try {
          const result = await uploadToCloudinary(req.file.path, 'brcked_users');
          profilePicture = result.secure_url;
          console.log('Profile picture uploaded to Cloudinary:', profilePicture);
        } catch (uploadError) {
          console.error('Error uploading to Cloudinary:', uploadError);
          // Continue registration even if image upload fails
        }
      }
      
      const user = new User({ 
        username, 
        email, 
        password, 
        role,
        ...(profilePicture && { profilePicture }),
      });
      
      await user.save();
      res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // ✅ Login route
  app.post('/api/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });
      if (!user || !(await user.comparePassword(password))) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Get user ID as a string
      const userId = user._id.toString();
      
      // Log user data for debugging
      console.log('Login - User found:', { 
        id: userId,
        email: user.email,
        role: user.role 
      });
      
      // ✅ Generate JWT token with 24 hour expiration and store in SQLite
      const token = await generateToken({ 
        id: userId, // Explicitly named 'id' for consistency
        role: user.role,
        email: user.email
      }, '24h');
      
      res.json({ 
        token, 
        role: user.role,
        userId: userId // Also return userId in the response
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ✅ Logout route
  app.post('/api/logout', authenticateToken, async (req, res) => {
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
      
      // Blacklist the token in SQLite
      await blacklistToken(token);
      res.json({ message: 'Logged out successfully' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Use product routes
  app.use('/api/products', productRoutes);

  // Use user routes
  app.use('/api/users', userRoutes);

  // Use review routes - update this line for consistency
  app.use('/api/reviews', reviewRoutes);

  // Use cart routes
  app.use('/api/cart', cartRoutes);
  
  // Use order routes
  app.use('/api/orders', orderRoutes);

  // Use test routes
  app.use('/api/test', testRoutes);

  // Use notification routes
  const notificationRoutes = require('./apis/NotificationAPI');
  app.use('/api/notifications', notificationRoutes);

  // ✅ Protected route example
  app.get('/api/profile', authenticateToken, async (req, res) => {
    try {
      const user = await User.findById(req.user.id).select('-password');
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json(user);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Debug route to check token storage (remove in production)
  app.get('/api/debug/tokens', async (req, res) => {
    try {
      const Token = require('./models/Token');
      const tokens = await Token.findAll({
        limit: 10,
        order: [['createdAt', 'DESC']]
      });
      
      // Return sanitized token info (don't expose full tokens)
      const sanitizedTokens = tokens.map(t => ({
        id: t.id,
        userId: t.userId,
        expiresAt: t.expiresAt,
        blacklisted: t.blacklisted,
        createdAt: t.createdAt,
        tokenPreview: t.token ? t.token.substring(0, 10) + '...' : 'null'
      }));
      
      res.json({ count: tokens.length, tokens: sanitizedTokens });
    } catch (err) {
      console.error('Error fetching tokens:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Admin route with HTML interface to view tokens
  app.get('/admin/tokens', async (req, res) => {
    try {
      const Token = require('./models/Token');
      const tokens = await Token.findAll({
        order: [['createdAt', 'DESC']]
      });
      
      // Count expired tokens
      const now = new Date();
      const expiredCount = tokens.filter(t => new Date(t.expiresAt) < now).length;
      
      // Format tokens for display
      const formattedTokens = tokens.map(t => {
        const isExpired = new Date(t.expiresAt) < now;
        return {
          id: t.id,
          userId: t.userId,
          tokenPreview: t.token ? t.token.substring(0, 15) + '...' : 'null',
          expiresAt: new Date(t.expiresAt).toLocaleString(),
          blacklisted: t.blacklisted ? 'Yes' : 'No',
          expired: isExpired ? 'Yes' : 'No',
          createdAt: new Date(t.createdAt).toLocaleString()
        };
      });
      
      // Return HTML page
      const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Token Database Admin</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; }
            table { border-collapse: collapse; width: 100%; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .blacklisted, .expired { color: red; }
            .valid { color: green; }
            .actions { margin: 20px 0; }
            .button {
              display: inline-block;
              padding: 10px 15px;
              background-color: #4CAF50;
              color: white;
              text-decoration: none;
              border-radius: 4px;
            }
            .stats {
              display: flex;
              gap: 20px;
              margin-bottom: 20px;
            }
            .stat-box {
              background-color: #f5f5f5;
              padding: 15px;
              border-radius: 5px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
          </style>
        </head>
        <body>
          <h1>Token Database Admin</h1>
          
          <div class="stats">
            <div class="stat-box">
              <h3>Total Tokens</h3>
              <p>${tokens.length}</p>
            </div>
            <div class="stat-box">
              <h3>Expired Tokens</h3>
              <p>${expiredCount}</p>
            </div>
            <div class="stat-box">
              <h3>Blacklisted Tokens</h3>
              <p>${tokens.filter(t => t.blacklisted).length}</p>
            </div>
          </div>
          
          <div class="actions">
            <a href="/admin/cleanup-tokens" class="button">Clean Up Expired Tokens</a>
          </div>
          
          <table>
            <tr>
              <th>ID</th>
              <th>User ID</th>
              <th>Token (preview)</th>
              <th>Expires At</th>
              <th>Blacklisted</th>
              <th>Expired</th>
              <th>Created At</th>
            </tr>
            ${formattedTokens.map(t => `
              <tr>
                <td>${t.id}</td>
                <td>${t.userId}</td>
                <td>${t.tokenPreview}</td>
                <td>${t.expiresAt}</td>
                <td class="${t.blacklisted === 'Yes' ? 'blacklisted' : 'valid'}">${t.blacklisted}</td>
                <td class="${t.expired === 'Yes' ? 'expired' : 'valid'}">${t.expired}</td>
                <td>${t.createdAt}</td>
              </tr>
            `).join('')}
          </table>
        </body>
      </html>
      `;
      
      res.send(html);
    } catch (err) {
      console.error('Error generating token admin page:', err);
      res.status(500).send('Error loading token database');
    }
  });

  // Admin route to manually clean up expired tokens
  app.get('/admin/cleanup-tokens', async (req, res) => {
    try {
      await cleanupExpiredTokens();
      res.redirect('/admin/tokens');
    } catch (err) {
      console.error('Error during manual token cleanup:', err);
      res.status(500).send('Error cleaning up tokens');
    }
  });

  // ✅ Admin-only route
  app.get('/api/admin/data', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admins only.' });
    }
    res.json({ message: 'Welcome Admin! Here is the secret data.' });
  });

  // Schedule token cleanup to run every day
  setInterval(cleanupExpiredTokens, 24 * 60 * 60 * 1000);

  // Debug route to check token contents
  app.get('/api/debug/token', authenticateToken, (req, res) => {
    try {
      // Return the decoded token payload
      res.json({
        message: 'Your decoded token:',
        user: req.user,
        tokenContains: {
          id: req.user.id ? 'Present' : 'Missing',
          _id: req.user._id ? 'Present' : 'Missing',
          role: req.user.role ? 'Present' : 'Missing',
          email: req.user.email ? 'Present' : 'Missing',
        }
      });
    } catch (err) {
      console.error('Error in debug token route:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ✅ Start server
  const PORT = process.env.PORT || 9000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});