import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@/env';

// Define the types needed for orders
export interface CartItem {
  id: number;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  imageURL: string | null;
  selected?: boolean;
}

export interface ShippingDetails {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
}

export interface Order {
  _id?: string;
  orderId: string;
  userId?: string;
  items: CartItem[];
  shippingDetails: ShippingDetails;
  paymentMethod: 'gcash' | 'cod' | 'credit_card';
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
  deliveredAt?: string;
  cancelledAt?: string;
}

export interface OrdersState {
  orders: Order[];
  selectedOrder: Order | null;
  loading: boolean;
  error: string | null;
  success: boolean;
}

// Initial state
const initialState: OrdersState = {
  orders: [],
  selectedOrder: null,
  loading: false,
  error: null,
  success: false,
};

// Helper function to get token
async function getToken(): Promise<string | null> {
  return await AsyncStorage.getItem('token');
}

// Async Thunks
export const fetchOrders = createAsyncThunk(
  'orders/fetchOrders',
  async (_, { rejectWithValue }) => {
    try {
      const token = await getToken();
      
      if (!token) {
        return rejectWithValue('Authentication token not found');
      }
      
      const response = await axios.get(`${API_BASE_URL}/orders`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        return response.data.data;
      } else {
        return rejectWithValue(response.data.message || 'Failed to fetch orders');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to fetch orders';
      return rejectWithValue(message);
    }
  }
);

export const fetchOrderById = createAsyncThunk(
  'orders/fetchOrderById',
  async (orderId: string, { rejectWithValue }) => {
    try {
      const token = await getToken();
      
      if (!token) {
        return rejectWithValue('Authentication token not found');
      }
      
      const response = await axios.get(`${API_BASE_URL}/orders/${orderId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        return response.data.data;
      } else {
        return rejectWithValue(response.data.message || 'Failed to fetch order details');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to fetch order details';
      return rejectWithValue(message);
    }
  }
);

export const createOrder = createAsyncThunk(
  'orders/createOrder',
  async (orderData: Omit<Order, '_id'>, { rejectWithValue }) => {
    try {
      const token = await getToken();
      
      if (!token) {
        return rejectWithValue('Authentication token not found');
      }
      
      const response = await axios.post(`${API_BASE_URL}/orders/create`, orderData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success) {
        return response.data.data;
      } else {
        return rejectWithValue(response.data.message || 'Failed to create order');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to create order';
      return rejectWithValue(message);
    }
  }
);

export const fetchAdminOrders = createAsyncThunk(
  'orders/fetchAdminOrders',
  async (_, { rejectWithValue }) => {
    try {
      const token = await getToken();
      
      if (!token) {
        return rejectWithValue('Authentication token not found');
      }
      
      const response = await axios.get(`${API_BASE_URL}/orders/admin`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        return response.data.data;
      } else {
        return rejectWithValue(response.data.message || 'Failed to fetch admin orders');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to fetch admin orders';
      return rejectWithValue(message);
    }
  }
);

export const updateOrderStatus = createAsyncThunk(
  'orders/updateOrderStatus',
  async ({ orderId, status }: { orderId: string, status: Order['status'] }, { rejectWithValue }) => {
    try {
      const token = await getToken();
      
      if (!token) {
        return rejectWithValue('Authentication token not found');
      }
      
      const response = await axios.patch(
        `${API_BASE_URL}/orders/admin/status/${orderId}`,
        { status },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.data.success) {
        return {
          orderId,
          status,
          previousStatus: response.data.previousStatus,
          statusChanged: response.data.statusChanged,
        };
      } else {
        return rejectWithValue(response.data.message || 'Failed to update order status');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to update order status';
      return rejectWithValue(message);
    }
  }
);

// Order Slice
const orderSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    resetOrderState: (state) => {
      // Fully reset order creation state
      state.error = null;
      state.success = false;
      state.selectedOrder = null; // Ensure selected order is cleared
      state.loading = false; // Reset loading state
    },
    setSelectedOrder: (state, action: PayloadAction<Order | null>) => {
      state.selectedOrder = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Orders
      .addCase(fetchOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.orders = action.payload;
        state.error = null;
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch Order by ID
      .addCase(fetchOrderById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrderById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedOrder = action.payload;
        state.error = null;
      })
      .addCase(fetchOrderById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Create Order
      .addCase(createOrder.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(createOrder.fulfilled, (state, action) => {
        state.loading = false;
        state.orders = [...state.orders, action.payload];
        state.selectedOrder = action.payload;
        state.success = true;
        state.error = null;
      })
      .addCase(createOrder.rejected, (state, action) => {
        state.loading = false;
        state.success = false;
        state.error = action.payload as string;
      })
      
      // Fetch Admin Orders
      .addCase(fetchAdminOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAdminOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.orders = action.payload;
        state.error = null;
      })
      .addCase(fetchAdminOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Update Order Status
      .addCase(updateOrderStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(updateOrderStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.error = null;
        
        // Update order status in the orders array
        const { orderId, status } = action.payload;
        state.orders = state.orders.map(order => 
          order.orderId === orderId ? { ...order, status } : order
        );
        
        // Update selected order if it's the one being updated
        if (state.selectedOrder && state.selectedOrder.orderId === orderId) {
          state.selectedOrder = { ...state.selectedOrder, status };
        }
      })
      .addCase(updateOrderStatus.rejected, (state, action) => {
        state.loading = false;
        state.success = false;
        state.error = action.payload as string;
      });
  },
});

export const { resetOrderState, setSelectedOrder } = orderSlice.actions;

export default orderSlice.reducer;
