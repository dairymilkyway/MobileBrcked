import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { API_BASE_URL } from '../env';

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Create a global notification tracker for products
let notifiedProducts = {};
let notifiedProductsLoaded = false;

// Load notified products from storage immediately
const loadNotifiedProductsPromise = (async function loadNotifiedProducts() {
  try {
    if (notifiedProductsLoaded) return; // Already loaded
    
    const stored = await AsyncStorage.getItem('globalNotifiedProducts');
    if (stored) {
      notifiedProducts = JSON.parse(stored);
      console.log(`Loaded ${Object.keys(notifiedProducts).length} previously notified products`);
    }
    notifiedProductsLoaded = true;
  } catch (error) {
    console.error('Error loading notified products:', error);
  }
})();

/**
 * Register for push notifications
 * @returns {Promise<string|null>} The Expo push token or null if registration failed
 */
export const registerForPushNotifications = async () => {
  let token;
  
  // Check if the device is physical (not an emulator)
  if (!Device.isDevice) {
    console.log('Push notifications are not available on emulators/simulators');
    return null;
  }

  try {
    // Check if we have permission to send notifications
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    // If we don't have permission, ask for it
    if (existingStatus !== 'granted') {
      console.log('Requesting push notification permissions...');
      // Custom configuration for permission requests - school project focused on order status updates
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowDisplayInCarPlay: false,
          allowCriticalAlerts: false,
          provideAppNotificationSettings: true,
          allowProvisional: true,
          allowAnnouncements: false,
        },
      });
      finalStatus = status;
      console.log('Push notification permission status:', status);
    }
    
    // If we still don't have permission, we can't send notifications
    if (finalStatus !== 'granted') {
      console.log('Permission for push notifications was denied');
      // Store that the user has denied permissions to prevent asking again too soon
      await AsyncStorage.setItem('pushNotificationsDenied', 'true');
      return null;
    }
    
    // Permission was granted, clear the denied flag if it was set
    await AsyncStorage.removeItem('pushNotificationsDenied');
    
    // Get the Expo push token
    console.log('Getting push token...');
    const { data: tokenData } = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId || '3d96ba34-3d1b-4801-89d4-58202d1038e3',
    });
    
    token = tokenData;
    console.log('Push token received:', token);
    
    // Configure Android channel (required for Android)
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
      
      // Add a specific channel for order updates
      Notifications.setNotificationChannelAsync('order-updates', {
        name: 'Order Updates',
        description: 'Notifications about your order status changes',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FFE500',
      });
      
      // Add a specific channel for product updates
      Notifications.setNotificationChannelAsync('product-updates', {
        name: 'Product Updates',
        description: 'Notifications about new products',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#00E5FF',
      });
    }
    
    // Store the token locally
    await AsyncStorage.setItem('pushToken', token);
    
    return token;
  } catch (error) {
    console.error('Error in registerForPushNotifications:', error);
    return null;
  }
};

/**
 * Register push token with our backend
 * @param {string} token - Expo push token
 * @param {boolean} force - Force registration even if recently registered
 * @returns {Promise<boolean>} Whether the registration was successful
 */
export const registerTokenWithServer = async (token, force = false) => {
  try {
    console.log('Starting push token registration with server...');
    
    const storedToken = await AsyncStorage.getItem('pushToken');
    const userToken = await AsyncStorage.getItem('userToken');
    
    console.log('Token registration - stored push token exists:', !!storedToken);
    console.log('Token registration - received new token:', token);
    console.log('Token registration - user token exists:', !!userToken);
    
    // If there's no user token, we can't register the push token
    if (!userToken) {
      console.log('No user token available, cannot register push token');
      return false;
    }
    
    // If we already registered this token, don't register again (unless forced)
    if (!force && storedToken === token) {
      const lastRegistered = await AsyncStorage.getItem('tokenLastRegistered');
      const now = new Date().getTime();
      
      // Time between registrations (in milliseconds)
      // 3600000 = 1 hour, 86400000 = 24 hours
      const REGISTRATION_INTERVAL = 3600000; // 1 hour
      
      // Only re-register if it's been more than the interval
      if (lastRegistered && (now - parseInt(lastRegistered)) < REGISTRATION_INTERVAL) {
        console.log(`Token already registered recently (within last ${REGISTRATION_INTERVAL/3600000} hour(s)), skipping`);
        return true;
      }
    }
    
    console.log('Getting device info for token registration...');
    
    // Get device info to store with token
    let deviceInfo = 'unknown device';
    try {
      deviceInfo = await getDeviceInfo();
      console.log('Device info:', deviceInfo);
    } catch (deviceError) {
      console.error('Error getting device info, using fallback:', deviceError);
      deviceInfo = `${Platform.OS} device`;
    }
    
    console.log(`Sending POST request to ${API_BASE_URL}/users/register-push-token`);
    
    // Try to register the token with our server
    try {
      const response = await axios.post(`${API_BASE_URL}/users/register-push-token`, 
        { 
          pushToken: token,
          deviceInfo: deviceInfo
        },
        { 
          headers: {
            'Authorization': `Bearer ${userToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000 // 10 second timeout
        }
      );
      
      console.log('Token registration response status:', response.status);
      
      if (response.data && response.data.success) {
        console.log('Push token registered successfully with server');
        // Store the registration time
        const now = new Date().getTime();
        await AsyncStorage.setItem('tokenLastRegistered', now.toString());
        await AsyncStorage.setItem('pushToken', token);
        console.log('Token stored locally with timestamp:', now);
        return true;
      } else {
        console.warn('Server returned unsuccessful response:', JSON.stringify(response.data));
        // Still store the token locally to prevent excessive retries
        await AsyncStorage.setItem('pushToken', token);
        await AsyncStorage.setItem('tokenLastRegistered', new Date().getTime().toString());
        return false;
      }
    } catch (apiError) {
      console.error('Error calling register-push-token API:', apiError.message);
      
      if (apiError.response) {
        console.error('Server response status:', apiError.response.status);
        console.error('Server response data:', JSON.stringify(apiError.response.data));
        
        // For certain status codes, we'll still store the token locally
        if (apiError.response.status === 500 || apiError.response.status === 503) {
          console.log('Server error, storing token locally to prevent repeated attempts');
          await AsyncStorage.setItem('pushToken', token);
          await AsyncStorage.setItem('tokenLastRegistered', new Date().getTime().toString());
        }
      } else if (apiError.request) {
        console.error('No response received from server. Request data:', JSON.stringify(apiError.request));
        
        // If it's a network error, store the token locally to prevent repeated attempts
        console.log('Network error, storing token locally to prevent repeated attempts');
        await AsyncStorage.setItem('pushToken', token);
        await AsyncStorage.setItem('tokenLastRegistered', new Date().getTime().toString());
      }
      
      return false;
    }
  } catch (error) {
    console.error('Error in registerTokenWithServer function:', error.message);
    
    // Still store the token locally in case of errors to prevent excessive retries
    try {
      await AsyncStorage.setItem('pushToken', token);
      await AsyncStorage.setItem('tokenLastRegistered', new Date().getTime().toString());
      console.log('Stored token locally despite error');
    } catch (storageError) {
      console.error('Error storing token locally:', storageError);
    }
    
    return false;
  }
};

/**
 * Get device information for token tracking
 * @returns {Promise<string>} Device information string
 */
const getDeviceInfo = async () => {
  try {
    let deviceName = 'Unknown Device';
    
    // Check if the getDeviceNameAsync function exists before calling it
    if (Device && typeof Device.getDeviceNameAsync === 'function') {
      try {
        deviceName = await Device.getDeviceNameAsync();
      } catch (nameError) {
        console.log('Error getting device name:', nameError);
      }
    } else if (Device && Device.modelName) {
      // Fallback to modelName if available
      deviceName = Device.modelName;
    }
    
    // Get device type safely
    const deviceType = Device && Device.deviceType ? Device.deviceType : 'unknown';
    
    // Get OS version safely
    const platformVersion = Device && Device.osVersion ? Device.osVersion : Platform.Version || 'unknown';
    
    return `${deviceName} (${Platform.OS} ${platformVersion}, ${deviceType})`;
  } catch (error) {
    console.error('Error getting device info:', error);
    return `${Platform.OS} device`;
  }
};

/**
 * Remove push token from server on logout
 * @returns {Promise<boolean>} Whether removal was successful
 */
export const removePushTokenOnLogout = async () => {
  try {
    console.log('Starting push token removal process...');
    
    const token = await AsyncStorage.getItem('pushToken');
    const userToken = await AsyncStorage.getItem('userToken');
    
    console.log('Token removal check - pushToken exists:', !!token);
    console.log('Token removal check - userToken exists:', !!userToken);
    
    if (!token || !userToken) {
      console.log('No push token or user token available, nothing to remove');
      // Clean up local storage anyway
      await AsyncStorage.removeItem('pushToken');
      await AsyncStorage.removeItem('tokenLastRegistered');
      return true;
    }
    
    try {
      // Notify server to remove the token
      console.log(`Attempting to remove push token from server: ${API_BASE_URL}/users/remove-push-token`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await axios.delete(`${API_BASE_URL}/users/remove-push-token`, {
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        },
        data: { pushToken: token },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      console.log('Push token removal response status:', response.status);
      
      if (response.data && response.data.success) {
        console.log('Push token removed successfully from server');
      } else {
        console.warn('Server returned unsuccessful response:', response.data);
      }
    } catch (apiError) {
      // If we get a 404, the endpoint might not exist yet, which is okay
      if (apiError.response && apiError.response.status === 404) {
        console.log('Token removal endpoint not found (404), continuing with logout...');
      } else if (apiError.name === 'AbortError' || apiError.code === 'ECONNABORTED') {
        console.log('Token removal request timed out, continuing with logout...');
      } else {
        console.error('Error calling remove-push-token API:', apiError.message);
        console.log('Continuing with logout despite token removal error');
      }
    }
    
    // Always clean up local storage regardless of server response
    console.log('Clearing push token from local storage');
    await AsyncStorage.removeItem('pushToken');
    await AsyncStorage.removeItem('tokenLastRegistered');
    return true;
  } catch (error) {
    console.error('Error removing push token:', error.message);
    // Still clear local storage even if there was an error
    try {
      await AsyncStorage.removeItem('pushToken');
      await AsyncStorage.removeItem('tokenLastRegistered');
    } catch (storageError) {
      console.error('Error clearing token from storage:', storageError);
    }
    return false;
  }
};

/**
 * Set up notification listeners
 * @param {Function} onNotification - Callback for when a notification is received
 * @returns {Function} Cleanup function to remove listeners
 */
export const setupNotificationListeners = (onNotification) => {
  // Handle notifications that are received while the app is foregrounded
  const notificationListener = Notifications.addNotificationReceivedListener(async (notification) => {
    try {
      const data = notification.request.content.data;
      
      // Fast path for product notifications (optimized for speed)
      if (data && data.type === 'newProduct' && data.productId) {
        const productId = data.productId;
        
        // Fast memory check first
        if (notifiedProducts[productId]) {
          console.log(`[Fast] Product ${productId} already notified, skipping`);
          return; // Skip notification completely
        }
        
        // Process the notification immediately before full check
        // This ensures the user sees the notification quickly
        if (onNotification) {
          console.log(`[Fast] Processing first-time product notification ${productId}`);
          onNotification(notification);
        }
        
        // Then mark as notified asynchronously (don't await)
        markProductAsNotified(productId)
          .then(() => console.log(`Product ${productId} marked as notified after display`))
          .catch(error => console.error('Error marking product as notified:', error));
        
        return;
      }
      
      // For non-product notifications, process normally
      if (onNotification) {
        onNotification(notification);
      }
    } catch (error) {
      console.error('[Notification Listener] Error processing notification:', error);
      // Still process the notification in case of error
      if (onNotification) {
        onNotification(notification);
      }
    }
  });

  // Return a cleanup function
  return () => {
    Notifications.removeNotificationSubscription(notificationListener);
  };
};

/**
 * Register push token with server after successful login
 * This should be called after the user has logged in successfully
 * Only registers tokens for users with role 'user'
 * @param {boolean} force - Force registration even if recently registered
 * @returns {Promise<boolean>} Whether the registration was successful
 */
export const registerPushTokenAfterLogin = async (force = false) => {
  try {
    console.log('Starting push token registration after login...');
    
    // Check if user has the correct role (only register for regular users)
    const userRole = await AsyncStorage.getItem('userRole');
    const userToken = await AsyncStorage.getItem('userToken');
    
    console.log('Login push token check - userRole:', userRole);
    console.log('Login push token check - userToken exists:', !!userToken);
    
    if (userRole !== 'user') {
      console.log(`User has role '${userRole}', not registering push token for non-user roles`);
      return false;
    }
    
    if (!userToken) {
      console.log('No user auth token available, cannot register push token');
      return false;
    }
    
    // Clear any existing registration timestamp if forcing
    if (force) {
      await AsyncStorage.removeItem('tokenLastRegistered');
      console.log('Force flag set, cleared last registration timestamp');
    }
    
    // Instead of checking for existing token, always request permissions and get a fresh token
    console.log('Requesting push notification permissions after login...');
    const newToken = await registerForPushNotifications();
    
    if (!newToken) {
      console.log('Failed to get push token after login, permissions may have been denied');
      return false;
    }
    
    console.log('New push token obtained:', newToken);
    console.log('User is logged in with role "user", registering push token with server...');
    
    // Register with server, passing the force parameter
    const registered = await registerTokenWithServer(newToken, force);
    
    if (registered) {
      console.log('Push token successfully registered with server');
      return true;
    } else {
      console.warn('Server registration of push token failed');
      return false;
    }
  } catch (error) {
    console.error('Error registering push token after login:', error);
    console.error('Full error:', JSON.stringify(error));
    return false;
  }
};

/**
 * Force re-registration of push token with server
 * This will clear the last registration timestamp and trigger a new registration
 * @returns {Promise<boolean>} Whether the registration was successful
 */
export const forceRegisterPushToken = async () => {
  try {
    // Clear the last registration timestamp
    await AsyncStorage.removeItem('tokenLastRegistered');
    console.log('Cleared last registration timestamp, forcing re-registration');
    
    // Register the token
    return registerPushTokenAfterLogin(true);
  } catch (error) {
    console.error('Error forcing push token registration:', error);
    return false;
  }
};

// Add this function to directly handle notification responses
export const registerBackgroundNotificationHandler = () => {
  // When app is in background, this taskName will be triggered
  const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND_NOTIFICATION_TASK';

  // Define the task that will run when a notification is opened from background
  Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK, async ({ data, error, executionInfo }) => {
    if (error) {
      console.error("Error in background notification task:", error);
      return;
    }

    try {
      console.log("Background notification task triggered with data:", data);
      
      // Fast path for product notifications
      if (data?.type === 'newProduct' && data?.productId) {
        const productId = data.productId;
        
        // First check in-memory cache for faster processing
        if (notifiedProducts[productId]) {
          console.log(`Product ${productId} already notified (fast path), ignoring`);
          return;
        }
        
        // Then do full check if not found in memory
        const alreadyNotified = await hasProductBeenNotified(productId);
        if (alreadyNotified) {
          console.log(`Product ${productId} has already been notified, ignoring`);
          return;
        }
        
        console.log("BACKGROUND NEW PRODUCT NOTIFICATION RECEIVED:", {
          productId,
          type: data.type,
          timestamp: Date.now()
        });
        
        // Use a faster path to store pending product notification directly
        try {
          // Store the data for the app to handle when it opens
          const pendingProductsStr = await AsyncStorage.getItem('pendingProductModals');
          const pendingProducts = pendingProductsStr ? JSON.parse(pendingProductsStr) : [];
          
          pendingProducts.push({
            productId,
            type: data.type,
            timestamp: Date.now(),
            showModal: true,
            forceShow: true,
            immediate: true,
            priority: 'high',
            title: '🔥 New Product Alert! 🛍️',
            body: `✨ Check out our new product! 🤩`
          });
          
          // Perform operations in parallel for speed
          await Promise.all([
            AsyncStorage.setItem('pendingProductModals', JSON.stringify(pendingProducts)),
            markProductAsNotified(productId)
          ]);
          
          console.log(`Added new product ${productId} to pending modals (fast processing)`);
        } catch (storageError) {
          console.error("Error storing product notification:", storageError);
        }
        
        return; // Fast path returns early
      }
      
      // Regular path for order notifications
      if ((data.type === 'orderUpdate' || data.type === 'orderPlaced') && data.orderId) {
        console.log(`Background notification for ${data.type} received with orderId:`, data.orderId);
        
        if (data.type === 'orderPlaced') {
          console.log("BACKGROUND ORDER PLACED NOTIFICATION RECEIVED:", {
            orderId: data.orderId,
            type: data.type,
            timestamp: Date.now()
          });
        }
        
        // Store the data for the app to handle when it opens
        const pendingOrders = await AsyncStorage.getItem('pendingOrderModals') || '[]';
        const orders = JSON.parse(pendingOrders);
        
        // Add this order to the pending list if not already there
        if (!orders.some(order => order.orderId === data.orderId)) {
          orders.push({
            orderId: data.orderId,
            status: data.status || 'pending',
            type: data.type,
            timestamp: Date.now(),
            showModal: true,
            forceShow: true,
            immediate: true
          });
          
          await AsyncStorage.setItem('pendingOrderModals', JSON.stringify(orders));
          console.log(`Added ${data.type} for order ${data.orderId} to pending modals`);
        }
      }
    } catch (error) {
      console.error("Error processing background notification:", error);
    }
  });
};

/**
 * Check if a product has already been notified to the user
 * @param {string} productId - The product ID to check
 * @returns {Promise<boolean>} - Whether the product has been notified
 */
export const hasProductBeenNotified = async (productId) => {
  // First check in-memory cache (faster)
  if (notifiedProducts[productId]) {
    return true;
  }
  
  // Wait for initial loading to complete if it hasn't already
  if (!notifiedProductsLoaded) {
    try {
      await loadNotifiedProductsPromise;
    } catch (error) {
      console.error('Error waiting for notified products to load:', error);
    }
    
    // Check again after loading
    if (notifiedProducts[productId]) {
      return true;
    }
  }
  
  // Then check in storage (in case the app was restarted)
  try {
    const stored = await AsyncStorage.getItem('globalNotifiedProducts');
    if (stored) {
      const storedProducts = JSON.parse(stored);
      if (storedProducts[productId]) {
        // Update in-memory cache
        notifiedProducts = storedProducts;
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('Error checking if product has been notified:', error);
    return false;
  }
};

/**
 * Mark a product as notified to prevent duplicate notifications
 * @param {string} productId - The product ID to mark
 */
export const markProductAsNotified = async (productId) => {
  try {
    // Update in-memory cache
    notifiedProducts[productId] = Date.now();
    
    // Update storage
    await AsyncStorage.setItem('globalNotifiedProducts', JSON.stringify(notifiedProducts));
    console.log(`Product ${productId} marked as notified permanently`);
  } catch (error) {
    console.error('Error marking product as notified:', error);
  }
};

export default {
  registerForPushNotifications,
  registerTokenWithServer,
  setupNotificationListeners,
  registerPushTokenAfterLogin,
  forceRegisterPushToken,
  registerBackgroundNotificationHandler,
  removePushTokenOnLogout,
  hasProductBeenNotified,
  markProductAsNotified,
}; 