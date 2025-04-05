import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import OrderDetailsModal from '@/components/OrderDetailsModal';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import * as Notifications from 'expo-notifications';
import { AppState, Platform, BackHandler } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

interface OrderModalContextType {
  showOrderModal: (orderId: string, preventNavigation?: boolean) => void;
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
  const router = useRouter();
  
  // Access the notifications from Redux to check for order updates
  const notifications = useSelector((state: RootState) => state.notifications.notifications);
  
  // Android back button handler - closes modal instead of navigating back
  useEffect(() => {
    if (Platform.OS === 'android') {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        if (modalVisible) {
          console.log('Android: Back button pressed while modal visible, closing modal');
          hideOrderModal();
          return true; // Prevent default back action
        }
        // Let default back behavior happen
        return false;
      });
      
      return () => {
        console.log('Android: Removing back button handler');
        backHandler.remove();
      };
    }
  }, [modalVisible]); // Re-attach listener when modalVisible changes
  
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
              showOrderModal(mostRecentOrder.orderId, true);
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
        showModal: latestNotification.data?.showModal,
        source: latestNotification.data?.source,
        clicked: latestNotification.data?.clicked
      });
      
      // Only open modal if notification was explicitly clicked (handled in NotificationBell)
      if (latestNotification.data?.clicked && 
          (latestNotification.data?.type === 'orderUpdate' || latestNotification.data?.type === 'orderPlaced') && 
          latestNotification.data?.orderId) {
        
        const shouldPreventNavigation = Platform.OS === 'android' || latestNotification.data?.preventNavigation === true;
        showOrderModal(latestNotification.data.orderId, shouldPreventNavigation);
      }
    }
  }, [notifications]);

  // Check for notification responses
  const checkNotificationResponse = async () => {
    try {
      const response = await Notifications.getLastNotificationResponseAsync();
      
      if (response) {
        const data = response.notification.request.content.data;
        
        // If this is an order notification with orderId, show the modal
        // Only shown when user explicitly clicked the notification
        if ((data?.type === 'orderUpdate' || data?.type === 'orderPlaced') && data?.orderId) {
          console.log('Found notification response with order ID:', data.orderId);
          showOrderModal(data.orderId, Platform.OS === 'android');
        }
      }
    } catch (error) {
      console.error('Error checking notification response:', error);
    }
  };

  // Set up notification response listener
  useEffect(() => {
    // Set up notification response handler for when users tap on notifications
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      
      // If this is an order notification with orderId, show the modal
      // Only shown when user explicitly clicked the notification
      if ((data?.type === 'orderUpdate' || data?.type === 'orderPlaced') && data?.orderId) {
        console.log('Notification response listener caught order ID:', data.orderId);
        
        // On Android, we need to prevent navigation
        const shouldPreventNavigation = Platform.OS === 'android';
        
        // Use setTimeout to ensure the modal shows after any navigation attempts
        setTimeout(() => {
          console.log(`${Platform.OS}: Showing order modal with proper handling`);
          showOrderModal(data.orderId, shouldPreventNavigation); 
        }, Platform.OS === 'android' ? 500 : 300);
      }
    });

    return () => {
      Notifications.removeNotificationSubscription(responseListener);
    };
  }, []);

  const showOrderModal = (orderId: string, preventNavigation: boolean = false) => {
    console.log(`${Platform.OS}: Opening order details modal for order ID:`, orderId, 
      preventNavigation ? '(preventing navigation)' : '');
    
    // For both Android and iOS, ensure consistent behavior
    if (preventNavigation && Platform.OS === 'android') {
      // For Android with navigation prevention:
      // 1. Make sure we're on a stable screen first
      // 2. Then show the modal with a slight delay
      setTimeout(() => {
        setSelectedOrderId(orderId);
        setModalVisible(true);
        modalOpenedTimestamp.current = Date.now();
      }, 300);
    } else {
      // For iOS or when not preventing navigation:
      // Show modal immediately
      setSelectedOrderId(orderId);
      setModalVisible(true);
      modalOpenedTimestamp.current = Date.now();
    }
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