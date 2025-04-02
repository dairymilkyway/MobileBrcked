# Brcked Mobile Application

A mobile application with JWT authentication using MongoDB as the primary database and SQLite for token storage.

## Architecture

This application follows a hybrid database approach:
- **MongoDB**: Primary database for user data, products, and business logic
- **SQLite**: Local database for JWT token storage and management

## Features

- User authentication with JWT tokens
- Token blacklisting for secure logout
- Automatic cleanup of expired tokens
- MongoDB for primary data storage
- SQLite for token management

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- MongoDB database (local or Atlas)
- NPM or Yarn

### Installation

1. Clone the repository:
```
git clone https://github.com/yourusername/brcked-mobile.git
cd brcked-mobile
```

2. Install root dependencies:
```
npm install
```

3. Install backend dependencies:
```
cd backend
npm install
cd ..
```

4. Install frontend dependencies:
```
cd frontend
npm install
cd ..
```

5. Set up environment variables:
   - Create a `.env` file in the backend directory with the following variables:
```
PORT=9000
MONGO_URI=mongodb://localhost:27017/brcked-mobile
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

6. Initialize the SQLite database:
```
npm run init-db
```

### Running the Application

Start both backend and frontend:
```
npm start
```

Or run them separately:
```
# Backend only
npm run backend

# Frontend only
npm run frontend
```

## API Endpoints

### Authentication
- `POST /api/register` - Register a new user
- `POST /api/login` - Login and get a JWT token
- `POST /api/logout` - Logout and blacklist the token

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get a product by ID
- `POST /api/products` - Create a new product (admin only)
- `PUT /api/products/:id` - Update a product (admin only)
- `DELETE /api/products/:id` - Delete a product (admin only)

### User
- `GET /api/profile` - Get user profile (authenticated)
- `GET /api/admin/data` - Get admin data (admin only)

## Token Management

The application uses SQLite to store and manage JWT tokens. This provides several benefits:
- Ability to invalidate tokens on logout
- Protection against token replay attacks
- Automatic cleanup of expired tokens

## License

MIT 