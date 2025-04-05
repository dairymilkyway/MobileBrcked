import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Notification {
  id: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: number;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoaded: boolean;
}

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  isLoaded: false,
};

export const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    setNotifications: (state, action: PayloadAction<Notification[]>) => {
      state.notifications = action.payload;
      state.unreadCount = action.payload.filter(n => !n.read).length;
      state.isLoaded = true;
      // Storage saving removed to prevent Proxy handler errors
    },
    
    addNotification: (state, action: PayloadAction<Omit<Notification, 'id' | 'read' | 'createdAt'>>) => {
      try {
        // Ensure we have valid title and body
        const title = action.payload.title || 'Notification';
        const body = action.payload.body || '';
        
        // Safely handle data object
        let safeData: Record<string, any> | undefined = undefined;
        if (action.payload.data) {
          try {
            // Create a safe copy of the data by serializing and deserializing
            safeData = JSON.parse(JSON.stringify(action.payload.data));
          } catch (error) {
            console.error('Error processing notification data:', error);
            
            // Create a minimal data object if serialization fails
            if (action.payload.data.orderId) {
              safeData = { orderId: action.payload.data.orderId };
              
              // Add other important properties if they exist
              if (action.payload.data.type) {
                safeData.type = String(action.payload.data.type);
              }
              if (action.payload.data.status) {
                safeData.status = String(action.payload.data.status);
              }
            }
          }
        }
        
        // Check if this is an order update notification with orderId and status
        const isOrderUpdate = 
          safeData !== undefined && 
          safeData.type === 'orderUpdate' && 
          safeData.orderId && 
          safeData.status;
        
        // If this is an order update, check for duplicates
        if (isOrderUpdate && safeData) {
          const orderId = safeData.orderId;
          const status = safeData.status;
          
          // Look for existing notifications for the same order with the same status
          const existingNotificationIndex = state.notifications.findIndex(n => 
            n.data?.orderId === orderId && 
            n.data?.status === status &&
            n.data?.type === 'orderUpdate'
          );
          
          if (existingNotificationIndex !== -1) {
            // Update the existing notification instead of adding a new one
            state.notifications[existingNotificationIndex] = {
              ...state.notifications[existingNotificationIndex],
              title,
              body,
              data: safeData,
              createdAt: Date.now(), // Update timestamp
            };
            
            // Don't increment unread count since it's just an update
            return;
          }
        }
        
        // Generate a unique ID using timestamp and a random number for uniqueness
        const uniqueId = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        
        // Create a new notification with the sanitized data
        const newNotification: Notification = {
          id: uniqueId,
          title,
          body,
          data: safeData,
          read: false,
          createdAt: Date.now(),
        };
        
        // Add the notification to the state
        state.notifications.unshift(newNotification);
        state.unreadCount += 1;
        
        // Only keep the 20 most recent notifications
        if (state.notifications.length > 20) {
          state.notifications = state.notifications.slice(0, 20);
        }
      } catch (error) {
        console.error('Error in addNotification reducer:', error);
      }
    },
    
    markAsRead: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find(n => n.id === action.payload);
      
      if (notification && !notification.read) {
        notification.read = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    
    markAllAsRead: (state) => {
      state.notifications.forEach(notification => {
        notification.read = true;
      });
      state.unreadCount = 0;
    },
    
    clearNotifications: (state) => {
      state.notifications = [];
      state.unreadCount = 0;
    },
  },
});

export const { 
  setNotifications, 
  addNotification, 
  markAsRead, 
  markAllAsRead, 
  clearNotifications 
} = notificationSlice.actions;

export default notificationSlice.reducer; 