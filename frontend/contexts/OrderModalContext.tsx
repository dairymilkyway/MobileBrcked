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
        // If modal is visible, intercept back button 
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
      console.log(`${Platform.OS}: Latest notification:`, {
        id: latestNotification.id,
        title: latestNotification.title,
        read: latestNotification.read,
        dataType: latestNotification.data?.type,
        orderId: latestNotification.data?.orderId,
        showModal: latestNotification.data?.showModal,
        preventNavigation: latestNotification.data?.preventNavigation,
        source: latestNotification.data?.source,
        clicked: latestNotification.data?.clicked
      });
      
      // Only open modal if notification was explicitly clicked (handled in NotificationBell)
      if (latestNotification.data?.clicked && 
          (latestNotification.data?.type === 'orderUpdate' || latestNotification.data?.type === 'orderPlaced') && 
          latestNotification.data?.orderId) {
        
        // Check if we should prevent navigation
        const shouldPreventNavigation = latestNotification.data?.preventNavigation === true || 
                                        Platform.OS === 'android';
        
        console.log(`${Platform.OS}: Should prevent navigation: ${shouldPreventNavigation}`);
        
        // On Android, we need a small delay to ensure the modal shows correctly
        if (Platform.OS === 'android') {
          setTimeout(() => {
            if (latestNotification.data?.orderId) {
              showOrderModal(latestNotification.data.orderId, shouldPreventNavigation);
            }
          }, 300);
        } else {
          showOrderModal(latestNotification.data.orderId, shouldPreventNavigation);
        }
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
          console.log(`${Platform.OS}: Found notification response with order ID:`, data.orderId);
          
          // Handle platform-specific behavior
          if (Platform.OS === 'android') {
            console.log(`${Platform.OS}: Using Android-specific handling for app state change`);
            
            try {
              // Mark data for special handling
              if (data) {
                data.preventNavigation = true;
                data.clicked = true;
              }
              
              // Use setTimeout to ensure the modal shows after any navigation attempts
              setTimeout(() => {
                try {
                  if (data?.orderId) {
                    showOrderModal(data.orderId, true);
                  } else {
                    console.error(`${Platform.OS}: Missing orderId in notification data`);
                  }
                } catch (modalError) {
                  console.error(`${Platform.OS}: Error showing modal from notification:`, modalError);
                }
              }, 500);
            } catch (dataError) {
              console.error(`${Platform.OS}: Error processing notification data:`, dataError);
            }
          } else {
            // iOS handling
            showOrderModal(data.orderId, false);
          }
        }
      }
    } catch (error) {
      console.error(`${Platform.OS}: Error checking notification response:`, error);
    }
  };

  // Set up notification response listener
  useEffect(() => {
    try {
      // Set up notification response handler for when users tap on notifications
      const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
        try {
          const data = response.notification.request.content.data;
          
          // If this is an order notification with orderId, show the modal
          // Only shown when user explicitly clicked the notification
          if ((data?.type === 'orderUpdate' || data?.type === 'orderPlaced') && data?.orderId) {
            console.log(`${Platform.OS}: Notification response listener caught order ID:`, data.orderId);
            
            // Handle platform-specific behavior
            const shouldPreventNavigation = Platform.OS === 'android';
            
            if (Platform.OS === 'android') {
              console.log(`${Platform.OS}: Using Android-specific handling for notification response`);
              
              try {
                // Mark data for special handling
                if (data) {
                  data.preventNavigation = true;
                  data.clicked = true;
                }
                
                // Use setTimeout to ensure the modal shows after any navigation attempts
                setTimeout(() => {
                  try {
                    console.log(`${Platform.OS}: Showing order modal with navigation prevention`);
                    if (data?.orderId) {
                      showOrderModal(data.orderId, true);
                    }
                  } catch (modalError) {
                    console.error(`${Platform.OS}: Error showing modal:`, modalError);
                  }
                }, 500);
              } catch (dataError) {
                console.error(`${Platform.OS}: Error processing notification data:`, dataError);
              }
            } else {
              // iOS handling
              console.log(`${Platform.OS}: Using iOS standard handling for notification response`);
              showOrderModal(data.orderId, false);
            }
          }
        } catch (responseError) {
          console.error(`${Platform.OS}: Error handling notification response:`, responseError);
        }
      });

      return () => {
        Notifications.removeNotificationSubscription(responseListener);
      };
    } catch (setupError) {
      console.error(`${Platform.OS}: Error setting up notification listener:`, setupError);
      return () => {}; // Return empty cleanup function
    }
  }, []);

  const showOrderModal = (orderId: string, preventNavigation: boolean = false) => {
    try {
      console.log(`${Platform.OS}: Opening order details modal for order ID:`, orderId, 
        preventNavigation ? '(preventing navigation)' : '');
      
      if (!orderId) {
        console.error(`${Platform.OS}: Cannot show modal - missing orderId`);
        return;
      }
      
      // If we need to prevent navigation (typically on Android)
      if (preventNavigation && Platform.OS === 'android') {
        console.log(`${Platform.OS}: Using Android-specific navigation prevention logic`);
        
        // For Android with navigation prevention:
        // 1. Set a flag to remember we want to show a modal 
        // 2. Use a timeout to ensure we show the modal AFTER any navigation might occur
        // 3. Use a longer delay on Android for stability
        
        const modalDelay = 400; // Slightly longer delay for Android stability
        
        // Set modal info first, in case the timeout is never triggered
        setSelectedOrderId(orderId);
        
        // Use a timeout to delay showing the modal
        setTimeout(() => {
          try {
            console.log(`${Platform.OS}: Showing modal after delay (${modalDelay}ms)`);
            
            // Double-check the orderId is still the one we want to show
            if (selectedOrderId === orderId) {
              setModalVisible(true);
              modalOpenedTimestamp.current = Date.now();
              console.log(`${Platform.OS}: Order modal displayed with navigation prevention`);
            } else {
              console.log(`${Platform.OS}: OrderId changed during delay, showing new orderId:`, selectedOrderId);
              setModalVisible(true);
              modalOpenedTimestamp.current = Date.now();
            }
          } catch (innerError) {
            console.error(`${Platform.OS}: Error displaying modal with prevention:`, innerError);
            
            // Attempt recovery if there was an error
            setSelectedOrderId(orderId);
            setModalVisible(true);
          }
        }, modalDelay);
      } else {
        // Standard handling for iOS or when not preventing navigation
        setSelectedOrderId(orderId);
        setModalVisible(true);
        modalOpenedTimestamp.current = Date.now();
        
        console.log(`${Platform.OS}: Order modal displayed normally`);
      }
    } catch (error) {
      console.error(`${Platform.OS}: Error in showOrderModal:`, error);
      
      // Attempt recovery
      try {
        setSelectedOrderId(orderId);
        setModalVisible(true);
      } catch (recoveryError) {
        console.error(`${Platform.OS}: Recovery failed:`, recoveryError);
      }
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