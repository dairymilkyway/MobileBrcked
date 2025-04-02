import { API_BASE_URL } from '../env';
import { Product, ProductFormData } from '../types/product';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Helper function to get auth token from storage
const getToken = async () => {
  try {
    // Try getting token from both storage keys
    let token = await AsyncStorage.getItem('token');
    
    // If not found, try the userToken key as fallback
    if (!token) {
      console.log('Token not found in "token" key, checking "userToken"');
      token = await AsyncStorage.getItem('userToken');
      
      // If found in userToken, also set it in 'token' for future use
      if (token) {
        console.log('Token found in "userToken", saving to "token" key');
        await AsyncStorage.setItem('token', token);
      }
    }
    
    console.log('Retrieved token length:', token ? token.length : 0);
    return token;
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
};

// Get all products
export const getProducts = async (
  page = 1, 
  limit = 10, 
  sort?: string, 
  minPrice?: number, 
  maxPrice?: number
): Promise<{data: Product[], totalPages: number}> => {
  try {
    let url = `${API_BASE_URL}/products?page=${page}&limit=${limit}`;
    if (sort) url += `&sort=${sort}`;
    if (minPrice) url += `&minPrice=${minPrice}`;
    if (maxPrice) url += `&maxPrice=${maxPrice}`;
    
    const response = await fetch(url);
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to fetch products');
    }
    
    return {
      data: result.data,
      totalPages: result.totalPages
    };
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
};

// Get product by ID
export const getProductById = async (id: string): Promise<Product> => {
  try {
    const response = await fetch(`${API_BASE_URL}/products/${id}`);
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to fetch product');
    }
    
    return result.data;
  } catch (error) {
    console.error(`Error fetching product with id ${id}:`, error);
    throw error;
  }
};

// Handle authentication errors by clearing tokens
export const handleAuthError = async () => {
  try {
    console.log('Clearing auth tokens due to authentication error');
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userRole');
    return true;
  } catch (error) {
    console.error('Error clearing auth tokens:', error);
    return false;
  }
};

// Create a new product (Admin only)
export const createProduct = async (productData: ProductFormData): Promise<Product> => {
  try {
    const token = await getToken();
    if (!token) {
      throw new Error('Authentication required');
    }
    
    const formData = new FormData();
    
    // Add basic product data
    formData.append('name', productData.name);
    formData.append('price', productData.price);
    formData.append('stock', productData.stock);
    formData.append('description', productData.description);
    formData.append('category', productData.category);
    formData.append('pieces', productData.pieces);
    
    // Add images if present
    if (productData.images && productData.images.length > 0) {
      productData.images.forEach((image, index) => {
        // Create proper file object
        const imageFile = {
          uri: image.uri,
          type: 'image/jpeg',
          name: `image_${index}.jpg`,
        };
        
        // @ts-ignore - FormData accepts File objects
        formData.append('images', imageFile);
      });
    }
    
    console.log('Making API call to:', `${API_BASE_URL}/products`);
    console.log('Token:', token ? 'Present' : 'Missing');
    // Log first 10 characters of token for debugging
    console.log('Token preview:', token ? `${token.substring(0, 10)}...` : 'None');
    console.log('Form data fields:', Object.fromEntries(formData as any));

    const response = await fetch(`${API_BASE_URL}/products`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      body: formData,
    });
    
    const result = await response.json();
    console.log('API response status:', response.status);
    console.log('API response:', result);
    
    if (!response.ok) {
      // Check if authentication error
      if (response.status === 401 || response.status === 403) {
        await handleAuthError();
        throw new Error('Your session has expired. Please log in again.');
      }
      
      throw new Error(result.message || result.error || 'Failed to create product');
    }
    
    return result.data;
  } catch (error) {
    console.error('Error creating product:', error);
    throw error;
  }
};

// Update a product (Admin only)
export const updateProduct = async (id: string, productData: ProductFormData): Promise<Product> => {
  try {
    const token = await getToken();
    if (!token) {
      throw new Error('Authentication required');
    }
    
    const formData = new FormData();
    
    // Log our intentions for debugging
    console.log('Updating product, removeImages flag:', productData.removeImages);
    console.log('Existing images:', productData.existingImages);
    
    // Add basic product data
    formData.append('name', productData.name);
    formData.append('price', productData.price);
    formData.append('stock', productData.stock);
    formData.append('description', productData.description);
    formData.append('category', productData.category);
    formData.append('pieces', productData.pieces);
    
    // Handle existing images
    if (productData.existingImages) {
      // If we're updating existing images, we need to explicitly indicate we're removing some
      formData.append('removeImages', 'true');
      formData.append('existingImages', JSON.stringify(productData.existingImages));
      console.log('Keeping only these existing images:', productData.existingImages);
    } 
    // When user explicitly wants to remove all images
    else if (productData.removeImages) {
      formData.append('removeImages', 'true');
      console.log('Removing all existing images');
    }
    // Otherwise we keep all existing images
    
    // Add new images if present
    if (productData.images && productData.images.length > 0) {
      console.log('Adding new images:', productData.images.length);
      productData.images.forEach((image, index) => {
        // Create proper file object
        const imageFile = {
          uri: image.uri,
          type: 'image/jpeg',
          name: `image_${index}.jpg`,
        };
        
        // @ts-ignore - FormData accepts File objects
        formData.append('images', imageFile);
      });
    }
    
    console.log('Making API call to:', `${API_BASE_URL}/products/${id}`);
    console.log('Token:', token ? 'Present' : 'Missing');
    
    const response = await fetch(`${API_BASE_URL}/products/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      body: formData,
    });
    
    const result = await response.json();
    console.log('API response status:', response.status);
    console.log('API response:', result);
    
    if (!response.ok) {
      // Check if authentication error
      if (response.status === 401 || response.status === 403) {
        await handleAuthError();
        throw new Error('Your session has expired. Please log in again.');
      }
      
      throw new Error(result.message || result.error || 'Failed to update product');
    }
    
    return result.data;
  } catch (error) {
    console.error(`Error updating product with id ${id}:`, error);
    throw error;
  }
};

// Delete a product (Admin only)
export const deleteProduct = async (id: string): Promise<void> => {
  try {
    const token = await getToken();
    if (!token) {
      throw new Error('Authentication required');
    }
    
    console.log('Making delete API call to:', `${API_BASE_URL}/products/${id}`);
    console.log('Token preview:', token ? `${token.substring(0, 10)}...` : 'None');
    
    const response = await fetch(`${API_BASE_URL}/products/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });
    
    const result = await response.json();
    console.log('Delete API response status:', response.status);
    
    if (!response.ok) {
      // Check if authentication error
      if (response.status === 401 || response.status === 403) {
        await handleAuthError();
        throw new Error('Your session has expired. Please log in again.');
      }
      
      throw new Error(result.message || result.error || 'Failed to delete product');
    }
  } catch (error) {
    console.error(`Error deleting product with id ${id}:`, error);
    throw error;
  }
};

// Get user profile (For authenticated users)
export const getUserProfile = async () => {
  try {
    const token = await getToken();
    if (!token) {
      throw new Error('Authentication required');
    }
    
    console.log('Making API call to get user profile');
    console.log('Token preview:', token ? `${token.substring(0, 10)}...` : 'None');
    
    const response = await fetch(`${API_BASE_URL}/users/profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });
    
    const result = await response.json();
    console.log('API response status:', response.status);
    
    if (!response.ok) {
      // Check if authentication error
      if (response.status === 401 || response.status === 403) {
        await handleAuthError();
        throw new Error('Your session has expired. Please log in again.');
      }
      
      throw new Error(result.message || result.error || 'Failed to fetch user profile');
    }
    
    return result.data;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
};

// Logout user
export const logout = async () => {
  try {
    console.log('Logging out user');
    await handleAuthError(); // Reuse our auth error handler to clear tokens
    return true;
  } catch (error) {
    console.error('Error during logout:', error);
    return false;
  }
}; 