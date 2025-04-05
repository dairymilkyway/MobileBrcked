import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  FlatList, 
  Pressable,
  Platform,
  ActivityIndicator
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../redux/store';
import { 
  markAllAsRead, 
  markAsRead, 
  clearNotifications, 
  addNotification, 
  setNotifications, 
  loadNotificationsFromStorage 
} from '../redux/slices/notificationSlice';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useOrderModal } from '@/contexts/OrderModalContext';
import { fetchUserNotifications } from '@/utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// LEGO brand colors
const LEGO_COLORS = {
  yellow: '#FFD500',
  red: '#E3000B',
  blue: '#006DB7',
  green: '#00AF4D',
  black: '#000000',
  darkGrey: '#333333',
  lightGrey: '#F2F2F2',
  white: '#FFFFFF',
};

// LEGO-inspired shadow
const LEGO_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.25,
  shadowRadius: 3.84,
  elevation: 5,
};

export default function NotificationBell() {
  const [modalVisible, setModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { notifications, unreadCount, isLoaded } = useSelector((state: RootState) => state.notifications);
  const dispatch = useDispatch();
  const router = useRouter();
  const { showOrderModal } = useOrderModal();

  // Initialize notifications from storage when component mounts
  useEffect(() => {
    const initializeNotifications = async () => {
      // Check if we already have notifications loaded
      if (isLoaded) {
        return;
      }
      
      // Check if user is logged in
      const userToken = await AsyncStorage.getItem('userToken');
      if (!userToken) {
        console.log(`${Platform.OS}: No user token, skipping notification loading`);
        return;
      }
      
      setIsLoading(true);
      try {
        // Try to load from AsyncStorage first
        const storedNotifications = await loadNotificationsFromStorage();
        
        if (storedNotifications && storedNotifications.length > 0) {
          console.log(`${Platform.OS}: Loaded ${storedNotifications.length} notifications from storage`);
          dispatch(setNotifications(storedNotifications));
          
          // We still fetch from API in background to ensure we have the latest
          fetchNotifications(false);
        } else {
          // If nothing in storage, fetch from API
          await fetchNotifications(true);
        }
      } catch (error) {
        console.error(`${Platform.OS}: Error initializing notifications:`, error);
        setIsLoading(false);
      }
    };
    
    initializeNotifications();
  }, [dispatch, isLoaded]);

  // Helper function to render LEGO studs
  const renderStuds = (count: number) => {
    const studs = [];
    for (let i = 0; i < count; i++) {
      studs.push(
        <View key={i} style={styles.stud}>
          <View style={styles.studInner} />
        </View>
      );
    }
    return studs;
  };

  const handleOpenNotifications = async () => {
    setModalVisible(true);
    
    // If notifications haven't been loaded yet, fetch them
    const loggedIn = await AsyncStorage.getItem('userToken');
    if (loggedIn && !isLoaded && !isLoading) {
      await fetchNotifications(true);
    }
  };

  const fetchNotifications = async (showLoading = true) => {
    if (showLoading) {
      setIsLoading(true);
    }
    
    try {
      const response = await fetchUserNotifications();
      
      if (response.success && response.data) {
        console.log(`${Platform.OS}: Loaded ${response.data.length} notifications from API`);
        dispatch(setNotifications(response.data));
      }
    } catch (error) {
      console.error(`${Platform.OS}: Error loading notifications:`, error);
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  };

  const handleCloseNotifications = () => {
    setModalVisible(false);
  };

  const handleMarkAllAsRead = () => {
    dispatch(markAllAsRead());
  };

  const handleClearAll = () => {
    dispatch(clearNotifications());
  };

  const handleNotificationPress = (id: string, data?: Record<string, any>) => {
    dispatch(markAsRead(id));
    console.log(`${Platform.OS}: Notification pressed in NotificationBell:`, { id, data });

    // Check if this is an order notification
    if ((data?.type === 'orderUpdate' || data?.type === 'orderPlaced') && data?.orderId) {
      console.log(`${Platform.OS}: Order notification detected, orderId:`, data.orderId);
      
      // First close the notifications modal
      setModalVisible(false);
      
      // Mark this notification as clicked and add platform-specific flags
      data.clicked = true;
      
      // Determine if we need to prevent navigation (always on Android)
      const shouldPreventNavigation = Platform.OS === 'android';
      if (shouldPreventNavigation) {
        data.preventNavigation = true;
      }
      
      // Give the modal time to dismiss before showing order modal
      setTimeout(() => {
        // Use the OrderModalContext to show the order details
        showOrderModal(data.orderId, shouldPreventNavigation);
      }, 100);
      
    } else if (data?.orderId) {
      console.log(`${Platform.OS}: Generic order notification detected, orderId:`, data.orderId);
      
      // Close the notifications modal first
      setModalVisible(false);
      
      // Handle platform-specific behavior
      const shouldPreventNavigation = Platform.OS === 'android';
      
      // Mark this notification as clicked
      if (data) {
        data.clicked = true;
        
        // Add prevention flag for Android
        if (shouldPreventNavigation) {
          data.preventNavigation = true;
        }
      }
      
      // Give the modal time to dismiss before showing order modal
      setTimeout(() => {
        // Use the OrderModalContext to show the order details
        showOrderModal(data.orderId, shouldPreventNavigation);
      }, 100);
    }
  };

  const renderNotificationItem = ({ item }: { item: any }) => (
    <Pressable
      style={[
        styles.notificationItem,
        { backgroundColor: item.read ? LEGO_COLORS.lightGrey : LEGO_COLORS.white }
      ]}
      onPress={() => handleNotificationPress(item.id, item.data)}
    >
      <View style={styles.notificationContent}>
        <Text style={styles.notificationTitle}>{item.title}</Text>
        <Text style={styles.notificationBody}>{item.body}</Text>
        <Text style={styles.notificationTime}>
          {new Date(item.createdAt).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </Text>
      </View>
      {!item.read && (
        <View style={styles.unreadIndicator}>
          <MaterialCommunityIcons name="toy-brick-marker" size={16} color={LEGO_COLORS.red} />
        </View>
      )}
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.iconContainer}
        onPress={handleOpenNotifications}
      >
        <MaterialCommunityIcons 
          name="bell" 
          size={24} 
          color={LEGO_COLORS.darkGrey} 
        />
        
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={handleCloseNotifications}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            {/* LEGO studs at the top of modal */}
            <View style={styles.studsContainer}>
              {renderStuds(8)}
            </View>
            
            <View style={styles.modalHeader}>
              <MaterialCommunityIcons name="toy-brick-outline" size={24} color={LEGO_COLORS.red} />
              <Text style={styles.modalTitle}>Notifications</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={handleCloseNotifications}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleMarkAllAsRead}
              >
                <Text style={styles.actionButtonText}>Mark all as read</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.clearButton]}
                onPress={handleClearAll}
              >
                <Text style={styles.clearButtonText}>Clear all</Text>
              </TouchableOpacity>
            </View>

            {isLoading ? (
              <View style={styles.emptyContainer}>
                <ActivityIndicator size="large" color={LEGO_COLORS.blue} />
                <Text style={styles.emptySubText}>Loading notifications...</Text>
              </View>
            ) : notifications.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="toy-brick-outline" size={64} color={LEGO_COLORS.yellow} />
                <Text style={styles.emptyText}>No notifications</Text>
                <Text style={styles.emptySubText}>You're all caught up!</Text>
              </View>
            ) : (
              <FlatList
                data={notifications}
                renderItem={renderNotificationItem}
                keyExtractor={(item) => item.id}
                style={styles.notificationList}
              />
            )}
            
            {/* LEGO studs at the bottom of modal */}
            <View style={styles.bottomStudsContainer}>
              {renderStuds(8)}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  iconContainer: {
    padding: 8,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    right: -4,
    top: -4,
    backgroundColor: LEGO_COLORS.red,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: LEGO_COLORS.darkGrey,
    ...LEGO_SHADOW,
  },
  badgeText: {
    color: LEGO_COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalView: {
    width: '90%',
    height: '80%',
    backgroundColor: LEGO_COLORS.white,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: LEGO_COLORS.darkGrey,
    ...LEGO_SHADOW,
  },
  studsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: LEGO_COLORS.yellow,
    paddingVertical: 5,
    borderBottomWidth: 2,
    borderBottomColor: LEGO_COLORS.darkGrey,
  },
  stud: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: LEGO_COLORS.yellow,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  studInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  bottomStudsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: LEGO_COLORS.red,
    paddingVertical: 5,
    borderTopWidth: 2,
    borderTopColor: LEGO_COLORS.darkGrey,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: LEGO_COLORS.blue,
    borderBottomWidth: 3,
    borderBottomColor: LEGO_COLORS.darkGrey,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: LEGO_COLORS.white,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    backgroundColor: LEGO_COLORS.red,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: LEGO_COLORS.darkGrey,
  },
  closeButtonText: {
    color: LEGO_COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    padding: 10,
    backgroundColor: LEGO_COLORS.lightGrey,
    borderBottomWidth: 2,
    borderBottomColor: LEGO_COLORS.darkGrey,
  },
  actionButton: {
    padding: 8,
    backgroundColor: LEGO_COLORS.blue,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: LEGO_COLORS.darkGrey,
    paddingHorizontal: 16,
    minWidth: 120,
    alignItems: 'center',
    ...LEGO_SHADOW,
  },
  actionButtonText: {
    color: LEGO_COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  clearButton: {
    backgroundColor: LEGO_COLORS.red,
  },
  clearButtonText: {
    color: LEGO_COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  notificationList: {
    flex: 1,
    backgroundColor: LEGO_COLORS.white,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: LEGO_COLORS.lightGrey,
    alignItems: 'center',
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: LEGO_COLORS.darkGrey,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  notificationBody: {
    fontSize: 14,
    color: LEGO_COLORS.darkGrey,
    marginBottom: 5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  notificationTime: {
    fontSize: 12,
    color: '#777',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  unreadIndicator: {
    marginLeft: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: LEGO_COLORS.white,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: 'bold',
    color: LEGO_COLORS.darkGrey,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  emptySubText: {
    fontSize: 14,
    color: LEGO_COLORS.darkGrey,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    marginTop: 8,
  },
}); 