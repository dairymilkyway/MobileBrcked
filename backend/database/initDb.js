// Initialize SQLite database for token storage
const sequelize = require('./sqliteConfig');
const { DataTypes } = require('sequelize');

async function initializeDatabase() {
  try {
    console.log('Initializing SQLite database for token storage...');
    
    // Define the Token model
    const Token = sequelize.define('Token', {
      userId: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'The MongoDB user ID'
      },
      token: {
        type: DataTypes.STRING,
        allowNull: false
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      blacklisted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Whether this token has been invalidated'
      }
    });
    
    // Sync the model with the database - using alter:true to add any missing columns
    await Token.sync({ alter: true });
    
    // Create indexes for faster lookups
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_token ON Tokens (token);
      CREATE INDEX IF NOT EXISTS idx_userId ON Tokens (userId);
      CREATE INDEX IF NOT EXISTS idx_expiresAt ON Tokens (expiresAt);
    `);
    
    console.log('✅ SQLite database initialized successfully');
    return Token;
  } catch (error) {
    console.error('❌ Error initializing SQLite database:', error);
    throw error;
  }
}

// Execute if this script is run directly
if (require.main === module) {
  initializeDatabase();
} else {
  // Export for use in other files
  module.exports = initializeDatabase;
} 