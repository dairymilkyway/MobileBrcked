const mongoose = require('mongoose');
const Product = require('../models/Product');

// Sample product data
const products = [
  // Minifigures
  {
    name: 'Batman Minifigure',
    price: 9.99,
    description: 'Classic Batman minifigure with cape and utility belt',
    category: 'Minifigure',
    image: 'https://m.media-amazon.com/images/I/71jX7YPPWVL._AC_UF1000,1000_QL80_.jpg',
    pieces: 1
  },
  {
    name: 'Astronaut Minifigure',
    price: 7.99,
    description: 'Space explorer minifigure with oxygen tank and helmet',
    category: 'Minifigure',
    image: 'https://cdn.rebrickable.com/media/thumbs/parts/elements/4547957.jpg/250x250p.jpg',
    pieces: 1
  },
  {
    name: 'Pirate Captain Minifigure',
    price: 8.99,
    description: 'Pirate captain with eye patch, hat and sword accessories',
    category: 'Minifigure',
    image: 'https://m.media-amazon.com/images/I/61m38acMLvL._AC_UF1000,1000_QL80_.jpg',
    pieces: 1
  },
  
  // Sets
  {
    name: 'City Police Station',
    price: 89.99,
    description: 'Complete police station with jail cells, 5 minifigures and vehicles',
    category: 'Set',
    image: 'https://www.lego.com/cdn/cs/set/assets/bltf829afe15b940424/60246.jpg',
    pieces: 743
  },
  {
    name: 'Spaceship Explorer',
    price: 129.99,
    description: 'Intergalactic spaceship with opening cockpit and retractable landing gear',
    category: 'Set',
    image: 'https://www.lego.com/cdn/cs/set/assets/blt5a0f73a09a9e484c/10497.png',
    pieces: 1254
  },
  {
    name: 'Medieval Castle',
    price: 149.99,
    description: 'Detailed castle with drawbridge, towers, and knights minifigures',
    category: 'Set',
    image: 'https://www.lego.com/cdn/cs/set/assets/blt20eb5ddb08279a27/10305.png',
    pieces: 4514
  },
  
  // Pieces
  {
    name: '2x4 Blue Brick',
    price: 0.99,
    description: 'Standard 2x4 blue building brick',
    category: 'Piece',
    image: 'https://m.media-amazon.com/images/I/51TxJMZ2s-L._AC_.jpg',
    pieces: 1
  },
  {
    name: 'Transparent Round 1x1',
    price: 0.59,
    description: 'Small transparent round piece, perfect for lights or decorations',
    category: 'Piece',
    image: 'https://www.bricklink.com/PL/3005.jpg',
    pieces: 1
  },
  {
    name: 'Curved Red Slope 2x2',
    price: 0.79,
    description: 'Curved red roof piece for architectural designs',
    category: 'Piece',
    image: 'https://www.bricklink.com/PL/3063.jpg',
    pieces: 1
  }
];

// Seed function
const seedProducts = async () => {
  try {
    // Clear existing products
    await Product.deleteMany({});
    console.log('Products collection cleared');
    
    // Insert new products
    await Product.insertMany(products);
    console.log(`${products.length} products seeded successfully`);
    
  } catch (error) {
    console.error('Error seeding products:', error);
    throw error; // Re-throw to handle in the main function
  }
};

// Connect to MongoDB and run seeder
const seedDB = async () => {
    try {
      console.log('Attempting to connect to MongoDB...');
      // Using MongoDB Atlas connection string
      await mongoose.connect('mongodb+srv://mongodebisch:7lEGY6RKLrw0M9Ql@cluster0.2qg9m.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');
      console.log('MongoDB Atlas connected successfully');
      
      await seedProducts();
      
      // Close connection after seeding
      await mongoose.connection.close();
      console.log('Database connection closed');
    } catch (error) {
      console.error('Error in database operation:', error.message);
      if (error.name === 'MongoNetworkError') {
        console.error('Could not connect to MongoDB. Is the database running?');
      }
      process.exit(1);
    }
};

// Execute the seeder
seedDB();

// Export for potential use in other files
module.exports = { seedProducts };
