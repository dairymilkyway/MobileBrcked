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
      
      // Add a specific channel for order updates - important for school project
      Notifications.setNotificationChannelAsync('order-updates', {
        name: 'Order Updates',
        description: 'Notifications about your order status changes',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FFE500',
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
    const storedToken = await AsyncStorage.getItem('pushToken');
    const userToken = await AsyncStorage.getItem('userToken');
    
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
      const REGISTRATION_INTERVAL = 3600000; // Changed to 1 hour
      
      // Only re-register if it's been more than the interval
      if (lastRegistered && (now - parseInt(lastRegistered)) < REGISTRATION_INTERVAL) {
        console.log(`Token already registered recently (within last ${REGISTRATION_INTERVAL/3600000} hour(s)), skipping`);
        return true;
      }
    }
    
    console.log('Registering push token with server at:', API_BASE_URL);
    
    // Register the token with our server
    const response = await axios.post(`${API_BASE_URL}/users/register-push-token`, 
      { pushToken: token },
      { 
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        } 
      }
    );
    
    if (response.data.success) {
      console.log('Push token registered successfully with server');
      // Store the registration time
      await AsyncStorage.setItem('tokenLastRegistered', new Date().getTime().toString());
      return true;
    } else {
      console.warn('Server returned unsuccessful response:', response.data);
      return false;
    }
  } catch (error) {
    console.error('Error registering push token with server:', error.message);
    if (error.response) {
      console.error('Server response:', error.response.data);
      console.error('Status code:', error.response.status);
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
  const notificationListener = Notifications.addNotificationReceivedListener(notification => {
    if (onNotification) {
      onNotification(notification);
    }
  });

  // Handle notifications that are tapped by the user
  const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
    const { notification } = response;
    
    // Here you can navigate to specific screens based on the notification data
    if (notification.request.content.data.orderId) {
      // Navigate to order details screen
      // You would need to implement this navigation in your app
    }
  });

  // Return a cleanup function
  return () => {
    Notifications.removeNotificationSubscription(notificationListener);
    Notifications.removeNotificationSubscription(responseListener);
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
    // Check if user has the correct role (only register for regular users)
    const userRole = await AsyncStorage.getItem('userRole');
    if (userRole !== 'user') {
      console.log(`User has role '${userRole}', not registering push token for non-user roles`);
      return false;
    }
    
    // Instead of checking for existing token, always request permissions and get a fresh token
    console.log('Requesting push notification permissions after login...');
    const newToken = await registerForPushNotifications();
    
    if (!newToken) {
      console.log('Failed to get push token after login');
      return false;
    }
    
    const userToken = await AsyncStorage.getItem('userToken');
    
    if (!userToken) {
      console.log('User is not logged in, cannot register push token');
      return false;
    }
    
    console.log('User is logged in with role "user", registering push token with server...');
    
    // Register with server, passing the force parameter
    return registerTokenWithServer(newToken, force);
  } catch (error) {
    console.error('Error registering push token after login:', error);
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

export default {
  registerForPushNotifications,
  registerTokenWithServer,
  setupNotificationListeners,
  registerPushTokenAfterLogin,
  forceRegisterPushToken,
}; 