// Script to rebuild the SQLite database from scratch
const fs = require('fs');
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');

async function rebuildDatabase() {
  try {
    console.log('Rebuilding SQLite database for data storage...');
    
    // Drop the existing database file if it exists
    const dbPath = path.join(__dirname, 'database.sqlite');
    if (fs.existsSync(dbPath)) {
      try {
        console.log('Removing existing database file...');
        fs.unlinkSync(dbPath);
        console.log('Existing database file removed.');
      } catch (err) {
        console.error('Error removing database file:', err);
      }
    }
    
    // Create a new sequelize instance
    const sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: dbPath,
      logging: false
    });
    
    // Re-initialize the database
    const Token = sequelize.define('Token', {
      userId: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'The MongoDB user ID'
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
        defaultValue: false,
        comment: 'Whether this token has been invalidated'
      }
    });
    
    // Also define the Cart model
    const Cart = sequelize.define('Cart', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      userId: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'The MongoDB user ID'
      },
      productId: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'The MongoDB product ID'
      },
      productName: {
        type: DataTypes.STRING,
        allowNull: false
      },
      price: {
        type: DataTypes.FLOAT,
        allowNull: false
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      imageURL: {
        type: DataTypes.STRING,
        allowNull: true
      }
    });
    
    // Force sync (recreates tables)
    await Token.sync({ force: true });
    await Cart.sync({ force: true });
    
    // Create indexes for faster lookups
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_token ON Tokens (token);
      CREATE INDEX IF NOT EXISTS idx_userId ON Tokens (userId);
      CREATE INDEX IF NOT EXISTS idx_expiresAt ON Tokens (expiresAt);
      CREATE INDEX IF NOT EXISTS idx_email ON Tokens (email);
      CREATE INDEX IF NOT EXISTS idx_cart_userId ON Carts (userId);
      CREATE INDEX IF NOT EXISTS idx_cart_productId ON Carts (productId);
    `);
    
    console.log('✅ SQLite database rebuilt successfully');
    
    // Close connection
    await sequelize.close();
  } catch (error) {
    console.error('❌ Error rebuilding SQLite database:', error);
  }
}

// Execute if this script is run directly
if (require.main === module) {
  rebuildDatabase();
} else {
  // Export for use in other files
  module.exports = rebuildDatabase;
} 