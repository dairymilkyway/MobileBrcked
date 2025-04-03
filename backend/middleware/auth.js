// auth.js
const jwt = require('jsonwebtoken');
const { verifyToken } = require('../utils/tokenManager');

// ✅ Middleware to verify JWT Token
const authenticateToken = async (req, res, next) => {
  // Get token from header
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    console.log('Auth failed: No authorization header');
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  // Extract the token from the Authorization header (remove 'Bearer ' prefix)
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;

  try {
    // For debugging - attempt direct JWT verification
    try {
      const jwtDecoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('JWT direct verification successful. Payload:', {
        id: jwtDecoded.id || 'missing',
        role: jwtDecoded.role || 'missing'
      });
    } catch (jwtError) {
      console.log('JWT direct verification failed:', jwtError.message);
    }
    
    // Verify token using SQLite storage
    const decoded = await verifyToken(token);
    
    if (!decoded) {
      console.log('Auth failed: Token verification returned null');
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    
    console.log('Auth successful for user:', {
      id: decoded.id || 'missing',
      role: decoded.role || 'missing'
    });
    
    req.user = decoded; // Attach user info to request object
    next(); // Proceed to the next middleware or route
  } catch (err) {
    console.log('Auth error:', err.message);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

module.exports = authenticateToken;
