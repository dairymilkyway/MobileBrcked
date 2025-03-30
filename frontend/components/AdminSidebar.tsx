import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Platform, 
  ScrollView,
  Alert,
  Animated,
  Dimensions,
  StatusBar
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';

// Get screen dimensions
const { width, height } = Dimensions.get('window');
const isTablet = width >= 768;

// Define prop types for component
interface AdminSidebarProps {
  isVisible?: boolean;
  onClose?: () => void;
}

// Define menu item type
interface MenuItem {
  title: string;
  icon: string;
  route: string;
  color: string;
}

// LEGO color palette
const LEGO_COLORS = {
  RED: '#E3000B',
  BLUE: '#006DB7',
  YELLOW: '#FFE500',
  GREEN: '#3EC65E',
  ORANGE: '#FF8C01',
  PURPLE: '#A83E9A',
  BLACK: '#000000',
  DARK_GRAY: '#202123',
  DARKER_GRAY: '#151617',
  GRAY: '#2F3032',
  WHITE: '#FFFFFF',
};

export default function AdminSidebar({ isVisible = true, onClose }: AdminSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const slideAnim = React.useRef(new Animated.Value(isVisible ? 0 : -280)).current;
  
  // Handle visibility changes
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isVisible ? 0 : -280,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isVisible]);

  const menuItems: MenuItem[] = [
    { 
      title: 'Dashboard', 
      icon: 'view-dashboard', 
      route: '/admin/admindashboard',
      color: LEGO_COLORS.YELLOW 
    },
    { 
      title: 'Products', 
      icon: 'toy-brick-outline', 
      route: '/admin/products',
      color: LEGO_COLORS.BLUE
    },
    { 
      title: 'Users', 
      icon: 'account-multiple', 
      route: '/admin/users',
      color: LEGO_COLORS.GREEN
    },
    { 
      title: 'Orders', 
      icon: 'package-variant-closed', 
      route: '/admin/orders',
      color: LEGO_COLORS.ORANGE
    }
  ];

  const handleLogout = async () => {
    try {
      // Clear all AsyncStorage data
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userRole');
      
      // Navigate back to the login screen
      router.replace('/Login');
    } catch (error) {
      console.error('Error during logout:', error);
      Alert.alert('Error', 'Could not log out. Please try again.');
    }
  };

  // Function to check if menu item is active
  const isActive = (route: string): boolean => {
    return pathname === route;
  };

  // Toggle sidebar collapse state
  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Dynamic container width based on collapse state
  const containerWidth = isCollapsed ? 80 : 280;

  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
          width: containerWidth,
          transform: [{ translateX: slideAnim }] 
        }
      ]}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Toggle collapse button (tablet only) with LEGO brick design */}
        {isTablet && (
          <TouchableOpacity 
            style={[styles.collapseButton, { top: Platform.OS === 'android' ? 50 : insets.top + 20 }]} 
            onPress={toggleCollapse}
          >
            <View style={styles.buttonBrick}>
              <MaterialCommunityIcons 
                name={isCollapsed ? "chevron-right" : "chevron-left"} 
                size={16} 
                color={LEGO_COLORS.WHITE} 
              />
              {/* LEGO stud on top of button */}
              <View style={styles.buttonBrickStud} />
            </View>
          </TouchableOpacity>
        )}

        {/* Admin logo and title with LEGO theme */}
        <View style={[
          styles.logoContainer, 
          isCollapsed && styles.logoContainerCollapsed,
          { paddingTop: Platform.OS === 'ios' ? insets.top : StatusBar.currentHeight || 0 }
        ]}>
          <View style={styles.logoWrapper}>
            <MaterialCommunityIcons name="toy-brick" size={isCollapsed ? 24 : 36} color={LEGO_COLORS.WHITE} />
            {/* LEGO studs on top of logo brick */}
            <View style={styles.logoStudsContainer}>
              <View style={styles.logoStud} />
              <View style={styles.logoStud} />
            </View>
          </View>
          {!isCollapsed && (
            <View>
              <Text style={styles.logoTitle}>BRCKD</Text>
              <Text style={styles.logoSubtitle}>Admin Panel</Text>
            </View>
          )}
        </View>

        {/* Menu items */}
        <ScrollView 
          style={styles.menuContainer}
          contentContainerStyle={styles.menuContentContainer}
          showsVerticalScrollIndicator={false}
        >
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.menuItem, 
                isActive(item.route) && styles.activeMenuItem,
                isCollapsed && styles.menuItemCollapsed
              ]}
              onPress={() => router.push(item.route as any)}
            >
              <View style={[
                styles.iconBrick, 
                {backgroundColor: item.color},
                isCollapsed && styles.iconBrickCollapsed
              ]}>
                <MaterialCommunityIcons name={item.icon as any} size={isCollapsed ? 24 : 20} color={LEGO_COLORS.BLACK} />
                
                {/* LEGO studs at top of brick */}
                <View style={styles.brickStudsContainer}>
                  <View style={styles.brickStud} />
                  <View style={styles.brickStud} />
                </View>
              </View>
              
              {!isCollapsed && (
                <Text style={[
                  styles.menuText, 
                  isActive(item.route) && styles.activeMenuText
                ]}>
                  {item.title}
                </Text>
              )}
              
              {isActive(item.route) && (
                <View style={[
                  styles.activeBrick,
                  isCollapsed && styles.activeBrickCollapsed
                ]}>
                  <View style={styles.activeBrickStud} />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Admin info section with LEGO styling */}
        {!isCollapsed && (
          <View style={styles.adminInfoContainer}>
            <View style={styles.adminInfoHeader}>
              <View style={styles.adminIconContainer}>
                <MaterialCommunityIcons name="account-tie" size={28} color={LEGO_COLORS.WHITE} />
                {/* LEGO stud on admin icon */}
                <View style={styles.adminIconStud} />
              </View>
              <View>
                <Text style={styles.adminName}>Admin User</Text>
                <Text style={styles.adminRole}>Super Admin</Text>
              </View>
            </View>
          </View>
        )}

        {/* Logout button with LEGO brick design */}
        <TouchableOpacity 
          style={[
            styles.logoutButton, 
            isCollapsed && styles.logoutButtonCollapsed,
            { paddingBottom: Math.max(insets.bottom, 14) }
          ]} 
          onPress={handleLogout}
        >
          <MaterialCommunityIcons name="logout" size={22} color={LEGO_COLORS.WHITE} />
          {!isCollapsed && <Text style={styles.logoutText}>LOG OUT</Text>}
          
          {/* LEGO brick design */}
          <View style={styles.logoutButtonStufs}>
            <View style={styles.logoutButtonStud} />
            <View style={styles.logoutButtonStud} />
          </View>
        </TouchableOpacity>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: LEGO_COLORS.DARK_GRAY,
    height: '100%',
    borderRightWidth: 1,
    borderRightColor: LEGO_COLORS.GRAY,
    elevation: 8,
    shadowColor: LEGO_COLORS.BLACK,
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 999,
  },
  safeArea: {
    flex: 1,
    backgroundColor: LEGO_COLORS.DARK_GRAY,
  },
  collapseButton: {
    position: 'absolute',
    right: -16,
    zIndex: 1001,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonBrick: {
    width: 32,
    height: 24,
    backgroundColor: LEGO_COLORS.RED,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: LEGO_COLORS.BLACK,
    shadowColor: LEGO_COLORS.BLACK,
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 1,
    elevation: 3,
  },
  buttonBrickStud: {
    position: 'absolute',
    top: -4,
    width: 8,
    height: 4,
    backgroundColor: '#B01B10',
    borderRadius: 2,
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.3)',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: LEGO_COLORS.GRAY,
    backgroundColor: LEGO_COLORS.DARKER_GRAY,
  },
  logoContainerCollapsed: {
    justifyContent: 'center',
    padding: 12,
  },
  logoWrapper: {
    backgroundColor: LEGO_COLORS.RED,
    width: 56,
    height: 56,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
    borderWidth: 2,
    borderColor: LEGO_COLORS.BLACK,
    shadowColor: LEGO_COLORS.BLACK,
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 1,
    elevation: 3,
  },
  logoStudsContainer: {
    position: 'absolute',
    top: -8,
    width: '80%',
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  logoStud: {
    width: 12,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#B01B10',
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.5)',
  },
  logoTitle: {
    color: LEGO_COLORS.WHITE,
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Futura-Bold' : 'sans-serif-condensed',
  },
  logoSubtitle: {
    color: `${LEGO_COLORS.WHITE}BB`,
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Futura-Medium' : 'sans-serif-medium',
  },
  menuContainer: {
    flex: 1,
  },
  menuContentContainer: {
    paddingTop: 15,
    paddingBottom: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingLeft: 20,
    marginBottom: 8,
    position: 'relative',
    borderRadius: 8,
    marginHorizontal: 8,
  },
  menuItemCollapsed: {
    justifyContent: 'center',
    paddingLeft: 0,
    paddingRight: 0,
  },
  activeMenuItem: {
    backgroundColor: LEGO_COLORS.GRAY,
  },
  iconBrick: {
    width: 38,
    height: 28,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
    borderWidth: 1,
    borderColor: LEGO_COLORS.BLACK,
    shadowColor: LEGO_COLORS.BLACK,
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 1,
    elevation: 2,
  },
  iconBrickCollapsed: {
    width: 48,
    height: 38,
    marginRight: 0,
    borderRadius: 6,
  },
  brickStudsContainer: {
    position: 'absolute',
    top: -5,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  brickStud: {
    width: 8,
    height: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.3)',
  },
  menuText: {
    color: `${LEGO_COLORS.WHITE}BB`,
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Futura-Medium' : 'sans-serif-medium',
  },
  activeMenuText: {
    color: LEGO_COLORS.WHITE,
    fontWeight: 'bold',
  },
  activeBrick: {
    position: 'absolute',
    right: 0,
    width: 10,
    height: 20,
    backgroundColor: LEGO_COLORS.RED,
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
  },
  activeBrickCollapsed: {
    right: -8,
  },
  activeBrickStud: {
    position: 'absolute',
    top: 4,
    left: -2,
    width: 6,
    height: 3,
    backgroundColor: '#B01B10',
    borderRadius: 1,
  },
  adminInfoContainer: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: LEGO_COLORS.GRAY,
    backgroundColor: LEGO_COLORS.DARKER_GRAY,
  },
  adminInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  adminIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: LEGO_COLORS.RED,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
    borderWidth: 1,
    borderColor: LEGO_COLORS.BLACK,
  },
  adminIconStud: {
    position: 'absolute',
    top: -3,
    width: 8,
    height: 4,
    backgroundColor: '#B01B10',
    borderRadius: 2,
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.3)',
  },
  adminName: {
    color: LEGO_COLORS.WHITE,
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Futura-Bold' : 'sans-serif-condensed',
  },
  adminRole: {
    color: `${LEGO_COLORS.WHITE}BB`,
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Futura-Medium' : 'sans-serif-medium',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LEGO_COLORS.RED,
    paddingTop: 14,
    paddingHorizontal: 14,
    justifyContent: 'center',
    position: 'relative',
    borderTopWidth: 1,
    borderTopColor: '#B01B10',
  },
  logoutButtonCollapsed: {
    padding: 16,
  },
  logoutText: {
    color: LEGO_COLORS.WHITE,
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
    fontFamily: Platform.OS === 'ios' ? 'Futura-Bold' : 'sans-serif-condensed',
  },
  logoutButtonStufs: {
    position: 'absolute',
    top: -5,
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: 46,
  },
  logoutButtonStud: {
    width: 10,
    height: 5,
    borderRadius: 2,
    backgroundColor: '#B01B10',
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.3)',
  },
});
