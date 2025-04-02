const mongoose = require('mongoose');
const Product = require('../models/Product');

// Sample product data with prices in Philippine Pesos (₱)
const products = [
  // Minifigures
  {
    name: 'Batman Minifigure',
    price: 499.99, // Price in PHP Pesos
    description: 'Classic Batman minifigure with cape and utility belt',
    category: 'Minifigure',
    imageURL: [
      'https://placehold.co/400x400/DA291C/FFD700/png',
      'https://placehold.co/400x400/FFD700/DA291C/png'
    ],
    pieces: 1,
    stock: 25
  },
  {
    name: 'Astronaut Minifigure',
    price: 399.99, // Price in PHP Pesos
    description: 'Space explorer minifigure with oxygen tank and helmet',
    category: 'Minifigure',
    imageURL: [
      'https://placehold.co/400x400/DA291C/FFD700/png',
      'https://placehold.co/400x400/FFD700/DA291C/png',
      'https://placehold.co/400x400/DA291C/FFD700/png'
    ],
    pieces: 1,
    stock: 15
  },
  {
    name: 'Pirate Captain Minifigure',
    price: 449.99, // Price in PHP Pesos
    description: 'Pirate captain with eye patch, hat and sword accessories',
    category: 'Minifigure',
    imageURL: [
      'https://placehold.co/400x400/DA291C/FFD700/png',
      'https://placehold.co/400x400/FFD700/DA291C/png',
      'https://placehold.co/400x400/DA291C/FFD700/png'
    ],
    pieces: 1,
    stock: 10
  },
  
  // Sets
  {
    name: 'City Police Station',
    price: 4499.99, // Price in PHP Pesos
    description: 'Complete police station with jail cells, 5 minifigures and vehicles',
    category: 'Set',
    imageURL: [
      'https://placehold.co/400x400/DA291C/FFD700/png',
      'https://placehold.co/400x400/FFD700/DA291C/png',
      'https://placehold.co/400x400/DA291C/FFD700/png'
    ],
    pieces: 743,
    stock: 8
  },
  {
    name: 'Spaceship Explorer',
    price: 6499.99, // Price in PHP Pesos
    description: 'Intergalactic spaceship with opening cockpit and retractable landing gear',
    category: 'Set',
    imageURL: [
      'https://placehold.co/400x400/DA291C/FFD700/png',
      'https://placehold.co/400x400/FFD700/DA291C/png',
      'https://placehold.co/400x400/DA291C/FFD700/png'
    ],
    pieces: 1254,
    stock: 5
  },
  {
    name: 'Medieval Castle',
    price: 7499.99, // Price in PHP Pesos
    description: 'Detailed castle with drawbridge, towers, and knights minifigures',
    category: 'Set',
    imageURL: [
      'https://placehold.co/400x400/DA291C/FFD700/png',
      'https://placehold.co/400x400/FFD700/DA291C/png',
      'https://placehold.co/400x400/DA291C/FFD700/png'
    ],
    pieces: 4514,
    stock: 3
  },
  
  // Pieces
  {
    name: '2x4 Blue Brick',
    price: 49.99, // Price in PHP Pesos
    description: 'Standard 2x4 blue building brick',
    category: 'Piece',
    imageURL: [
      'https://placehold.co/400x400/DA291C/FFD700/png',
      'https://placehold.co/400x400/FFD700/DA291C/png',
      'https://placehold.co/400x400/DA291C/FFD700/png'
    ],
    pieces: 1,
    stock: 250
  },
  {
    name: 'Transparent Round 1x1',
    price: 29.99, // Price in PHP Pesos
    description: 'Small transparent round piece, perfect for lights or decorations',
    category: 'Piece',
    imageURL: [
      'https://placehold.co/400x400/DA291C/FFD700/png',
      'https://placehold.co/400x400/FFD700/DA291C/png',
      'https://placehold.co/400x400/DA291C/FFD700/png'
    ],
    pieces: 1,
    stock: 300
  },
  {
    name: 'Curved Red Slope 2x2',
    price: 39.99, // Price in PHP Pesos
    description: 'Curved red roof piece for architectural designs',
    category: 'Piece',
    imageURL: [
      'https://placehold.co/400x400/DA291C/FFD700/png',
      'https://placehold.co/400x400/FFD700/DA291C/png',
      'https://placehold.co/400x400/DA291C/FFD700/png'
    ],
    pieces: 1,
    stock: 180
  },
  
  // Additional Products
  // More Minifigures
  {
    name: 'Wizard Minifigure',
    price: 599.99, // Price in PHP Pesos
    description: 'Magical wizard with staff, hat and spellbook',
    category: 'Minifigure',
    imageURL: [
      'https://placehold.co/400x400/DA291C/FFD700/png',
      'https://placehold.co/400x400/FFD700/DA291C/png',
      'https://placehold.co/400x400/DA291C/FFD700/png'
    ],
    pieces: 1,
    stock: 12
  },
  {
    name: 'Robot Minifigure',
    price: 424.99, // Price in PHP Pesos
    description: 'Futuristic robot with articulated limbs and light-up eyes',
    category: 'Minifigure',
    imageURL: [
      'https://placehold.co/400x400/DA291C/FFD700/png',
      'https://placehold.co/400x400/FFD700/DA291C/png',
      'https://placehold.co/400x400/DA291C/FFD700/png'
    ],
    pieces: 1,
    stock: 20
  },
  
  // More Sets
  {
    name: 'Treehouse Retreat',
    price: 9999.99, // Price in PHP Pesos
    description: 'Detailed treehouse with three cabins, working elevator and botanical elements',
    category: 'Set',
    imageURL: [
      'https://placehold.co/400x400/DA291C/FFD700/png',
      'https://placehold.co/400x400/FFD700/DA291C/png',
      'https://placehold.co/400x400/DA291C/FFD700/png'
    ],
    pieces: 3036,
    stock: 4
  },
  {
    name: 'Vintage Car',
    price: 3999.99, // Price in PHP Pesos
    description: 'Classic vintage car model with opening doors, trunk and detailed engine',
    category: 'Set',
    imageURL: [
      'https://placehold.co/400x400/DA291C/FFD700/png',
      'https://placehold.co/400x400/FFD700/DA291C/png',
      'https://placehold.co/400x400/DA291C/FFD700/png'
    ],
    pieces: 1471,
    stock: 9
  },
  
  // More Pieces
  {
    name: 'Green Base Plate 32x32',
    price: 399.99, // Price in PHP Pesos
    description: 'Large green base plate, perfect for landscapes and gardens',
    category: 'Piece',
    imageURL: [
      'https://placehold.co/400x400/DA291C/FFD700/png',
      'https://placehold.co/400x400/FFD700/DA291C/png',
      'https://placehold.co/400x400/DA291C/FFD700/png'
    ],
    pieces: 1,
    stock: 40
  },
  {
    name: 'Door Frame with Door',
    price: 124.99, // Price in PHP Pesos
    description: 'Complete door assembly with frame, perfect for buildings',
    category: 'Piece',
    imageURL: [
      'https://placehold.co/400x400/DA291C/FFD700/png',
      'https://placehold.co/400x400/FFD700/DA291C/png',
      'https://placehold.co/400x400/DA291C/FFD700/png'
    ],es: 2,
    stock: 75
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
