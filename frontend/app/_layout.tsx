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
import { Alert } from 'react-native';
import { registerForPushNotifications, registerTokenWithServer, setupNotificationListeners, registerBackgroundNotificationHandler } from '@/utils/notificationHelper';
import * as Notifications from 'expo-notifications';
import { addNotification } from '@/redux/slices/notificationSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from '@/env';
import { useAppDispatch } from '@/redux/hooks';
import { OrderModalProvider } from '@/contexts/OrderModalContext';

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

// Define background notification handler
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data;
    
    // Always show notifications as banners without alerts
    const shouldForce = data && (data.forceShow || data.type === 'orderUpdate' || data.immediate);
    
    return {
      shouldShowAlert: true,  // This controls the banner-style notification, not Alert.alert
      shouldPlaySound: true,  // Keep sound
      shouldSetBadge: true,   // Keep badge
      priority: shouldForce ? Notifications.AndroidNotificationPriority.MAX : Notifications.AndroidNotificationPriority.HIGH,
      // On iOS, ensure presentation options
      iOS: {
        sound: true,
        presentAlert: true,
        presentBadge: true,
        presentSound: true
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
  const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
    const data = response.notification.request.content.data;
    
    // Check if this is an order notification
    if ((data?.type === 'orderUpdate' && data?.orderId) || data?.orderId) {
      // Add a notification to the Redux store, which will trigger the UI to show the order details modal
      dispatch(
        addNotification({
          title: response.notification.request.content.title || 'Order Update',
          body: response.notification.request.content.body || 'Your order status has changed',
          data: {
            ...data,
            // Ensure it has the expected format for our NotificationBell component
            type: data.type || 'orderUpdate',
            orderId: data.orderId,
            showModal: true // Add this flag to indicate the modal should be shown
          }
        })
      );
      
      console.log('Notification clicked for order:', data.orderId);
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

  useEffect(() => {
    // Start polling for order updates (every 5 seconds)
    pollForOrderUpdates(); // Initial poll immediately
    pollingInterval.current = setInterval(pollForOrderUpdates, 5000);
    
    // Check for notification receipts every 3 seconds
    const receiptInterval = setInterval(checkNotificationReceipts, 3000);
    
    // Also check the dedicated recent updates endpoint every 4 seconds
    const statusUpdateInterval = setInterval(checkRecentStatusUpdates, 4000);
    
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
    
    // Check for pending notifications on component mount
    checkPendingNotifications();
    
    // Don't request permissions here anymore - permissions will be requested on login instead
    
    // Set up notification listeners
    const cleanupListeners = setupNotificationListeners((notification: Notifications.Notification) => {
      // Handle incoming notifications while the app is open
      const { title, body, data } = notification.request.content;
      console.log('Received notification:', { title, body, data });
      
      // Only add to Redux store if it's not an order update or doesn't have orderId/status
      // This prevents multiple Redux entries for the same notification
      const isOrderUpdate = data && data.type === 'orderUpdate' && data.orderId && data.status;
      
      if (title && !isOrderUpdate) {
        // For order updates, we'll rely on the direct methods to add to Redux
        // Only add non-order updates to Redux through listener
        dispatch(addNotification({
          title: title || 'New Notification',
          body: body || '',
          data: {
            ...data as Record<string, any>,
            source: 'listener',  // Mark the source
            showModal: true // Add this flag for the OrderModalContext
          }
        }));
      }
      
      // Remove Alert.alert for notifications - we only want the banner notifications
      // Do not show Alert dialogs anymore
    });

    // Set up notification response handler for when users tap on notifications
    const responseListener = Notifications.addNotificationResponseReceivedListener(
      handleNotificationResponse
    );

    // Clean up listeners and intervals when the component unmounts
    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
      clearInterval(receiptInterval);
      clearInterval(statusUpdateInterval);
      cleanupListeners();
      Notifications.removeNotificationSubscription(responseListener);
    };
  }, [dispatch]);

  return null;
}

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
    }
  }, [loaded]);

  // Add this effect to check for notification that launched the app
  useEffect(() => {
    // Check if app was opened from a notification
    const getInitialNotification = async () => {
      try {
        const response = await Notifications.getLastNotificationResponseAsync();
        
        // If app was opened from a notification, process it
        if (response) {
          console.log('App opened from notification:', response.notification.request.content);
          
          // Get the data from the notification
          const data = response.notification.request.content.data;
          
          // If this is an order notification, add it to the store with the showModal flag
          if ((data?.type === 'orderUpdate' && data?.orderId) || data?.orderId) {
            console.log('Initial notification has order ID:', data.orderId);
            
            // We need to delay this slightly to ensure the store is ready
            setTimeout(() => {
              store.dispatch(
                addNotification({
                  title: response.notification.request.content.title || 'Order Update',
                  body: response.notification.request.content.body || 'Your order status has changed',
                  data: {
                    ...data,
                    type: data.type || 'orderUpdate',
                    orderId: data.orderId,
                    showModal: true // This is important to trigger the modal
                  }
                })
              );
            }, 1000);
          }
        }
      } catch (error) {
        console.error('Error checking initial notification:', error);
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