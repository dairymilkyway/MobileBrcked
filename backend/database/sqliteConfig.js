const { Sequelize } = require('sequelize');
const path = require('path');

// Initialize SQLite database connection
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'database.sqlite'),
  logging: false,
  // Add connection pool configuration for better handling
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  // Better handling of connections
  retry: {
    max: 3
  }
});

// Test the connection
(async () => {
  try {
    await sequelize.authenticate();
    console.log('SQLite connection has been established successfully.');
  } catch (error) {
    console.error('Unable to connect to the SQLite database:', error);
  }
})();

module.exports = sequelize; 