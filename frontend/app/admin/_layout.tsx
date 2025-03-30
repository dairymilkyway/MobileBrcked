import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  Dimensions,
  TouchableOpacity,
  StatusBar as RNStatusBar,
  TouchableWithoutFeedback,
} from 'react-native';
import { Slot, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AdminSidebar from '@/components/AdminSidebar';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Get screen dimensions and check if it's a tablet
const { width, height } = Dimensions.get('window');
const isTablet = width >= 768;

// Check device platform and version
const isIOS = Platform.OS === 'ios';
const isAndroid = Platform.OS === 'android';
const statusBarHeight = isAndroid ? RNStatusBar.currentHeight || 0 : 0;

export default function AdminLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [sidebarVisible, setSidebarVisible] = useState(isTablet);

  useEffect(() => {
    // Check if user is admin, redirect if not
    const checkAdminAuth = async () => {
      const userRole = await AsyncStorage.getItem('userRole');
      if (userRole !== 'admin') {
        router.replace('/Login');
      }
    };

    checkAdminAuth();

    // Listen for orientation/dimension changes
    const dimensionsHandler = Dimensions.addEventListener('change', ({ window }) => {
      const isNewTablet = window.width >= 768;
      setSidebarVisible(isNewTablet);
    });

    return () => {
      dimensionsHandler.remove();
    };
  }, []);

  // Toggle sidebar visibility (for mobile)
  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  // Close sidebar (for mobile)
  const closeSidebar = () => {
    setSidebarVisible(false);
  };

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <View style={styles.container}>
        {/* Sidebar for tablet and mobile */}
        <AdminSidebar isVisible={sidebarVisible} onClose={closeSidebar} />

        {/* Overlay to detect clicks outside the sidebar (mobile only) */}
        {!isTablet && sidebarVisible && (
          <TouchableWithoutFeedback onPress={closeSidebar}>
            <View style={styles.overlay} />
          </TouchableWithoutFeedback>
        )}

        {/* Content container */}
        <SafeAreaView
          style={[
            styles.contentContainer,
            isTablet && { marginLeft: 280 }, // Add margin for tablet sidebar
          ]}
          edges={['right', 'bottom']}
        >
          {/* Render child routes dynamically */}
          <Slot />
        </SafeAreaView>

        {/* For mobile, add a button to toggle sidebar */}
        {!isTablet && !sidebarVisible && (
          <TouchableOpacity
            style={[
              styles.menuButton,
              {
                top: isIOS ? insets.top + 10 : statusBarHeight + 10,
                left: insets.left + 20,
              },
            ]}
            onPress={toggleSidebar}
          >
            <MaterialCommunityIcons name="menu" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#252628',
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#252628',
    zIndex: 1,
  },
  menuButton: {
    position: 'absolute',
    zIndex: 1000,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#202123',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2F3032',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 100,
  },
});
