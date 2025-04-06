import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import 'react-native-reanimated';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider, useDispatch } from 'react-redux';
import { store } from '../redux/store';
import { Alert, Platform } from 'react-native';
import { registerForPushNotifications, registerTokenWithServer, setupNotificationListeners, registerBackgroundNotificationHandler, removePushTokenOnLogout } from '@/utils/notificationHelper';
import * as Notifications from 'expo-notifications';
import { addNotification, setNotifications } from '@/redux/slices/notificationSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from '@/env';
import { useAppDispatch } from '@/redux/hooks';
import { OrderModalProvider } from '@/contexts/OrderModalContext';
import { useRouter } from 'expo-router';
import type { AppDispatch } from '@/redux/store';
import { fetchUserNotifications } from '@/utils/api';
import { hasProductBeenNotified, markProductAsNotified } from '@/utils/notificationHelper';

import { useColorScheme } from '@/hooks/useColorScheme';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Define types for orders
interface Order {
  _id: string;
  orderId: string;
  status: string;
  // Add other properties as needed
}

// Define background notification handler with higher priority settings
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data;
    
    // Check specifically for orderPlaced or orderUpdate type
    const isOrderPlaced = data && data.type === 'orderPlaced';
    const isOrderUpdate = data && data.type === 'orderUpdate';
    const isNewProduct = data && data.type === 'newProduct';
    const isOrderNotification = isOrderPlaced || isOrderUpdate;
    
    // Always show these notifications with high priority
    const shouldForce = true; // Always force show notifications for faster delivery
    
    console.log(`Notification handler - data:`, JSON.stringify(data));
    
    // Set MAX priority for all notifications to ensure they're displayed quickly
    const priority = Notifications.AndroidNotificationPriority.MAX;
    
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      priority: priority,
      // On iOS, ensure presentation options with immediate display flags
      iOS: {
        sound: true,
        presentAlert: true,
        presentBadge: true,
        presentSound: true,
        // Add critical alert flag on iOS for important notifications
        criticalAlert: isNewProduct || isOrderPlaced
      }
    };
  },
});

// Separate component for notification setup to use Redux hooks
function NotificationSetup() {
  const dispatch = useAppDispatch();
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);
  const lastOrderStatusesRef = useRef<Record<string, string>>({});
  const recentlyShownNotifications = useRef<Record<string, number>>({});

  // Move the handleNotificationResponse function here, inside the component
  const handleNotificationResponse = async (response: Notifications.NotificationResponse) => {
    const data = response.notification.request.content.data;
    
    // Check if this is an order notification (update or placed)
    const isOrderUpdate = data?.type === 'orderUpdate' && data?.orderId;
    const isOrderPlaced = data?.type === 'orderPlaced' && data?.orderId;
    const isNewProduct = data?.type === 'newProduct' && data?.productId;
    
    console.log(`${Platform.OS}: Notification response received - isOrderUpdate: ${isOrderUpdate}, isOrderPlaced: ${isOrderPlaced}, isNewProduct: ${isNewProduct}`);
    
    // This is ONLY triggered when a notification is explicitly clicked by the user
    if ((isOrderUpdate || isOrderPlaced) && data?.orderId) {
      console.log(`${Platform.OS}: Order notification (${data.type}) response for order:`, data.orderId);
      
      // Set the preventNavigation flag for Android devices
      const shouldPreventNavigation = Platform.OS === 'android';
      
      // Prepare notification data with platform-specific flags
      const notificationData = {
        ...data,
        type: data.type || 'orderUpdate',
        orderId: data.orderId,
        showModal: true,       // This flag indicates the modal should be shown
        clicked: true,         // Add explicit clicked flag 
        preventNavigation: shouldPreventNavigation,
        timestamp: Date.now()  // Add current timestamp for uniqueness
      };
      
      // Add to Redux for handling by OrderModalContext
      console.log(`${Platform.OS}: Dispatching clicked ${data.type} notification to Redux`);
      dispatch(addNotification({
        title: response.notification.request.content.title || 'Order Update',
        body: response.notification.request.content.body || 'Your order has been updated',
        data: notificationData
      }));
    }
    // Handle product notifications
    else if (isNewProduct) {
      const productId = data.productId;
      console.log(`${Platform.OS}: Product notification response for product:`, productId);
      
      try {
        // Check if we've already processed this product notification
        const alreadyNotified: boolean = await hasProductBeenNotified(productId);
        
        if (alreadyNotified) {
          console.log(`${Platform.OS}: Product ${productId} has already been notified, not showing modal`);
          return;
        }
        
        // Set the preventNavigation flag for Android devices
        const shouldPreventNavigation = Platform.OS === 'android';
        
        // Prepare notification data with platform-specific flags
        const notificationData = {
          ...data,
          type: 'newProduct',
          productId: productId,
          showModal: true,       // This flag indicates the modal should be shown
          clicked: true,         // Add explicit clicked flag 
          preventNavigation: shouldPreventNavigation,
          timestamp: Date.now()  // Add current timestamp for uniqueness
        };
        
        // Add to Redux for handling by OrderModalContext
        console.log(`${Platform.OS}: Dispatching clicked new product notification to Redux`);
        dispatch(addNotification({
          title: response.notification.request.content.title || '🔥 New Product Alert! ��️',
          body: response.notification.request.content.body || '✨ Check out our new product! 🤩',
          data: notificationData
        }));
        
        // Mark this product as notified to prevent future notifications
        await markProductAsNotified(productId);
      } catch (error: unknown) {
        console.error(`${Platform.OS}: Error checking if product ${productId} has been notified:`, error);
        
        // Still dispatch the notification in case of error
        dispatch(addNotification({
          title: response.notification.request.content.title || '🔥 New Product Alert! 🛍️',
          body: response.notification.request.content.body || '✨ Check out our new product! 🤩',
          data: {
            ...data,
            type: 'newProduct',
            showModal: true,
            clicked: true,
            preventNavigation: Platform.OS === 'android',
            timestamp: Date.now()
          }
        }));
      }
    }
  };

  // Helper function to check if we've recently shown a notification for this order/status
  const hasRecentlyShownNotification = (orderId: string, status: string): boolean => {
    const key = `${orderId}-${status}`;
    const timestamp = recentlyShownNotifications.current[key];
    
    if (!timestamp) return false;
    
    // Check if shown in the last 5 seconds
    const now = Date.now();
    return (now - timestamp) < 5000; // 5 seconds
  };
  
  // Helper function to mark a notification as shown
  const markNotificationAsShown = (orderId: string, status: string) => {
    const key = `${orderId}-${status}`;
    recentlyShownNotifications.current[key] = Date.now();
    
    // Clean up old entries every 100 notifications to prevent memory leak
    if (Object.keys(recentlyShownNotifications.current).length > 100) {
      const now = Date.now();
      const newMap: Record<string, number> = {};
      
      // Keep only notifications from the last 10 seconds
      Object.entries(recentlyShownNotifications.current).forEach(([key, timestamp]) => {
        if (now - timestamp < 10000) {
          newMap[key] = timestamp;
        }
      });
      
      recentlyShownNotifications.current = newMap;
    }
  };

  // Function to poll for order updates
  const pollForOrderUpdates = async () => {
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      const userRole = await AsyncStorage.getItem('userRole');
      
      // Only poll for updates if the user is a regular user and logged in
      if (!userToken || userRole !== 'user') {
        return;
      }
      
      // Get orders from the API
      const response = await axios.get(`${API_BASE_URL}/orders`, {
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });
      
      if (response.data.success && response.data.data) {
        const orders = response.data.data as Order[];
        
        // Check for status changes in each order
        orders.forEach((order: Order) => {
          const orderId = order.orderId;
          const currentStatus = order.status;
          const previousStatus = lastOrderStatusesRef.current[orderId];
          
          // If we have a previous status and it changed, trigger a notification
          if (previousStatus && previousStatus !== currentStatus) {
            console.log(`Status change detected for order ${orderId}: ${previousStatus} -> ${currentStatus}`);
            
            // Check if we've recently shown this notification
            if (!hasRecentlyShownNotification(orderId, currentStatus)) {
              // Schedule a local notification with special flags to ensure it's displayed immediately
              Notifications.scheduleNotificationAsync({
                content: {
                  title: 'Order Update',
                  body: getOrderStatusMessage(orderId, currentStatus),
                  data: { 
                    orderId, 
                    status: currentStatus, 
                    type: 'orderUpdate',
                    forceShow: true, // Special flag to force show the notification
                    immediate: true,  // Indicate this is an immediate notification
                    source: 'polling',  // Track the source for debugging
                    showModal: true // Add this flag for the OrderModalContext
                  }
                },
                trigger: null // null means send immediately
              });
              
              // Add to Redux only if no identical notification within 5 seconds
              dispatch(addNotification({
                title: 'Order Update',
                body: getOrderStatusMessage(orderId, currentStatus),
                data: { 
                  orderId, 
                  status: currentStatus, 
                  type: 'orderUpdate',
                  source: 'polling',
                  showModal: true // Add this flag for the OrderModalContext
                }
              }));
              
              // Mark as shown to prevent duplicates
              markNotificationAsShown(orderId, currentStatus);
            }
          }
          
          // Update our reference of the last status
          lastOrderStatusesRef.current[orderId] = currentStatus;
        });
      }
    } catch (error) {
      console.error('Error polling for order updates:', error);
    }
  };
  
  // Helper function to get a message based on status
  const getOrderStatusMessage = (orderId: string, status: string): string => {
    let message = `Your order #${orderId} `;
    
    switch (status) {
      case 'processing':
        message += 'is now being processed.';
        break;
      case 'shipped':
        message += 'has been shipped! Your package is on the way.';
        break;
      case 'delivered':
        message += 'has been delivered. Enjoy!';
        break;
      case 'cancelled':
        message += 'has been cancelled.';
        break;
      default:
        message += `status has been updated to: ${status}`;
    }
    
    return message;
  };

  // Add a function to check for recent status updates from the dedicated endpoint
  const checkRecentStatusUpdates = async () => {
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      const userRole = await AsyncStorage.getItem('userRole');
      
      // Only check for updates if the user is a regular user and logged in
      if (!userToken || userRole !== 'user') {
        return;
      }
      
      // Get the last check timestamp
      let lastChecked = await AsyncStorage.getItem('lastStatusUpdateCheck');
      if (!lastChecked) {
        lastChecked = (Date.now() - (60 * 60 * 1000)).toString(); // Default to 1 hour ago
      }
      
      try {
        // Check recent status updates - fix the URL to match the API structure
        const response = await axios.get(`${API_BASE_URL}/orders/recent-status-updates?lastChecked=${lastChecked}`, {
          headers: {
            'Authorization': `Bearer ${userToken}`
          }
        });
        
        // Update the last check timestamp
        await AsyncStorage.setItem('lastStatusUpdateCheck', Date.now().toString());
        
        if (response.data.success && response.data.data && response.data.data.length > 0) {
          console.log(`Found ${response.data.data.length} recent status updates`);
          
          // Process each status update
          response.data.data.forEach((update: any) => {
            const { orderId, status, updatedAt } = update;
            
            console.log(`Found status update for order ${orderId}: ${status} at ${updatedAt}`);
            
            // Check if we've recently shown this notification already
            if (!hasRecentlyShownNotification(orderId, status)) {
              // Schedule an immediate notification
              Notifications.scheduleNotificationAsync({
                content: {
                  title: 'Order Update',
                  body: getOrderStatusMessage(orderId, status),
                  data: { 
                    orderId, 
                    status, 
                    type: 'orderUpdate',
                    forceShow: true,
                    immediate: true,
                    timestamp: Date.now(),
                    source: 'recent-updates',
                    showModal: true // Add this flag for the OrderModalContext
                  }
                },
                trigger: null // Send immediately
              });
              
              // Also add to Redux
              dispatch(addNotification({
                title: 'Order Update',
                body: getOrderStatusMessage(orderId, status),
                data: { 
                  orderId, 
                  status, 
                  type: 'orderUpdate',
                  source: 'recent-updates',
                  showModal: true // Add this flag for the OrderModalContext
                }
              }));
              
              // Mark as shown to prevent duplicates
              markNotificationAsShown(orderId, status);
            } else {
              console.log(`Skipping duplicate notification for order ${orderId}`);
            }
          });
        }
      } catch (innerError: any) {
        console.error('Error checking recent status updates:', innerError.message);
        
        // If we get a 404, it means the endpoint doesn't exist yet
        if (innerError.response && innerError.response.status === 404) {
          console.log('Recent status updates endpoint not found, falling back to polling');
          
          // Just continue with the regular polling method
          // and don't try this endpoint for a while to reduce error logs
          await AsyncStorage.setItem('lastStatusUpdateCheck', (Date.now() + 60000).toString());
        }
      }
    } catch (error) {
      console.error('Error in checkRecentStatusUpdates:', error);
    }
  };

  // Add a function to check for notification receipts
  const checkNotificationReceipts = async () => {
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      const userRole = await AsyncStorage.getItem('userRole');
      
      // Only check for receipts if the user is a regular user and logged in
      if (!userToken || userRole !== 'user') {
        return;
      }
      
      // Get the last check timestamp
      let lastChecked = await AsyncStorage.getItem('lastReceiptCheck');
      if (!lastChecked) {
        lastChecked = (Date.now() - (60 * 60 * 1000)).toString(); // Default to 1 hour ago
      }
      
      // Check for notification receipts
      try {
        const response = await axios.get(`${API_BASE_URL}/notifications/receipts?since=${lastChecked}&markAsRead=true`, {
          headers: {
            'Authorization': `Bearer ${userToken}`
          }
        });
        
        // Update the last check timestamp
        await AsyncStorage.setItem('lastReceiptCheck', Date.now().toString());
        
        if (response.data.success && response.data.data && response.data.data.length > 0) {
          console.log(`Found ${response.data.data.length} notification receipts`);
          
          // Process each receipt
          response.data.data.forEach((receipt: any) => {
            const { orderId, status, message, timestamp } = receipt;
            
            console.log(`Processing notification receipt for order ${orderId}: ${status}`);
            
            // Check if we've recently shown this notification already
            if (!hasRecentlyShownNotification(orderId, status)) {
              // Schedule an immediate notification
              Notifications.scheduleNotificationAsync({
                content: {
                  title: 'Order Update',
                  body: message || getOrderStatusMessage(orderId, status),
                  data: { 
                    orderId, 
                    status, 
                    type: 'orderUpdate',
                    forceShow: true,
                    immediate: true,
                    receiptId: receipt._id,
                    timestamp: timestamp || Date.now(),
                    source: 'receipt',
                    showModal: true // Add this flag for the OrderModalContext
                  }
                },
                trigger: null // Send immediately
              });
              
              // Also add to Redux
              dispatch(addNotification({
                title: 'Order Update',
                body: message || getOrderStatusMessage(orderId, status),
                data: { 
                  orderId, 
                  status, 
                  type: 'orderUpdate', 
                  receiptId: receipt._id,
                  source: 'receipt',
                  showModal: true // Add this flag for the OrderModalContext
                }
              }));
              
              // Mark as shown to prevent duplicates
              markNotificationAsShown(orderId, status);
            } else {
              console.log(`Skipping duplicate notification for order ${orderId}`);
            }
          });
        }
      } catch (innerError: any) {
        // This will happen if the notifications endpoint doesn't exist yet
        if (innerError.response && innerError.response.status === 404) {
          console.log('Notification receipts endpoint not available yet');
        } else {
          console.error('Error checking notification receipts:', innerError.message);
        }
      }
    } catch (error) {
      console.error('Error in checkNotificationReceipts:', error);
    }
  };

  // Helper function to check if we've recently shown a notification for this product
  const hasRecentlyShownProductNotification = (productId: string): boolean => {
    const key = `product-${productId}`;
    const timestamp = recentlyShownNotifications.current[key];
    
    if (!timestamp) return false;
    
    // Check if shown in the last 30 minutes (to prevent repeated notifications)
    const now = Date.now();
    return (now - timestamp) < 1800000; // 30 minutes
  };
  
  // Helper function to mark a product notification as shown
  const markProductNotificationAsShown = (productId: string) => {
    const key = `product-${productId}`;
    recentlyShownNotifications.current[key] = Date.now();
  };

  // Add a function to check for recent product updates
  const checkRecentProductUpdates = async () => {
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      const userRole = await AsyncStorage.getItem('userRole');
      
      // Only check for updates if the user is a regular user and logged in
      if (!userToken || userRole !== 'user') {
        return;
      }
      
      // Get the last check timestamp
      let lastChecked = await AsyncStorage.getItem('lastProductUpdateCheck');
      if (!lastChecked) {
        lastChecked = (Date.now() - (60 * 60 * 1000)).toString(); // Default to 1 hour ago
      }
      
      // Check if we need to skip this check (to avoid too frequent checks)
      const lastCheckTime = parseInt(lastChecked);
      const now = Date.now();
      const CHECK_INTERVAL = 5000; // Check every 5 seconds to show notifications faster
      
      if (now - lastCheckTime < CHECK_INTERVAL) {
        // Skip checking too frequently
        return;
      }
      
      try {
        // Check for notification receipts related to new products
        const response = await axios.get(`${API_BASE_URL}/notifications/receipts?lastChecked=${lastChecked}`, {
          headers: {
            'Authorization': `Bearer ${userToken}`
          }
        });
        
        // Update the last check timestamp immediately to avoid duplicate checks
        await AsyncStorage.setItem('lastProductUpdateCheck', now.toString());
        
        if (response.data.success && response.data.data && response.data.data.length > 0) {
          // Filter for product notifications only and log once
          const productNotifications = response.data.data.filter(
            (receipt: any) => receipt.type === 'newProduct' && receipt.productId
          );
          
          if (productNotifications.length > 0) {
            console.log(`Found ${productNotifications.length} product notifications`);
            
            // Group notifications by productId to show only the newest per product
            const productMap: Record<string, any> = {};
            
            // Only keep the newest notification for each product
            productNotifications.forEach((notification: any) => {
              const { productId, timestamp = 0 } = notification;
              if (!productMap[productId] || productMap[productId].timestamp < timestamp) {
                productMap[productId] = notification;
              }
            });
            
            // Process each unique product notification
            const productIds = Object.keys(productMap);
            let shownCount = 0;
            let skipCount = 0;
            
            for (const productId of productIds) {
              // First check if we've already notified this product (ever)
              const alreadyNotified = await hasProductBeenNotified(productId);
              
              if (alreadyNotified) {
                skipCount++;
                continue;
              }
              
              // Show only this new product notification
              const notification = productMap[productId];
              const { message, timestamp } = notification;
              
              console.log(`Processing new product notification for product ${productId}`);
              
              // Schedule an immediate notification
              Notifications.scheduleNotificationAsync({
                content: {
                  title: '🔥 New Product Alert! 🛍️',
                  body: message || '✨ Check out our new product! 🤩',
                  data: { 
                    productId, 
                    type: 'newProduct',
                    forceShow: true,
                    immediate: true,
                    timestamp: timestamp || now,
                    source: 'receipt',
                    showModal: true
                  }
                },
                trigger: null // Send immediately
              });
              
              // Also add to Redux
              dispatch(addNotification({
                title: '🔥 New Product Alert! 🛍️',
                body: message || '✨ Check out our new product! 🤩',
                data: { 
                  productId, 
                  type: 'newProduct',
                  source: 'receipt',
                  showModal: true
                }
              }));
              
              // Mark product as notified permanently to prevent future notifications
              await markProductAsNotified(productId);
              
              shownCount++;
              
              // Only show one notification per check to reduce spam
              break;
            }
            
            // Log summary of what happened
            if (productIds.length > 0) {
              if (skipCount === productIds.length) {
                console.log(`All ${skipCount} products have already been notified to the user`);
              } else if (shownCount > 0) {
                console.log(`Showed notification for ${shownCount} new product(s), skipped ${skipCount} already notified`);
              }
            }
          }
        }
      } catch (innerError: any) {
        // This will happen if the notifications endpoint doesn't exist yet
        if (innerError.response && innerError.response.status === 404) {
          console.log('Product notifications endpoint not available yet');
        } else {
          console.error('Error checking product notifications:', innerError.message);
        }
      }
    } catch (error) {
      console.error('Error in checkRecentProductUpdates:', error);
    }
  };

  useEffect(() => {
    // Start polling for order updates (every 3 seconds)
    pollForOrderUpdates(); // Initial poll immediately
    pollingInterval.current = setInterval(pollForOrderUpdates, 3000);
    
    // Check for notification receipts every 2 seconds
    const receiptInterval = setInterval(checkNotificationReceipts, 2000);
    
    // Also check the dedicated recent updates endpoint every 3 seconds
    const statusUpdateInterval = setInterval(checkRecentStatusUpdates, 3000);
    
    // Also check for product updates every 5 seconds (reduced from 30s for faster notifications)
    const productUpdateInterval = setInterval(checkRecentProductUpdates, 5000);
    
    // Check for pending notifications from background/killed state
    const checkPendingNotifications = async () => {
      try {
        const pendingNotificationsStr = await AsyncStorage.getItem('pendingNotifications');
        
        if (pendingNotificationsStr) {
          const pendingNotifications = JSON.parse(pendingNotificationsStr);
          
          // Add each notification to the Redux store
          pendingNotifications.forEach((notification: any) => {
            dispatch(addNotification({
              title: notification.title,
              body: notification.body,
              data: notification.data
            }));
          });
          
          // Clear the pending notifications
          await AsyncStorage.removeItem('pendingNotifications');
        }
      } catch (error) {
        console.error('Error checking pending notifications:', error);
      }
    };
    
    checkPendingNotifications();
    
    // Don't request permissions here anymore - permissions will be requested on login instead
    
    // Set up notification listeners
    const cleanupListeners = setupNotificationListeners((notification: Notifications.Notification) => {
      // Handle incoming notifications while the app is open
      const { title, body, data } = notification.request.content;
      console.log('Received notification:', { title, body, data });
      
      // Check if this is an order update or order placed notification
      const isOrderUpdate = data && data.type === 'orderUpdate' && data.orderId && data.status;
      const isOrderPlaced = data && data.type === 'orderPlaced' && data.orderId;
      const isOrderNotification = isOrderUpdate || isOrderPlaced;
      
      console.log(`Notification received - isOrderUpdate: ${isOrderUpdate}, isOrderPlaced: ${isOrderPlaced}`);
      
      if (title) {
        // For order placed notifications, log even more details
        if (isOrderPlaced) {
          console.log('ORDER PLACED NOTIFICATION RECEIVED:', {
            orderId: data.orderId,
            title,
            body,
            timestamp: Date.now(),
            type: data.type
          });
          
          // Always dispatch order placed notifications with high importance flags
          dispatch(addNotification({
            title: title || 'Order Placed',
            body: body || 'Your order was placed successfully!',
            data: {
              ...data as Record<string, any>,
              source: 'listener',
              showModal: true,
              clicked: false,
              forceShow: true,
              immediate: true,
              timestamp: Date.now(),
              uniqueId: `order-placed-${data.orderId}-${Date.now()}`
            }
          }));
        } else {
          // For other notifications, use standard dispatch
          dispatch(addNotification({
            title: title || 'New Notification',
            body: body || '',
            data: {
              ...data as Record<string, any>,
              source: 'listener',  // Mark the source
              showModal: isOrderNotification, // Only show modal for order notifications
              clicked: false // Not clicked yet, just received
            }
          }));
        }
      }
      
      // Remove Alert.alert for notifications - we only want the banner notifications
      // Do not show Alert dialogs anymore
    });

    // Set up notification response handler for when users tap on notifications
    const responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        // We need to handle async function separately
        (async () => {
          try {
            await handleNotificationResponse(response);
          } catch (error) {
            console.error(`${Platform.OS}: Error handling notification response:`, error);
          }
        })();
      }
    );

    // Clean up listeners and intervals when the component unmounts
    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
      clearInterval(receiptInterval);
      clearInterval(statusUpdateInterval);
      clearInterval(productUpdateInterval);
      cleanupListeners();
      Notifications.removeNotificationSubscription(responseListener);
    };
  }, [dispatch]);

  return null;
}

// Function to handle logout (with token removal)
export const handleLogout = async (redirectToLogin = true, dispatch: AppDispatch | null = null) => {
  try {
    console.log('Starting logout process...');
    
    // Get the user token and role for logging
    const userToken = await AsyncStorage.getItem('userToken');
    const userRole = await AsyncStorage.getItem('userRole');
    const pushToken = await AsyncStorage.getItem('pushToken');
    
    console.log('Logout - User token exists:', !!userToken);
    console.log('Logout - User role:', userRole);
    console.log('Logout - Push token exists:', !!pushToken);
    
    // First try to unregister push token before the user token is removed
    // so the API call can still be authenticated
    console.log('Unregistering push token...');
    try {
      await removePushTokenOnLogout();
    } catch (pushTokenError) {
      // Log but continue with logout even if token removal fails
      console.error('Push token removal failed:', pushTokenError);
      console.log('Continuing with logout despite push token removal failure');
      
      // Backup: Try direct call to remove-push-token if the helper function fails
      if (userToken && pushToken) {
        try {
          console.log('Attempting direct call to remove push token as backup');
          await axios.delete(`${API_BASE_URL}/users/remove-push-token`, {
            headers: {
              'Authorization': `Bearer ${userToken}`,
              'Content-Type': 'application/json'
            },
            data: { pushToken },
            timeout: 3000
          });
          console.log('Backup push token removal successful');
        } catch (backupError: any) {
          console.error('Backup push token removal failed:', backupError.message);
          // Continue with logout regardless
        }
      }
    }
    
    // Try to call the logout API if we have a token
    if (userToken) {
      try {
        console.log(`Calling logout API at ${API_BASE_URL}/logout`);
        const response = await axios.post(
          `${API_BASE_URL}/logout`,
          {}, // Empty body
          {
            headers: {
              'Authorization': `Bearer ${userToken}`,
              'Content-Type': 'application/json'
            },
            timeout: 5000 // 5 second timeout
          }
        );
        console.log('Logout API response:', response.status);
      } catch (error: any) {
        // Log but continue with local logout even if server logout fails
        console.error('Error calling logout API:', error.message);
        if (error.response) {
          console.error('Server response status:', error.response.status);
        }
      }
    }
    
    // Always clear all local storage items regardless of API success
    console.log('Clearing local storage items...');
    const itemsToClear = [
      'userToken', 
      'token', 
      'userId', 
      'userRole', 
      'userEmail',
      'cartItems',
      'selectedFilters',
      'pushToken',
      'tokenLastRegistered',
      'pendingOrderModals',
      'lastStatusUpdateCheck',
      'lastReceiptCheck'
    ];
    
    // Clear each item and log any errors
    for (const item of itemsToClear) {
      try {
        await AsyncStorage.removeItem(item);
      } catch (storageError) {
        console.error(`Error clearing ${item} from storage:`, storageError);
      }
    }
    
    // Clear Redux state if dispatch is available
    if (dispatch) {
      console.log('Clearing Redux state...');
      // Clear notification state
      dispatch(setNotifications([]));
      // Add other state resets here if needed
    }
    
    console.log('Logout complete, preparing for redirect...');
    
    // Handle redirection if requested
    if (redirectToLogin) {
      console.log('Redirecting to login screen...');
      
      // Use timeout to ensure all async operations are complete
      setTimeout(() => {
        // For web
        if (Platform.OS === 'web') {
          // Cast window to any to bypass TypeScript errors
          const win = window as any;
          if (win && win.location) {
            win.location.href = '/Login';
          }
          return;
        }
        
        // For mobile, we'll use a simpler approach
        console.log('Session cleared, app will redirect to login on next navigation');
      }, 200);
    }
    
    return true;
  } catch (error) {
    console.error('Error during logout:', error);
    // Minimal fallback for errors
    if (redirectToLogin && Platform.OS === 'web') {
      setTimeout(() => {
        // Cast window to any to bypass TypeScript errors
        const win = window as any;
        if (win && win.location) {
          win.location.reload();
        }
      }, 200);
    }
    return false;
  }
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
      
      // Register background notification handler
      registerBackgroundNotificationHandler();
      
      // Load notifications for logged in user
      const loadUserNotifications = async () => {
        try {
          const userToken = await AsyncStorage.getItem('userToken');
          const userRole = await AsyncStorage.getItem('userRole');
          
          if (userToken && userRole === 'user') {
            console.log('App startup: Fetching notifications from server');
            
            try {
              // Get notifications directly from the server API
              const notificationsResponse = await fetchUserNotifications();
              
              if (notificationsResponse.success && notificationsResponse.data && notificationsResponse.data.length > 0) {
                console.log(`App startup: Fetched ${notificationsResponse.data.length} notifications from server`);
                store.dispatch(setNotifications(notificationsResponse.data));
              } else {
                console.log('App startup: No notifications found on server');
                // Initialize with empty array to mark as loaded
                store.dispatch(setNotifications([]));
              }
            } catch (apiError) {
              console.error('App startup: Error fetching notifications from server:', apiError);
              // Initialize with empty array to mark as loaded
              store.dispatch(setNotifications([]));
            }
            
            // Check for pending product modals
            try {
              const pendingProductsStr = await AsyncStorage.getItem('pendingProductModals');
              
              if (pendingProductsStr) {
                const pendingProducts = JSON.parse(pendingProductsStr);
                console.log(`App startup: Found ${pendingProducts.length} pending product modals`);
                
                if (pendingProducts.length > 0) {
                  // Get the most recent product modal
                  const mostRecent = pendingProducts.reduce((prev: any, current: any) => 
                    (prev.timestamp > current.timestamp) ? prev : current
                  );
                  
                  const productId = mostRecent.productId;
                  console.log(`App startup: Processing most recent product modal for ${productId}`);
                  
                  // Check if we've already notified about this product
                  const alreadyNotified = await hasProductBeenNotified(productId);
                  
                  if (alreadyNotified) {
                    console.log(`App startup: Product ${productId} has already been notified, skipping`);
                  } else {
                    console.log(`App startup: Showing notification for product ${productId}`);
                    
                    // Add to Redux
                    store.dispatch(addNotification({
                      title: '🔥 New Product Alert! 🛍️',
                      body: '✨ Check out our new product! 🤩',
                      data: {
                        productId: productId,
                        type: 'newProduct',
                        showModal: true,
                        forceShow: true,
                        clicked: true,
                        immediate: true,
                        timestamp: Date.now()
                      }
                    }));
                    
                    // Mark product as permanently notified
                    await markProductAsNotified(productId);
                  }
                  
                  // Clear pending product modals regardless of whether we showed it
                  await AsyncStorage.removeItem('pendingProductModals');
                }
              }
            } catch (productError) {
              console.error('App startup: Error processing pending product modals:', productError);
            }
          }
        } catch (error) {
          console.error('App startup: Error checking user status for notifications:', error);
        }
      };
      
      loadUserNotifications();
    }
  }, [loaded]);

  // Add a function to check if app was opened from a notification
  useEffect(() => {
    // Check if app was opened from a notification
    const getInitialNotification = async () => {
      try {
        // Give the router some time to initialize first
        if (Platform.OS === 'android') {
          // On Android, we need a bit more time to ensure navigation is ready
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        const response = await Notifications.getLastNotificationResponseAsync();
        
        // If app was opened from a notification, process it
        if (response) {
          console.log(`${Platform.OS}: App opened from notification:`, response.notification.request.content);
          
          // Get the data from the notification
          const data = response.notification.request.content.data;
          
          // If this is an order notification, add it to the store with the showModal flag
          // This is ONLY for notifications that were CLICKED to open the app
          if ((data?.type === 'orderUpdate' || data?.type === 'orderPlaced') && data?.orderId) {
            console.log(`${Platform.OS}: Initial notification has order ID:`, data.orderId);
            
            // Platform specific handling
            const isAndroid = Platform.OS === 'android';
            
            try {
              // Prepare notification data with platform-specific flags
              const notificationData = {
                ...data,
                type: data.type || 'orderUpdate',
                orderId: data.orderId,
                showModal: true,       // This flag indicates the modal should be shown
                clicked: true,         // Add explicit clicked flag 
                preventNavigation: isAndroid, // Prevent navigation on Android
                timestamp: Date.now()  // Add timestamp for uniqueness
              };
              
              console.log(`${Platform.OS}: Setting preventNavigation=${isAndroid} for initial notification`);
              
              // We need to delay this slightly to ensure the store is ready
              // Use different delays based on platform
              setTimeout(() => {
                try {
                  console.log(`${Platform.OS}: Dispatching notification to store`);
                  store.dispatch(
                    addNotification({
                      title: response.notification.request.content.title || 'Order Update',
                      body: response.notification.request.content.body || 'Your order has been updated',
                      data: notificationData
                    })
                  );
                  
                  console.log(`${Platform.OS}: Added initial order notification with preventNavigation=${isAndroid}`);
                } catch (dispatchError) {
                  console.error(`${Platform.OS}: Error dispatching notification:`, dispatchError);
                }
              }, isAndroid ? 2000 : 800); // Longer delay on Android to ensure router has settled
            } catch (dataError) {
              console.error(`${Platform.OS}: Error preparing notification data:`, dataError);
            }
          }
        }
      } catch (error) {
        console.error(`${Platform.OS}: Error checking initial notification:`, error);
      }
    };
    
    getInitialNotification();
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <Provider store={store}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <SafeAreaProvider>
            <OrderModalProvider>
              <NotificationSetup />
              <Stack>
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="Login" options={{ headerShown: false }} />
                <Stack.Screen name="Register" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="user" options={{ headerShown: false }} />
                <Stack.Screen name="checkout" options={{ headerShown: false }} />
                <Stack.Screen name="admin" options={{ headerShown: false }} />
                <Stack.Screen name="+not-found" />
              </Stack>
              <StatusBar style="auto" />
            </OrderModalProvider>
          </SafeAreaProvider>
        </ThemeProvider>
      </GestureHandlerRootView>
    </Provider>
  );
}