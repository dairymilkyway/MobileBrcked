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

// Helper function to save notifications to AsyncStorage
const saveNotificationsToStorage = async (notifications: Notification[]) => {
  try {
    const userId = await AsyncStorage.getItem('userId');
    if (userId) {
      await AsyncStorage.setItem(`notifications_${userId}`, JSON.stringify(notifications));
    }
  } catch (error) {
    console.error('Error saving notifications to storage:', error);
  }
};

export const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    setNotifications: (state, action: PayloadAction<Notification[]>) => {
      state.notifications = action.payload;
      state.unreadCount = action.payload.filter(n => !n.read).length;
      state.isLoaded = true;
      
      // Save to AsyncStorage
      saveNotificationsToStorage(action.payload);
    },
    
    addNotification: (state, action: PayloadAction<Omit<Notification, 'id' | 'read' | 'createdAt'>>) => {
      // Check if this is an order update notification with orderId and status
      const isOrderUpdate = action.payload.data?.type === 'orderUpdate' && 
                            action.payload.data?.orderId && 
                            action.payload.data?.status;
      
      // If this is an order update, check for duplicates
      if (isOrderUpdate) {
        const orderId = action.payload.data?.orderId;
        const status = action.payload.data?.status;
        
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
            title: action.payload.title,
            body: action.payload.body,
            data: action.payload.data,
            createdAt: Date.now(), // Update timestamp
          };
          
          // Save to AsyncStorage
          saveNotificationsToStorage(state.notifications);
          
          // Don't increment unread count since it's just an update
          return;
        }
      }
      
      // Otherwise, add as a new notification
      const newNotification: Notification = {
        id: Date.now().toString(),
        ...action.payload,
        read: false,
        createdAt: Date.now(),
      };
      
      state.notifications.unshift(newNotification);
      state.unreadCount += 1;
      
      // Only keep the 20 most recent notifications
      if (state.notifications.length > 20) {
        state.notifications = state.notifications.slice(0, 20);
      }
      
      // Save to AsyncStorage
      saveNotificationsToStorage(state.notifications);
    },
    
    markAsRead: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find(n => n.id === action.payload);
      
      if (notification && !notification.read) {
        notification.read = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
        
        // Save to AsyncStorage
        saveNotificationsToStorage(state.notifications);
      }
    },
    
    markAllAsRead: (state) => {
      state.notifications.forEach(notification => {
        notification.read = true;
      });
      state.unreadCount = 0;
      
      // Save to AsyncStorage
      saveNotificationsToStorage(state.notifications);
    },
    
    clearNotifications: (state) => {
      state.notifications = [];
      state.unreadCount = 0;
      
      // Save to AsyncStorage (empty array)
      saveNotificationsToStorage([]);
    },
  },
});

// Helper function to load notifications from AsyncStorage
export const loadNotificationsFromStorage = async () => {
  try {
    const userId = await AsyncStorage.getItem('userId');
    if (userId) {
      const storedNotificationsStr = await AsyncStorage.getItem(`notifications_${userId}`);
      if (storedNotificationsStr) {
        const storedNotifications = JSON.parse(storedNotificationsStr) as Notification[];
        return storedNotifications;
      }
    }
    return null;
  } catch (error) {
    console.error('Error loading notifications from storage:', error);
    return null;
  }
};

export const {
  setNotifications,
  addNotification,
  markAsRead,
  markAllAsRead,
  clearNotifications,
} = notificationSlice.actions;

export default notificationSlice.reducer; 