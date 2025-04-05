const User = require('../models/User');

/**
 * Cleanup stale push tokens that haven't been used in the past 30 days
 */
const cleanupStaleTokens = async () => {
  try {
    console.log('Running scheduled cleanup of stale push tokens...');
    
    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Find users with push tokens
    const users = await User.find({
      // Remove the filter to find all users, as we need to initialize missing pushTokens arrays
    });
    
    let totalRemoved = 0;
    let usersUpdated = 0;
    let usersInitialized = 0;
    
    for (const user of users) {
      // Initialize pushTokens if it doesn't exist
      if (!Array.isArray(user.pushTokens)) {
        user.pushTokens = [];
        await user.save();
        usersInitialized++;
        continue; // Skip to next user since we just initialized an empty array
      }
      
      // Skip if there are no tokens
      if (user.pushTokens.length === 0) {
        continue;
      }
      
      const originalCount = user.pushTokens.length;
      
      // Filter out tokens older than 30 days and ensure no null items
      user.pushTokens = user.pushTokens.filter(token => 
        token && 
        token.lastUsed && 
        new Date(token.lastUsed) > thirtyDaysAgo
      );
      
      // Only save if we removed tokens
      if (user.pushTokens.length !== originalCount) {
        await user.save();
        totalRemoved += (originalCount - user.pushTokens.length);
        usersUpdated++;
      }
    }
    
    console.log(`Cleanup complete: Removed ${totalRemoved} stale push tokens from ${usersUpdated} users`);
    if (usersInitialized > 0) {
      console.log(`Initialized empty pushTokens array for ${usersInitialized} users`);
    }
    
    return { totalRemoved, usersUpdated, usersInitialized };
  } catch (error) {
    console.error('Error during scheduled token cleanup:', error);
  }
};

/**
 * Schedule token cleanup to run daily at midnight
 */
const scheduleTokenCleanup = () => {
  // Run cleanup once at startup
  cleanupStaleTokens();
  
  // Get current time
  const now = new Date();
  
  // Calculate time until midnight
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const timeUntilMidnight = midnight.getTime() - now.getTime();
  
  // Schedule first run at midnight
  setTimeout(() => {
    // Run cleanup
    cleanupStaleTokens();
    
    // Then schedule to run every 24 hours
    setInterval(cleanupStaleTokens, 24 * 60 * 60 * 1000);
  }, timeUntilMidnight);
  
  console.log(`Scheduled token cleanup to run in ${Math.round(timeUntilMidnight / 3600000)} hours and then daily`);
};

module.exports = {
  cleanupStaleTokens,
  scheduleTokenCleanup
}; 