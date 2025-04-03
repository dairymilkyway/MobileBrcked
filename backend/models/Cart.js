const { DataTypes } = require('sequelize');
const sequelize = require('../database/sqliteConfig');

// Define the Cart model for SQLite
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
}, {
  indexes: [
    // Composite index for userId and productId
    {
      unique: false,
      fields: ['userId', 'productId']
    }
  ]
});

// Sync model with database on import
(async () => {
  try {
    await Cart.sync({ alter: true });
    console.log('✅ Cart model synchronized successfully');
  } catch (error) {
    console.error('❌ Error synchronizing Cart model:', error);
  }
})();

module.exports = Cart; 