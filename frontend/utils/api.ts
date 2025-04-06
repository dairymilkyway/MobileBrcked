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

// Get product by ID - Alias for getProductById for compatibility
export const getProduct = getProductById;

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

// Login user 
export const loginUser = async (email: string, password: string) => {
  try {
    console.log('Attempting login with:', email);
    
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    
    const data = await response.json();
    console.log('Login response status:', response.status);
    console.log('Login response role:', data.role);
    
    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }
    
    // Store the token and role
    await AsyncStorage.setItem('token', data.token);
    await AsyncStorage.setItem('userToken', data.token); // For backward compatibility
    await AsyncStorage.setItem('userRole', data.role);
    
    return { 
      success: true, 
      role: data.role 
    };
  } catch (error) {
    console.error('Login failed:', error);
    // Clear any partial authentication state
    await handleAuthError();
    throw error;
  }
};

// Logout user
export const logout = async () => {
  try {
    const token = await AsyncStorage.getItem('userToken');
    const userId = await AsyncStorage.getItem('userId');
    
    if (token) {
      try {
        // Call the server-side logout endpoint to blacklist the token
        const response = await fetch(`${API_BASE_URL}/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('Logout response status:', response.status);
      } catch (error) {
        console.error('Error calling logout endpoint:', error);
        // Continue with local logout even if server-side logout fails
      }
    }
    
    // Clear all user data from AsyncStorage
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userRole');
    await AsyncStorage.removeItem('userEmail');
    await AsyncStorage.removeItem('userId');
    await AsyncStorage.removeItem('userName');
    
    // Clear notifications for this user
    if (userId) {
      await AsyncStorage.removeItem(`notifications_${userId}`);
    }
    
    // Clear any other user-specific data
    await AsyncStorage.removeItem('lastNotificationRegistration');
    await AsyncStorage.removeItem('pushToken');
    
    return true;
  } catch (error) {
    console.error('Error during logout:', error);
    return false;
  }
};

// Update user profile
export const updateUserProfile = async (userData: {
  username?: string;
  email?: string;
  currentPassword?: string;
  newPassword?: string;
} | FormData) => {
  try {
    const token = await getToken();
    if (!token) {
      throw new Error('Authentication required');
    }
    
    console.log('Making API call to update user profile');
    console.log('Token preview:', token ? `${token.substring(0, 10)}...` : 'None');
    
    // Check if userData is FormData
    const isFormData = userData instanceof FormData;
    
    const response = await fetch(`${API_BASE_URL}/users/profile`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        ... (!isFormData ? {'Content-Type': 'application/json'} : {}),
        'Accept': 'application/json',
      },
      body: isFormData ? userData : JSON.stringify(userData),
    });
    
    const result = await response.json();
    console.log('API response status:', response.status);
    
    if (!response.ok) {
      // Check if authentication error
      if (response.status === 401 || response.status === 403) {
        await handleAuthError();
        throw new Error('Your session has expired. Please log in again.');
      }
      
      throw new Error(result.message || result.error || 'Failed to update user profile');
    }
    
    return result.data;
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

// Fetch user notifications
export const fetchUserNotifications = async () => {
  try {
    const userToken = await AsyncStorage.getItem('userToken');
    
    if (!userToken) {
      console.log('No token available to fetch notifications');
      return { success: false, error: 'Not authenticated' };
    }
    
    console.log('Fetching user notifications');
    
    // First try to get from notification receipts API
    try {
      const receiptsResponse = await fetch(`${API_BASE_URL}/notifications/receipts?markAsRead=false`, {
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (receiptsResponse.ok) {
        const receiptsData = await receiptsResponse.json();
        
        if (receiptsData.success && receiptsData.data) {
          console.log(`Fetched ${receiptsData.data.length} notification receipts`);
          
          // Transform the notification receipts into the format expected by Redux
          const notifications = receiptsData.data.map((receipt: any) => ({
            id: receipt._id || `receipt-${receipt.orderId}-${Date.now()}`,
            title: 'Order Update',
            body: receipt.message || `Your order #${receipt.orderId} status has been updated to: ${receipt.status}`,
            read: receipt.isRead || false,
            createdAt: new Date(receipt.timestamp).getTime(),
            data: {
              orderId: receipt.orderId,
              status: receipt.status,
              type: 'orderUpdate',
              source: 'receipt',
              receiptId: receipt._id
            }
          }));
          
          return { success: true, data: notifications };
        }
      }
    } catch (error) {
      console.log('Error fetching from receipts API, falling back to orders history');
    }
    
    // If receipt API failed or returned no data, fall back to fetching from orders
    const ordersResponse = await fetch(`${API_BASE_URL}/orders`, {
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!ordersResponse.ok) {
      console.error('Failed to fetch orders for notifications');
      return { success: false, error: 'Failed to fetch orders' };
    }
    
    const ordersData = await ordersResponse.json();
    
    if (ordersData.success && ordersData.data) {
      console.log(`Fetched ${ordersData.data.length} orders to create notifications`);
      
      // Create notifications from orders - newest first
      const orders = ordersData.data.sort((a: any, b: any) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      
      const notifications = orders.map((order: any) => ({
        id: `order-${order.orderId}-${Date.now()}`,
        title: 'Order Update',
        body: `Your order #${order.orderId} status: ${order.status}`,
        read: true, // Mark as read since these are just for history
        createdAt: new Date(order.updatedAt).getTime(),
        data: {
          orderId: order.orderId,
          status: order.status,
          type: 'orderUpdate',
          source: 'order-history'
        }
      }));
      
      return { success: true, data: notifications };
    }
    
    return { success: false, error: 'No notifications found' };
  } catch (error) {
    console.error('Error fetching user notifications:', error);
    return { success: false, error: 'Failed to fetch notifications' };
  }
};

// Check if a user is eligible to review a product (must have purchased it)
export const checkReviewEligibility = async (productId: string) => {
  try {
    const token = await AsyncStorage.getItem('token');
    
    console.log('Token preview:', token ? `${token.substring(0, 10)}...` : 'None');
    
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${API_BASE_URL}/reviews/can-review/${productId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to check review eligibility' }));
      throw new Error(errorData.message || `Error ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error('Error checking review eligibility:', error);
    throw error;
  }
};

// Submit a new product review
export const submitProductReview = async (productId: string, rating: number, comment: string) => {
  try {
    const token = await AsyncStorage.getItem('token');
    
    console.log('Token preview:', token ? `${token.substring(0, 10)}...` : 'None');
    
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${API_BASE_URL}/reviews/create`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        productId,
        rating,
        comment
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to submit review' }));
      throw new Error(errorData.message || `Error ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error('Error submitting review:', error);
    throw error;
  }
};

// Update an existing product review
export const updateProductReview = async (reviewId: string, rating: number, comment: string) => {
  try {
    const token = await AsyncStorage.getItem('token');
    
    console.log('Token preview:', token ? `${token.substring(0, 10)}...` : 'None');
    
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${API_BASE_URL}/reviews/update/${reviewId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        rating,
        comment
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to update review' }));
      throw new Error(errorData.message || `Error ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error('Error updating review:', error);
    throw error;
  }
};

// Get user's reviews
export const getUserReviews = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    
    console.log('Token preview:', token ? `${token.substring(0, 10)}...` : 'None');
    
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${API_BASE_URL}/reviews/user`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to fetch user reviews' }));
      throw new Error(errorData.message || `Error ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching user reviews:', error);
    throw error;
  }
}; 