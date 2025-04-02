// auth.js
const jwt = require('jsonwebtoken');
const { verifyToken } = require('../utils/tokenManager');

// ✅ Middleware to verify JWT Token
const authenticateToken = async (req, res, next) => {
  // Get token from header
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  // Extract the token from the Authorization header (remove 'Bearer ' prefix)
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;

  try {
    // Verify token using SQLite storage
    const decoded = await verifyToken(token);
    
    if (!decoded) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    
    req.user = decoded; // Attach user info to request object
    next(); // Proceed to the next middleware or route
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

module.exports = authenticateToken;
