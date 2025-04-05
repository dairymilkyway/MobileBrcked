import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Button,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { forceRegisterPushToken } from '@/utils/notificationHelper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch } from 'react-redux';
import { addNotification } from '@/redux/slices/notificationSlice';
import axios from 'axios';
import { API_BASE_URL } from '@/env';

export default function NotificationDebugPanel() {
  const dispatch = useDispatch();

  // Test function to trigger a local notification
  const handleTestNotification = async () => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Test Notification",
          body: "This is a test notification from the app",
          data: { type: "test" }
        },
        trigger: null // show immediately
      });
      
      // Also add to Redux store
      dispatch(addNotification({
        title: "Test Notification",
        body: "This is a test notification from the app",
        data: { type: "test" }
      }));
      
      console.log("Test notification scheduled");
      Alert.alert("Success", "Test notification sent");
    } catch (error) {
      console.error("Error scheduling test notification:", error);
      Alert.alert("Error", "Failed to send test notification");
    }
  };
  
  // Force registration of push token
  const handleForceRegisterToken = async () => {
    try {
      const success = await forceRegisterPushToken();
      if (success) {
        Alert.alert("Success", "Push token re-registered successfully");
      } else {
        Alert.alert("Failed", "Failed to re-register push token");
      }
    } catch (error) {
      console.error("Error forcing push token registration:", error);
      Alert.alert("Error", "An error occurred while registering push token");
    }
  };
  
  // Clear all notification storage
  const handleClearNotificationStorage = async () => {
    try {
      await AsyncStorage.removeItem('pushToken');
      await AsyncStorage.removeItem('tokenLastRegistered');
      await AsyncStorage.removeItem('pushNotificationsDenied');
      await AsyncStorage.removeItem('lastPermissionAttempt');
      await AsyncStorage.removeItem('pendingNotifications');
      
      console.log("Notification storage cleared");
      Alert.alert("Success", "Notification storage cleared");
    } catch (error) {
      console.error("Error clearing notification storage:", error);
      Alert.alert("Error", "Failed to clear notification storage");
    }
  };
  
  // View notification storage
  const handleViewNotificationStorage = async () => {
    try {
      const pushToken = await AsyncStorage.getItem('pushToken');
      const tokenLastRegistered = await AsyncStorage.getItem('tokenLastRegistered');
      const lastTimestamp = tokenLastRegistered ? new Date(parseInt(tokenLastRegistered)).toLocaleString() : 'never';
      
      const notificationInfo = `
Push Token: ${pushToken || 'not set'}
Last Registered: ${lastTimestamp}
      `;
      
      Alert.alert("Notification Storage", notificationInfo);
    } catch (error) {
      console.error("Error viewing notification storage:", error);
      Alert.alert("Error", "Failed to view notification storage");
    }
  };

  // Add direct order status test function for your school project
  const handleTestOrderStatusUpdate = async () => {
    try {
      // Get all user orders first
      const userToken = await AsyncStorage.getItem('userToken');
      if (!userToken) {
        Alert.alert("Error", "You need to be logged in to test order notifications");
        return;
      }
      
      // Fetch user orders
      const response = await axios.get(`${API_BASE_URL}/orders`, {
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });
      
      if (!response.data.success || !response.data.data || response.data.data.length === 0) {
        Alert.alert("No Orders Found", "You need to have at least one order to test notifications");
        return;
      }
      
      // Get the first order
      const firstOrder = response.data.data[0];
      const orderId = firstOrder.orderId;
      
      // Create a local notification for a fake status update
      // Cycle through statuses: processing -> shipped -> delivered -> cancelled -> processing
      const currentStatus = firstOrder.status || 'pending';
      let nextStatus = 'processing';
      
      switch (currentStatus) {
        case 'pending':
          nextStatus = 'processing';
          break;
        case 'processing':
          nextStatus = 'shipped';
          break;
        case 'shipped':
          nextStatus = 'delivered';
          break;
        case 'delivered':
          nextStatus = 'cancelled';
          break;
        case 'cancelled':
        default:
          nextStatus = 'processing';
          break;
      }
      
      // Directly create a fake notification without actually changing the order's status
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Order Update',
          body: `Your order #${orderId} status has been updated to: ${nextStatus}`,
          data: { orderId, status: nextStatus, type: 'orderUpdate' }
        },
        trigger: null // null means send immediately
      });
      
      // Also add to Redux store
      dispatch(addNotification({
        title: 'Order Update',
        body: `Your order #${orderId} status has been updated to: ${nextStatus}`,
        data: { orderId, status: nextStatus, type: 'orderUpdate' }
      }));
      
      Alert.alert("Success", `Test notification sent for order #${orderId}\nStatus: ${currentStatus} → ${nextStatus}`);
    } catch (error) {
      console.error("Error testing order status notification:", error);
      Alert.alert("Error", "Failed to test order status notification");
    }
  };

  const handleTestOrderModal = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert("Error", "You need to be logged in to test order notifications");
        return;
      }

      // Get the most recent order for the current user
      const response = await axios.get(`${API_BASE_URL}/api/orders/user`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.data.success || !response.data.data || response.data.data.length === 0) {
        Alert.alert("No Orders Found", "You need to have at least one order to test the modal");
        return;
      }

      // Use the first order from the response
      const orderId = response.data.data[0].orderId;

      // Call the test endpoint
      const testResponse = await axios.post(
        `${API_BASE_URL}/api/test/simulate-order-notification`,
        { orderId },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (testResponse.data.success) {
        Alert.alert("Success", "Order notification sent. Check your notifications.");
      } else {
        Alert.alert("Error", testResponse.data.message || "Failed to send test notification");
      }
    } catch (error) {
      console.error('Error testing order modal notification:', error);
      Alert.alert("Error", "Failed to send test order notification");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Push Notification Debug</Text>
      </View>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.button} 
          onPress={handleTestNotification}
        >
          <Text style={styles.buttonText}>Send Test Notification</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={handleForceRegisterToken}
        >
          <Text style={styles.buttonText}>Force Register Token</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={handleViewNotificationStorage}
        >
          <Text style={styles.buttonText}>View Token Info</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.dangerButton]} 
          onPress={handleClearNotificationStorage}
        >
          <Text style={styles.buttonText}>Clear Notification Storage</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={handleTestOrderStatusUpdate}
        >
          <Text style={styles.buttonText}>Test Order Status Update</Text>
        </TouchableOpacity>
        
        <Button
          title="Test Order Modal"
          onPress={handleTestOrderModal}
          color="#8E44AD"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 10,
  },
  header: {
    backgroundColor: '#0055A4',
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  headerText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  buttonContainer: {
    padding: 10,
  },
  button: {
    backgroundColor: '#006DB7',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 4,
    marginBottom: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  dangerButton: {
    backgroundColor: '#DA291C',
  },
}); 