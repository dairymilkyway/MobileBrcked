import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import OrderDetailsModal from '@/components/OrderDetailsModal';
import ProductDetailsModal from '@/components/ProductDetailsModal';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import * as Notifications from 'expo-notifications';
import { AppState, Platform, BackHandler } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

interface OrderModalContextType {
  showOrderModal: (orderId: string, preventNavigation?: boolean) => void;
  hideOrderModal: () => void;
  showProductModal: (productId: string, preventNavigation?: boolean) => void;
  hideProductModal: () => void;
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

// Define interface for pending products
interface PendingProductModal {
  productId: string;
  timestamp: number;
  showModal: boolean;
}

export const OrderModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [orderModalVisible, setOrderModalVisible] = useState(false);
  const [productModalVisible, setProductModalVisible] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const appState = useRef(AppState.currentState);
  const modalOpenedTimestamp = useRef<number | null>(null);
  const router = useRouter();
  
  // Access the notifications from Redux to check for order updates
  const notifications = useSelector((state: RootState) => state.notifications.notifications);
  
  // Android back button handler - closes modal instead of navigating back
  useEffect(() => {
    if (Platform.OS === 'android') {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        // If any modal is visible, intercept back button
        if (orderModalVisible) {
          console.log('Android: Back button pressed while order modal visible, closing modal');
          hideOrderModal();
          return true; // Prevent default back action
        } else if (productModalVisible) {
          console.log('Android: Back button pressed while product modal visible, closing modal');
          hideProductModal();
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
  }, [orderModalVisible, productModalVisible]); // Re-attach listener when modal visibility changes
  
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
        
        // Also check for pending product modals
        const pendingProductsString = await AsyncStorage.getItem('pendingProductModals');
        if (pendingProductsString) {
          const pendingProducts = JSON.parse(pendingProductsString);
          console.log('Found pending product modals:', pendingProducts);
          
          // If there are any pending products, show the most recent one
          if (pendingProducts.length > 0) {
            // Sort by timestamp (newest first)
            const typedPendingProducts = pendingProducts as PendingProductModal[];
            typedPendingProducts.sort((a, b) => b.timestamp - a.timestamp);
            
            // Show the most recent product
            const mostRecentProduct = typedPendingProducts[0];
            console.log('Showing most recent pending product modal:', mostRecentProduct);
            
            // Wait a second to make sure the app is fully initialized
            setTimeout(() => {
              showProductModal(mostRecentProduct.productId, true);
            }, 1000);
            
            // Remove all pending products
            await AsyncStorage.removeItem('pendingProductModals');
          }
        }
      } catch (error) {
        console.error('Error checking pending modals:', error);
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

  // Listen for new notifications that might contain order updates or new products
  useEffect(() => {
    if (notifications.length > 0) {
      // Get the latest notification
      const latestNotification = notifications[0];
      console.log(`${Platform.OS}: Checking notification in OrderModalContext:`, 
        latestNotification.title, 
        latestNotification.data?.type,
        latestNotification.data?.orderId,
        latestNotification.data?.productId
      );
      
      // Add specific logging for order placed notifications
      if (latestNotification.data?.type === 'orderPlaced' && latestNotification.data?.orderId) {
        console.log(`${Platform.OS}: ORDER PLACED notification detected in OrderModalContext:`, {
          orderId: latestNotification.data.orderId,
          clicked: latestNotification.data?.clicked,
          showModal: latestNotification.data?.showModal
        });
      }
      
      // Add specific logging for new product notifications
      if (latestNotification.data?.type === 'newProduct' && latestNotification.data?.productId) {
        console.log(`${Platform.OS}: NEW PRODUCT notification detected in OrderModalContext:`, {
          productId: latestNotification.data.productId,
          clicked: latestNotification.data?.clicked,
          showModal: latestNotification.data?.showModal
        });
      }
      
      // Only open modal if notification was explicitly clicked (handled in NotificationBell)
      if (latestNotification.data?.clicked) {
        if ((latestNotification.data?.type === 'orderUpdate' || latestNotification.data?.type === 'orderPlaced') && 
            latestNotification.data?.orderId) {
          
          console.log(`${Platform.OS}: Order notification was clicked - type: ${latestNotification.data.type}, orderId: ${latestNotification.data.orderId}`);
          
          // Check if we should prevent navigation
          const shouldPreventNavigation = latestNotification.data?.preventNavigation === true || 
                                          Platform.OS === 'android';
          
          console.log(`${Platform.OS}: Should prevent navigation: ${shouldPreventNavigation}`);
          
          // On Android, we need a small delay to ensure the modal shows correctly
          if (Platform.OS === 'android') {
            setTimeout(() => {
              if (latestNotification.data?.orderId) {
                console.log(`${Platform.OS}: Showing modal for ${latestNotification.data.type} notification after delay`);
                showOrderModal(latestNotification.data.orderId, shouldPreventNavigation);
              }
            }, 300);
          } else {
            console.log(`${Platform.OS}: Immediately showing modal for ${latestNotification.data.type} notification`);
            showOrderModal(latestNotification.data.orderId, shouldPreventNavigation);
          }
        } 
        // Handle product notifications
        else if (latestNotification.data?.type === 'newProduct' && latestNotification.data?.productId) {
          console.log(`${Platform.OS}: Product notification was clicked - productId: ${latestNotification.data.productId}`);
          
          // Check if we should prevent navigation
          const shouldPreventNavigation = latestNotification.data?.preventNavigation === true || 
                                          Platform.OS === 'android';
          
          console.log(`${Platform.OS}: Should prevent product navigation: ${shouldPreventNavigation}`);
          
          // On Android, we need a small delay to ensure the modal shows correctly
          if (Platform.OS === 'android') {
            setTimeout(() => {
              if (latestNotification.data?.productId) {
                console.log(`${Platform.OS}: Showing modal for new product notification after delay`);
                showProductModal(latestNotification.data.productId, shouldPreventNavigation);
              }
            }, 300);
          } else {
            console.log(`${Platform.OS}: Immediately showing modal for new product notification`);
            showProductModal(latestNotification.data.productId, shouldPreventNavigation);
          }
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
        // Handle product notifications
        else if (data?.type === 'newProduct' && data?.productId) {
          console.log(`${Platform.OS}: Found notification response with product ID:`, data.productId);
          
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
                  if (data?.productId) {
                    showProductModal(data.productId, true);
                  } else {
                    console.error(`${Platform.OS}: Missing productId in notification data`);
                  }
                } catch (modalError) {
                  console.error(`${Platform.OS}: Error showing product modal from notification:`, modalError);
                }
              }, 500);
            } catch (dataError) {
              console.error(`${Platform.OS}: Error processing product notification data:`, dataError);
            }
          } else {
            // iOS handling
            showProductModal(data.productId, false);
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
          // Handle product notifications
          else if (data?.type === 'newProduct' && data?.productId) {
            console.log(`${Platform.OS}: Notification response listener caught product ID:`, data.productId);
            
            // Handle platform-specific behavior
            const shouldPreventNavigation = Platform.OS === 'android';
            
            if (Platform.OS === 'android') {
              console.log(`${Platform.OS}: Using Android-specific handling for product notification response`);
              
              try {
                // Mark data for special handling
                if (data) {
                  data.preventNavigation = true;
                  data.clicked = true;
                }
                
                // Use setTimeout to ensure the modal shows after any navigation attempts
                setTimeout(() => {
                  try {
                    console.log(`${Platform.OS}: Showing product modal with navigation prevention`);
                    if (data?.productId) {
                      showProductModal(data.productId, true);
                    }
                  } catch (modalError) {
                    console.error(`${Platform.OS}: Error showing product modal:`, modalError);
                  }
                }, 500);
              } catch (dataError) {
                console.error(`${Platform.OS}: Error processing product notification data:`, dataError);
              }
            } else {
              // iOS handling
              console.log(`${Platform.OS}: Using iOS standard handling for product notification response`);
              showProductModal(data.productId, false);
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
              setOrderModalVisible(true);
              modalOpenedTimestamp.current = Date.now();
              console.log(`${Platform.OS}: Order modal displayed with navigation prevention`);
            } else {
              console.log(`${Platform.OS}: OrderId changed during delay, showing new orderId:`, selectedOrderId);
              setOrderModalVisible(true);
              modalOpenedTimestamp.current = Date.now();
            }
          } catch (innerError) {
            console.error(`${Platform.OS}: Error displaying modal with prevention:`, innerError);
            
            // Attempt recovery if there was an error
            setSelectedOrderId(orderId);
            setOrderModalVisible(true);
          }
        }, modalDelay);
      } else {
        // Standard handling for iOS or when not preventing navigation
        setSelectedOrderId(orderId);
        setOrderModalVisible(true);
        modalOpenedTimestamp.current = Date.now();
        
        console.log(`${Platform.OS}: Order modal displayed normally`);
      }
    } catch (error) {
      console.error(`${Platform.OS}: Error in showOrderModal:`, error);
      
      // Attempt recovery
      try {
        setSelectedOrderId(orderId);
        setOrderModalVisible(true);
      } catch (recoveryError) {
        console.error(`${Platform.OS}: Recovery failed:`, recoveryError);
      }
    }
  };

  const hideOrderModal = () => {
    console.log(`${Platform.OS}: Destroying order modal state completely`);
    
    // Clear modal visibility
    setOrderModalVisible(false);
    
    // Clear order id with a small delay to ensure animations complete
    setTimeout(() => {
      setSelectedOrderId(null);
      // Reset the modal opened timestamp
      modalOpenedTimestamp.current = null;
    }, 300);
  };

  const showProductModal = (productId: string, preventNavigation: boolean = false) => {
    try {
      console.log(`${Platform.OS}: Opening product details modal for product ID:`, productId, 
        preventNavigation ? '(preventing navigation)' : '');
      
      if (!productId) {
        console.error(`${Platform.OS}: Cannot show product modal - missing productId`);
        return;
      }
      
      // If we need to prevent navigation (typically on Android)
      if (preventNavigation && Platform.OS === 'android') {
        console.log(`${Platform.OS}: Using Android-specific navigation prevention logic for product`);
        
        const modalDelay = 400; // Slightly longer delay for Android stability
        
        // Set modal info first, in case the timeout is never triggered
        setSelectedProductId(productId);
        
        // Use a timeout to delay showing the modal
        setTimeout(() => {
          try {
            console.log(`${Platform.OS}: Showing product modal after delay (${modalDelay}ms)`);
            
            // Double-check the productId is still the one we want to show
            if (selectedProductId === productId) {
              setProductModalVisible(true);
              modalOpenedTimestamp.current = Date.now();
              console.log(`${Platform.OS}: Product modal displayed with navigation prevention`);
            } else {
              console.log(`${Platform.OS}: ProductId changed during delay, showing new productId:`, selectedProductId);
              setProductModalVisible(true);
              modalOpenedTimestamp.current = Date.now();
            }
          } catch (innerError) {
            console.error(`${Platform.OS}: Error displaying product modal with prevention:`, innerError);
            
            // Attempt recovery if there was an error
            setSelectedProductId(productId);
            setProductModalVisible(true);
          }
        }, modalDelay);
      } else {
        // Standard handling for iOS or when not preventing navigation
        setSelectedProductId(productId);
        setProductModalVisible(true);
        modalOpenedTimestamp.current = Date.now();
        
        console.log(`${Platform.OS}: Product modal displayed normally`);
      }
    } catch (error) {
      console.error(`${Platform.OS}: Error in showProductModal:`, error);
      
      // Attempt recovery
      try {
        setSelectedProductId(productId);
        setProductModalVisible(true);
      } catch (recoveryError) {
        console.error(`${Platform.OS}: Recovery failed:`, recoveryError);
      }
    }
  };

  const hideProductModal = () => {
    console.log(`${Platform.OS}: Destroying product modal state completely`);
    
    // Clear modal visibility
    setProductModalVisible(false);
    
    // Clear product id with a small delay to ensure animations complete
    setTimeout(() => {
      setSelectedProductId(null);
      // Reset the modal opened timestamp
      modalOpenedTimestamp.current = null;
    }, 300);
  };

  return (
    <OrderModalContext.Provider value={{ showOrderModal, hideOrderModal, showProductModal, hideProductModal }}>
      {children}
      {/* Order details modal */}
      <OrderDetailsModal
        orderId={selectedOrderId}
        visible={orderModalVisible}
        onClose={hideOrderModal}
      />
      {/* Product details modal */}
      <ProductDetailsModal
        productId={selectedProductId}
        visible={productModalVisible}
        onClose={hideProductModal}
      />
    </OrderModalContext.Provider>
  );
}; 