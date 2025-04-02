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
        // First check if token already exists
        const existingToken = await Token.findOne({ where: { token } });
        if (existingToken) {
          // If it exists but has same userId, we can reuse it
          if (existingToken.userId === userData.id) {
            success = true;
            break;
          }
        }
        
        // Create new token record
        await Token.create({
          userId: userData.id,
          token,
          expiresAt,
          blacklisted: false
        });
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
    // First verify the token with JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Then check if it's in database and not blacklisted
    try {
      const tokenRecord = await Token.findOne({ where: { token } });
      if (tokenRecord && tokenRecord.blacklisted) {
        return null; // Token is blacklisted
      }
    } catch (dbError) {
      console.error('Database error checking token blacklist:', dbError);
      // If db check fails, rely on JWT verification alone
    }
    
    return decoded;
  } catch (error) {
    console.error('Error verifying token:', error);
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