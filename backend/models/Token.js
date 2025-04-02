const { DataTypes } = require('sequelize');
const sequelize = require('../database/sqliteConfig');

// Define the Token model
const Token = sequelize.define('Token', {
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'The MongoDB user ID'
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

// Sync model with database on import
(async () => {
  try {
    await Token.sync({ alter: true });
    console.log('✅ Token model synchronized successfully');
  } catch (error) {
    console.error('❌ Error synchronizing Token model:', error);
  }
})();

module.exports = Token; 