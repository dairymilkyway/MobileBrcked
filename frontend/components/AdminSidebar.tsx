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
import { logout } from '@/utils/api';
import { useDispatch } from 'react-redux';
import { clearNotifications } from '@/redux/slices/notificationSlice';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.7;
const MINIMUM_GESTURE = 20;

// LEGO brand colors for consistent theming
const LEGO_COLORS = {
  red: '#E3000B',
  yellow: '#FFD500',
  blue: '#006DB7',
  green: '#00AF4D',
  black: '#000000',
  darkGrey: '#333333',
  lightGrey: '#F2F2F2',
  white: '#FFFFFF',
};

// LEGO-inspired shadow for 3D effect
const LEGO_SHADOW = {
  shadowColor: LEGO_COLORS.black,
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.25,
  shadowRadius: 4,
  elevation: 6,
};

// LEGO stud design for decorative elements
const Stud = ({ color = LEGO_COLORS.red, size = 12 }) => (
  <View style={{
    width: size,
    height: size,
    borderRadius: size/2,
    backgroundColor: color,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
    marginHorizontal: 3,
  }} />
);

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
  const dispatch = useDispatch();

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
    setShowLogoutModal(false);
    
    try {
      // Call logout utility function
      await logout();
      
      // Clear notifications from Redux store
      dispatch(clearNotifications());
      
      // Navigate back to the login screen
      router.replace('/Login');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={LEGO_COLORS.red} />
      
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
            <View style={styles.logoContainer}>
              <View style={styles.logoStuds}>
                {[...Array(3)].map((_, i) => (
                  <Stud key={i} color={LEGO_COLORS.yellow} size={14} />
                ))}
              </View>
              <Text style={styles.logo}>BRCKED</Text>
            </View>
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
                  color={isActive(item.route) ? LEGO_COLORS.white : LEGO_COLORS.darkGrey}
                />
                <Text
                  style={[
                    styles.menuItemText,
                    isActive(item.route) && styles.activeMenuItemText,
                  ]}
                >
                  {item.title}
                </Text>
                {isActive(item.route) && (
                  <View style={styles.menuStuds}>
                    <Stud color={LEGO_COLORS.yellow} size={10} />
                    <Stud color={LEGO_COLORS.yellow} size={10} />
                  </View>
                )}
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
              color={LEGO_COLORS.red}
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
              <Ionicons name="warning-outline" size={50} color={LEGO_COLORS.red} />
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
        {/* Toggle Button (Mobile only) */}
        {width < 768 && (
          <TouchableOpacity
            style={styles.menuButton}
            onPress={toggleDrawer}
            activeOpacity={0.8}
          >
            <Ionicons 
              name={isOpen ? "chevron-back-outline" : "chevron-forward-outline"} 
              size={24} 
              color={LEGO_COLORS.white} 
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
    backgroundColor: LEGO_COLORS.red,
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: LEGO_COLORS.white,
    borderRightWidth: 2,
    borderRightColor: LEGO_COLORS.darkGrey,
    zIndex: 2,
    ...LEGO_SHADOW,
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
    borderBottomWidth: 3,
    borderBottomColor: LEGO_COLORS.yellow,
    backgroundColor: LEGO_COLORS.white,
    ...LEGO_SHADOW
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoStuds: {
    flexDirection: 'row',
    marginRight: 10,
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: LEGO_COLORS.red,
    ...Platform.select({
      ios: {
        fontFamily: 'System',
      },
      android: {
        fontFamily: 'sans-serif-black',
      }
    })
  },
  logoSub: {
    fontSize: 14,
    color: LEGO_COLORS.darkGrey,
    marginTop: 4,
    marginLeft: 4,
    ...Platform.select({
      ios: {
        fontFamily: 'System',
      },
      android: {
        fontFamily: 'sans-serif-medium',
      }
    })
  },
  drawerContent: {
    flex: 1,
    paddingTop: 15,
    paddingHorizontal: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeMenuItem: {
    backgroundColor: LEGO_COLORS.red,
    borderColor: LEGO_COLORS.black,
    borderWidth: 1.5,
    ...LEGO_SHADOW
  },
  menuItemText: {
    marginLeft: 16,
    fontSize: 16,
    color: LEGO_COLORS.darkGrey,
    ...Platform.select({
      ios: {
        fontFamily: 'System',
      },
      android: {
        fontFamily: 'sans-serif-medium',
      }
    })
  },
  activeMenuItemText: {
    color: LEGO_COLORS.white,
    fontWeight: 'bold',
  },
  menuStuds: {
    flexDirection: 'row',
    marginLeft: 'auto',
  },
  content: {
    flex: 1,
    zIndex: 0,
    backgroundColor: LEGO_COLORS.lightGrey,
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
    backgroundColor: LEGO_COLORS.red,
    transform: [{ translateY: -25 }],
    borderWidth: 1.5,
    borderColor: LEGO_COLORS.darkGrey,
    ...LEGO_SHADOW
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 3,
    borderTopColor: LEGO_COLORS.yellow,
    backgroundColor: LEGO_COLORS.white,
  },
  logoutButtonText: {
    marginLeft: 16,
    fontSize: 16,
    color: LEGO_COLORS.red,
    fontWeight: 'bold',
    ...Platform.select({
      ios: {
        fontFamily: 'System',
      },
      android: {
        fontFamily: 'sans-serif-medium',
      }
    })
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: LEGO_COLORS.white,
    borderRadius: 12,
    padding: 24,
    width: '80%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: LEGO_COLORS.darkGrey,
    ...LEGO_SHADOW
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: LEGO_COLORS.black,
    marginTop: 12,
    ...Platform.select({
      ios: {
        fontFamily: 'System',
      },
      android: {
        fontFamily: 'sans-serif-black',
      }
    })
  },
  modalText: {
    fontSize: 16,
    color: LEGO_COLORS.darkGrey,
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
    borderWidth: 1.5,
    borderColor: LEGO_COLORS.darkGrey,
    ...LEGO_SHADOW
  },
  cancelButton: {
    backgroundColor: LEGO_COLORS.lightGrey,
    marginRight: 8,
  },
  cancelButtonText: {
    color: LEGO_COLORS.darkGrey,
    fontWeight: 'bold',
  },
  confirmButton: {
    backgroundColor: LEGO_COLORS.red,
    marginLeft: 8,
  },
  confirmButtonText: {
    color: LEGO_COLORS.white,
    fontWeight: 'bold',
  },
});

export default AdminSidebar;
export { AdminSidebar };