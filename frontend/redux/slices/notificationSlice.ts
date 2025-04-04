import { createSlice, PayloadAction } from '@reduxjs/toolkit';

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
}

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
};

export const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
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
  addNotification,
  markAsRead,
  markAllAsRead,
  clearNotifications,
} = notificationSlice.actions;

export default notificationSlice.reducer; 