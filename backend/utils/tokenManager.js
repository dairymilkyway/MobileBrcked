const jwt = require('jsonwebtoken');
const Token = require('../models/Token');

/**
 * Generate and store a JWT token
 * @param {Object} userData User data to include in token
 * @param {string} expiresIn Token expiration period
 * @returns {string} Generated token
 */
exports.generateToken = async (userData, expiresIn = '24h') => {
  try {
    // Ensure userData.id is a string
    if (userData.id && typeof userData.id !== 'string') {
      userData.id = String(userData.id);
    }
    
    // Generate JWT token
    const token = jwt.sign(userData, process.env.JWT_SECRET, { expiresIn });
    
    // Calculate expiration date
    const decoded = jwt.decode(token);
    const expiresAt = new Date(decoded.exp * 1000);
    
    // Store token in SQLite - retry up to 3 times
    let attempts = 0;
    let success = false;
    let lastError = null;
    
    while (attempts < 3 && !success) {
      try {
        // Check if user already has a token
        const existingUserToken = await Token.findOne({ 
          where: { 
            userId: userData.id,
            blacklisted: false
          } 
        });
        
        if (existingUserToken) {
          // Update the existing token record instead of creating a new one
          await Token.update({
            token,
            expiresAt,
            email: userData.email
          }, {
            where: { id: existingUserToken.id }
          });
          console.log(`Updated existing token for user ${userData.id}`);
        } else {
          // Create new token record if no active token exists
          await Token.create({
            userId: userData.id,
            email: userData.email,
            token,
            expiresAt,
            blacklisted: false
          });
          console.log(`Created new token for user ${userData.id}`);
        }
        success = true;
      } catch (error) {
        lastError = error;
        attempts++;
        if (attempts < 3) {
          // Wait 100ms before retrying
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }
    
    if (!success) {
      console.error('Failed to store token after multiple attempts:', lastError);
      // Return token anyway since JWT verification can still work
    }
    
    return token;
  } catch (error) {
    console.error('Error generating token:', error);
    throw error;
  }
};

/**
 * Verify a token and check if it's blacklisted
 * @param {string} token JWT token to verify
 * @returns {Object|null} Decoded token if valid, null otherwise
 */
exports.verifyToken = async (token) => {
  try {
    console.log('verifyToken: Starting token verification');
    
    // First verify the token with JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('verifyToken: JWT verification passed');
    
    // Then check if it's in database and not blacklisted
    try {
      const tokenRecord = await Token.findOne({ where: { token } });
      
      if (tokenRecord) {
        console.log('verifyToken: Token found in database, blacklisted:', tokenRecord.blacklisted);
        if (tokenRecord.blacklisted) {
          return null; // Token is blacklisted
        }
      } else {
        console.log('verifyToken: Token not found in database, but JWT verification passed');
        // If token is not in database but JWT verifies, we'll accept it
        // This helps if database had issues during token creation
      }
    } catch (dbError) {
      console.error('verifyToken: Database error checking token blacklist:', dbError);
      // If db check fails, rely on JWT verification alone
      console.log('verifyToken: Falling back to JWT verification only');
    }
    
    // Add debug info before returning
    console.log('verifyToken: Token verification successful, decoded token contains:', {
      id: decoded.id || 'missing',
      role: decoded.role || 'missing',
      exp: decoded.exp ? new Date(decoded.exp * 1000).toISOString() : 'missing'
    });
    
    return decoded;
  } catch (error) {
    console.error('verifyToken: Error verifying token:', error.message);
    return null;
  }
};

/**
 * Blacklist a token to invalidate it
 * @param {string} token JWT token to blacklist
 * @returns {boolean} Success status
 */
exports.blacklistToken = async (token) => {
  try {
    // First check if token exists in database
    const tokenRecord = await Token.findOne({ where: { token } });
    
    if (tokenRecord) {
      // Update existing record
      await Token.update(
        { blacklisted: true },
        { where: { token } }
      );
    } else {
      // Create a new blacklisted record
      try {
        const decoded = jwt.decode(token);
        if (decoded && decoded.exp) {
          await Token.create({
            userId: decoded.id || 'unknown',
            email: decoded.email || null,
            token,
            expiresAt: new Date(decoded.exp * 1000),
            blacklisted: true
          });
        }
      } catch (error) {
        console.error('Error creating blacklist record:', error);
      }
    }
    return true;
  } catch (error) {
    console.error('Error blacklisting token:', error);
    return false;
  }
};

/**
 * Clean up expired tokens from the database
 */
exports.cleanupExpiredTokens = async () => {
  try {
    await Token.destroy({
      where: {
        expiresAt: { [require('sequelize').Op.lt]: new Date() }
      }
    });
    console.log('Expired tokens cleaned up');
  } catch (error) {
    console.error('Error cleaning up expired tokens:', error);
  }
}; 