import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform, Modal, Animated, LayoutAnimation, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationBell from './NotificationBell';
import { logout } from '@/utils/api';
import { useDispatch } from 'react-redux';
import { clearNotifications } from '@/redux/slices/notificationSlice';

export default function UserHeader({ section = 'Home', compact = false }) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [menuExpanded, setMenuExpanded] = useState(false);
  const [titleOpacity] = useState(new Animated.Value(1));
  const dispatch = useDispatch();

  // Toggle menu function
  const toggleMenu = () => {
    // Configure layout animation for smoother transitions
    LayoutAnimation.configureNext({
      duration: 300,
      create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
      update: {
        type: LayoutAnimation.Types.easeInEaseOut,
      },
    });
    
    // Animate title opacity
    Animated.timing(titleOpacity, {
      toValue: menuExpanded ? 1 : 0,
      duration: 200,
      useNativeDriver: true
    }).start();
    
    setMenuExpanded(!menuExpanded);
  };

  // LEGO studs for the top of bricks
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

  const handleLogout = async () => {
    setShowLogoutModal(false);
    
    try {
      // Clear notification token registration timestamp
      await AsyncStorage.removeItem('lastNotificationRegistration');
      // But clear the "last registered" timestamp so it will re-register on next login
      
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

  const navigateToHome = () => {
    router.push('/user/home');  // Navigate to the home screen
  };
  
  const navigateToProfile = () => {
    router.push('/user/profile');  // Navigate to the profile screen
  };
  
  const navigateToOrders = () => {
    router.push('/orders');  // Navigate to the orders screen
  };

  const renderSectionTitle = () => {
    if (section === 'My Orders') {
      return (
        <View style={styles.stackedTitleContainer}>
          <Text style={[styles.stackedTitleText, compact && styles.stackedTitleTextCompact]}>My</Text>
          <Text style={[styles.stackedTitleText, compact && styles.stackedTitleTextCompact]}>Orders</Text>
        </View>
      );
    }
    
    if (section === 'Checkout') {
      return (
        <View style={styles.stackedTitleContainer}>
          <Text style={[styles.stackedTitleText, compact && styles.stackedTitleTextCompact]}>Check</Text>
          <Text style={[styles.stackedTitleText, compact && styles.stackedTitleTextCompact]}>out</Text>
        </View>
      );
    }
    
    return (
      <Text style={[
        styles.sectionText, 
        compact && styles.sectionTextCompact
      ]}>
        {section}
      </Text>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, compact && styles.safeAreaCompact]}>
      <View style={[styles.container, compact && styles.containerCompact]}>
        {/* Logo - only visible when menu is not expanded */}
        {!menuExpanded && (
          <TouchableOpacity 
            style={[styles.logoContainer, compact && styles.logoContainerCompact]} 
            onPress={navigateToHome}
            activeOpacity={0.7}
          >
            <View style={styles.logoShadow}>
              <MaterialCommunityIcons 
                name="toy-brick" 
                size={compact ? 36 : 45} 
                color="#FFFFFF" 
              />
            </View>
          </TouchableOpacity>
        )}
        
        {/* Title section - hidden when menu is expanded */}
        {!menuExpanded && (
          <View style={styles.titleSection}>
            <Animated.View style={{ opacity: titleOpacity }}>
              {renderSectionTitle()}
            </Animated.View>
          </View>
        )}
        
        <View style={[
          styles.rightSection,
          menuExpanded && styles.expandedRightSection
        ]}>
          {/* Menu toggle button - always visible */}
          <TouchableOpacity 
            style={[styles.legoButton, { backgroundColor: '#3498DB' }]}
            onPress={toggleMenu}
          >
            <MaterialCommunityIcons 
              name={menuExpanded ? "close" : "menu"} 
              size={22} 
              color="#FFFFFF" 
            />
            <View style={styles.buttonStud} />
          </TouchableOpacity>
          
          {/* Menu items - only visible when expanded */}
          {menuExpanded && (
            <>
              <TouchableOpacity 
                style={styles.legoButton}
                onPress={navigateToProfile}
              >
                <MaterialCommunityIcons name="account" size={22} color="#FFFFFF" />
                <View style={styles.buttonStud} />
              </TouchableOpacity>
              
              <View style={[styles.legoButton, { backgroundColor: '#FFC500' }]}>
                <NotificationBell />
                <View style={styles.buttonStud} />
              </View>
            </>
          )}
          
          {/* Orders Button */}
          <TouchableOpacity 
            style={[styles.legoButton, { backgroundColor: '#9B59B6' }]}
            onPress={navigateToOrders}
          >
            <MaterialCommunityIcons 
              name="package-variant" 
              size={22} 
              color="#FFFFFF" 
            />
            <View style={styles.buttonStud} />
          </TouchableOpacity>
          
          {/* Cart Button */}
          <TouchableOpacity 
            style={[styles.legoButton, { backgroundColor: '#4CAF50' }]}
            onPress={() => router.push('/Cart')}
          >
            <MaterialCommunityIcons 
              name="cart" 
              size={22} 
              color="#FFFFFF" 
            />
            <View style={styles.buttonStud} />
          </TouchableOpacity>
          
          {/* Logout Button */}
          <TouchableOpacity 
            style={[styles.legoButton, { backgroundColor: '#FF3A2F' }]}
            onPress={() => setShowLogoutModal(true)}
          >
            <MaterialCommunityIcons name="logout" size={22} color="#FFFFFF" />
            <View style={styles.buttonStud} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Logout Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showLogoutModal}
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* LEGO studs at the top of modal */}
            <View style={styles.modalStudsContainer}>
              {renderStuds(4)}
            </View>
            
            <View style={styles.modalBody}>
              <MaterialCommunityIcons name="toy-brick-outline" size={50} color="#E3000B" />
              <Text style={styles.modalTitle}>Time to disassemble?</Text>
              <Text style={styles.modalText}>Are you sure you want to log out?</Text>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowLogoutModal(false)}
                >
                  <Text style={styles.cancelButtonText}>CANCEL</Text>
                  <View style={styles.buttonBottom} />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.modalButton, styles.logoutButton]}
                  onPress={handleLogout}
                >
                  <Text style={styles.logoutButtonText}>LOG OUT</Text>
                  <View style={[styles.buttonBottom, { backgroundColor: '#B01B10' }]} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#E3000B', // LEGO red
    paddingTop: Platform.OS === 'android' ? 40 : 0,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  safeAreaCompact: {
    paddingTop: Platform.OS === 'android' ? 25 : 0,
  },
  topStudsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 5,
    marginTop: 2,
  },
  stud: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E3000B',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 2,
  },
  studInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C4000A',
  },
  brickStudsRow: {
    flexDirection: 'row',
    position: 'absolute',
    top: -6,
    left: 2,
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  containerCompact: {
    paddingVertical: 6,
  },
  leftSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center'
  },
  logoContainer: {
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainerCompact: {
    marginRight: 8,
  },
  titleSection: {
    flex: 1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expandedRightSection: {
    flex: 1,
    justifyContent: 'flex-end',
    width: '100%',
  },
  legoText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: Platform.select({
      ios: 'Futura-Bold',
      android: 'sans-serif-condensed',
      default: 'System'
    }),
    letterSpacing: 1,
    marginRight: 8,
  },
  sectionText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: Platform.select({
      ios: 'Futura-Medium',
      android: 'sans-serif-medium',
      default: 'System'
    }),
    textTransform: 'uppercase',
  },
  sectionTextCompact: {
    fontSize: 16,
  },
  ordersText: {
    fontSize: 14,
  },
  legoButton: {
    padding: 8,
    marginLeft: 10,
    backgroundColor: '#006DB7', // LEGO blue
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#000', // Black border
    height: 40,
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  buttonStud: {
    position: 'absolute',
    top: -6,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.😎',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.3)',
    right: 13,
  },
  logoShadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#0C0A00',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalStudsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#FFE500',
    padding: 6,
    borderBottomWidth: 2,
    borderBottomColor: '#0C0A00',
  },
  modalBody: {
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0C0A00',
    marginTop: 16,
    marginBottom: 8,
    fontFamily: Platform.select({
      ios: 'Futura-Bold',
      android: 'sans-serif-condensed',
      default: 'System'
    }),
  },
  modalText: {
    fontSize: 16,
    color: '#0C0A00',
    marginBottom: 24,
    textAlign: 'center',
    opacity: 0.8,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto',
      default: 'System'
    }),
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    width: '48%',
    height: 50,
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  cancelButton: {
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#0C0A00',
    fontWeight: 'bold',
    fontSize: 16,
  },
  logoutButton: {
    backgroundColor: '#FF3A2F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  buttonBottom: {
    width: '94%',
    height: 6,
    backgroundColor: '#AAAAAA',
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  stackedTitleContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  stackedTitleText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: Platform.select({
      ios: 'Futura-Medium',
      android: 'sans-serif-medium',
      default: 'System'
    }),
    textTransform: 'uppercase',
    lineHeight: 18,
  },
  stackedTitleTextCompact: {
    fontSize: 14,
    lineHeight: 16,
  },
});