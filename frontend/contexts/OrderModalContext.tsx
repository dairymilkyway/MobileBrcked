import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import OrderDetailsModal from '@/components/OrderDetailsModal';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import * as Notifications from 'expo-notifications';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface OrderModalContextType {
  showOrderModal: (orderId: string) => void;
  hideOrderModal: () => void;
}

const OrderModalContext = createContext<OrderModalContextType | undefined>(undefined);

export const useOrderModal = () => {
  const context = useContext(OrderModalContext);
  if (!context) {
    throw new Error('useOrderModal must be used within an OrderModalProvider');
  }
  return context;
};

// Define interface for pending orders
interface PendingOrderModal {
  orderId: string;
  status: string;
  timestamp: number;
  showModal: boolean;
}

export const OrderModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const appState = useRef(AppState.currentState);
  const modalOpenedTimestamp = useRef<number | null>(null);
  
  // Access the notifications from Redux to check for order updates
  const notifications = useSelector((state: RootState) => state.notifications.notifications);
  
  // Check for pending order modals saved while app was in background
  useEffect(() => {
    const checkPendingOrderModals = async () => {
      try {
        const pendingOrdersString = await AsyncStorage.getItem('pendingOrderModals');
        if (pendingOrdersString) {
          const pendingOrders = JSON.parse(pendingOrdersString);
          console.log('Found pending order modals:', pendingOrders);
          
          // If there are any pending orders, show the most recent one
          if (pendingOrders.length > 0) {
            // Sort by timestamp (newest first)
            const typedPendingOrders = pendingOrders as PendingOrderModal[];
            typedPendingOrders.sort((a, b) => b.timestamp - a.timestamp);
            
            // Show the most recent order
            const mostRecentOrder = typedPendingOrders[0];
            console.log('Showing most recent pending order modal:', mostRecentOrder);
            
            // Wait a second to make sure the app is fully initialized
            setTimeout(() => {
              showOrderModal(mostRecentOrder.orderId);
            }, 1000);
            
            // Remove all pending orders
            await AsyncStorage.removeItem('pendingOrderModals');
          }
        }
      } catch (error) {
        console.error('Error checking pending order modals:', error);
      }
    };
    
    checkPendingOrderModals();
  }, []);
  
  // Listen for app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('App has come to the foreground!');
        // App has come from background to foreground, check if there are any pending notifications
        checkNotificationResponse();
      }
      
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Check for notification responses
  const checkNotificationResponse = async () => {
    try {
      const response = await Notifications.getLastNotificationResponseAsync();
      
      if (response) {
        const data = response.notification.request.content.data;
        
        // If this is an order notification with orderId, show the modal
        if ((data?.type === 'orderUpdate' && data?.orderId) || data?.orderId) {
          console.log('Found notification response with order ID:', data.orderId);
          showOrderModal(data.orderId);
        }
      }
    } catch (error) {
      console.error('Error checking notification response:', error);
    }
  };
  
  // Listen for new notifications that might contain order updates
  useEffect(() => {
    if (notifications.length > 0) {
      const latestNotification = notifications[0];
      console.log('Latest notification:', {
        id: latestNotification.id,
        title: latestNotification.title,
        read: latestNotification.read,
        dataType: latestNotification.data?.type,
        orderId: latestNotification.data?.orderId,
        showModal: latestNotification.data?.showModal
      });
      
      // Don't re-open the modal if it was already opened recently (within 3 seconds)
      const now = Date.now();
      const minTimeBetweenModals = 3000; // 3 seconds
      const canOpenModal = !modalOpenedTimestamp.current || 
                           (now - modalOpenedTimestamp.current) > minTimeBetweenModals;
      
      // Check if this is a new (unread) order notification with showModal flag
      if (
        !latestNotification.read && 
        canOpenModal && 
        latestNotification.data?.type === 'orderUpdate' && 
        latestNotification.data?.orderId && 
        latestNotification.data?.showModal
      ) {
        console.log('Should show modal for order:', latestNotification.data.orderId);
        showOrderModal(latestNotification.data.orderId);
      }
    }
  }, [notifications]);

  // Set up notification response listener
  useEffect(() => {
    // Set up notification response handler for when users tap on notifications
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      
      // If this is an order notification with orderId, show the modal
      if ((data?.type === 'orderUpdate' && data?.orderId) || data?.orderId) {
        console.log('Notification response listener caught order ID:', data.orderId);
        showOrderModal(data.orderId);
      }
    });

    return () => {
      Notifications.removeNotificationSubscription(responseListener);
    };
  }, []);

  const showOrderModal = (orderId: string) => {
    console.log('Opening order details modal for order ID:', orderId);
    setSelectedOrderId(orderId);
    setModalVisible(true);
    modalOpenedTimestamp.current = Date.now();
  };

  const hideOrderModal = () => {
    setModalVisible(false);
    setSelectedOrderId(null);
  };

  return (
    <OrderModalContext.Provider value={{ showOrderModal, hideOrderModal }}>
      {children}
      <OrderDetailsModal
        orderId={selectedOrderId}
        visible={modalVisible}
        onClose={hideOrderModal}
      />
    </OrderModalContext.Provider>
  );
}; 