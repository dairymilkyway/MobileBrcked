import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Animated, 
  Dimensions, 
  StatusBar,
  SafeAreaView,
  Platform,
  Alert,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter, Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PanGestureHandler } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.7;
const MINIMUM_GESTURE = 20;

interface AdminSidebarProps {
  children: React.ReactNode;
}

// Define types for menu items
interface MenuItem {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
}

const AdminSidebar = ({ children }: AdminSidebarProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  const toggleDrawer = () => {
    const toValue = isOpen ? -DRAWER_WIDTH : 0;
    const overlayToValue = isOpen ? 0 : 0.5;

    Animated.parallel([
      Animated.timing(translateX, {
        toValue,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: overlayToValue,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    setIsOpen(!isOpen);
  };

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.oldState === 4) {
      const { translationX } = event.nativeEvent;
      
      if (isOpen) {
        if (translationX < -MINIMUM_GESTURE) {
          toggleDrawer();
        } else {
          // Reset to open position
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      } else {
        if (translationX > MINIMUM_GESTURE) {
          toggleDrawer();
        } else {
          // Reset to closed position
          Animated.spring(translateX, {
            toValue: -DRAWER_WIDTH,
            useNativeDriver: true,
          }).start();
        }
      }
    }
  };

  const navigateTo = (route: string) => {
    router.push(route as Href);
    if (width < 768) {
      toggleDrawer();
    }
  };

  // Keep drawer open on larger screens
  useEffect(() => {
    const updateDrawerState = () => {
      const newWidth = Dimensions.get('window').width;
      if (newWidth >= 768) {
        translateX.setValue(0);
        setIsOpen(true);
      } else if (!isOpen) {
        translateX.setValue(-DRAWER_WIDTH);
      }
    };

    const subscription = Dimensions.addEventListener('change', updateDrawerState);
    updateDrawerState();

    return () => subscription.remove();
  }, [isOpen]);

  // Menu items
  const menuItems: MenuItem[] = [
    { title: 'Dashboard', icon: 'grid-outline', route: '/admin/dashboard' },
    { title: 'Products', icon: 'cube-outline', route: '/admin/products' },
    { title: 'Orders', icon: 'cart-outline', route: '/admin/orders' },
    { title: 'Users', icon: 'people-outline' as keyof typeof Ionicons.glyphMap, route: '/admin/users' },
    { title: 'Reviews', icon: 'star-outline' as keyof typeof Ionicons.glyphMap, route: '/admin/reviews' },
  ];

  const isActive = (route: string) => {
    return pathname === route;
  };

  const handleLogout = async () => {
    try {
      // Clear the user token and role from AsyncStorage
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userRole');
      
      // Navigate back to the login screen
      router.replace('/Login');
    } catch (error) {
      console.error('Error during logout:', error);
      Alert.alert('Error', 'There was a problem logging out. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Overlay */}
      {width < 768 && (
        <Animated.View
          style={[
            styles.overlay,
            {
              opacity: overlayOpacity,
              display: isOpen ? 'flex' : 'none',
            },
          ]}
          pointerEvents={isOpen ? 'auto' : 'none'}
          onTouchEnd={toggleDrawer}
        />
      )}

      {/* Drawer */}
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
      >
        <Animated.View
          style={[
            styles.drawer,
            {
              transform: [
                {
                  translateX: translateX.interpolate({
                    inputRange: [-DRAWER_WIDTH, 0],
                    outputRange: [-DRAWER_WIDTH, 0],
                    extrapolate: 'clamp',
                  }),
                },
              ],
              paddingTop: insets.top,
              width: DRAWER_WIDTH,
            },
          ]}
        >
          <View style={styles.drawerHeader}>
            <Text style={styles.logo}>BRCKED</Text>
            <Text style={styles.logoSub}>Admin</Text>
          </View>

          <View style={styles.drawerContent}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.menuItem,
                  isActive(item.route) && styles.activeMenuItem,
                ]}
                onPress={() => navigateTo(item.route)}
              >
                <Ionicons
                  name={item.icon}
                  size={24}
                  color={isActive(item.route) ? '#ffffff' : '#333333'}
                />
                <Text
                  style={[
                    styles.menuItemText,
                    isActive(item.route) && styles.activeMenuItemText,
                  ]}
                >
                  {item.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Logout Button */}
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() => setShowLogoutModal(true)}
          >
            <Ionicons
              name="log-out-outline"
              size={24}
              color="#c41818"
            />
            <Text style={styles.logoutButtonText}>
              Logout
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </PanGestureHandler>

      {/* Logout Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showLogoutModal}
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="warning-outline" size={50} color="#c41818" />
              <Text style={styles.modalTitle}>Confirm Logout</Text>
            </View>
            
            <Text style={styles.modalText}>
              Are you sure you want to log out?
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleLogout}
              >
                <Text style={styles.confirmButtonText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Main Content */}
      <Animated.View
        style={[
          styles.content,
          {
            marginLeft: width >= 768 ? DRAWER_WIDTH : 0,
          },
        ]}
      >
        {/* Toggle Button (Mobile only) - Arrow on left center side */}
        {width < 768 && (
          <TouchableOpacity
            style={styles.menuButton}
            onPress={toggleDrawer}
            activeOpacity={0.8}
          >
            <Ionicons 
              name={isOpen ? "chevron-back-outline" : "chevron-forward-outline"} 
              size={24} 
              color="#ffffff" 
            />
          </TouchableOpacity>
        )}

        {children}
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
    zIndex: 2,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 2,
      height: 0,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    zIndex: 1,
  },
  drawerHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#c41818',
  },
  logoSub: {
    fontSize: 14,
    color: '#666',
  },
  drawerContent: {
    flex: 1,
    paddingTop: 10,
    paddingHorizontal: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  activeMenuItem: {
    backgroundColor: '#c41818',
  },
  menuItemText: {
    marginLeft: 16,
    fontSize: 16,
    color: '#333333',
  },
  activeMenuItemText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    zIndex: 0,
  },
  menuButton: {
    position: 'absolute',
    top: '50%',
    left: 0,
    zIndex: 10,
    padding: 10,
    paddingLeft: 5,
    paddingRight: 12,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    backgroundColor: '#c41818',
    transform: [{ translateY: -25 }],
    shadowColor: '#000',
    shadowOffset: {
      width: 2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  logoutButtonText: {
    marginLeft: 16,
    fontSize: 16,
    color: '#c41818',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '80%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 12,
  },
  modalText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: 'bold',
  },
  confirmButton: {
    backgroundColor: '#c41818',
    marginLeft: 8,
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default AdminSidebar;
export { AdminSidebar }; 