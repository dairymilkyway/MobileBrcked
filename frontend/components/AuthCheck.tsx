import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthCheckProps {
  requiredRole?: 'admin' | 'user';
}

/**
 * Component to check authentication status and redirect if not authenticated
 * or if the user doesn't have the required role.
 */
const AuthCheck: React.FC<AuthCheckProps> = ({ requiredRole }) => {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('token') || await AsyncStorage.getItem('userToken');
        const userRole = await AsyncStorage.getItem('userRole');

        console.log('AuthCheck - Token exists:', !!token);
        console.log('AuthCheck - User role:', userRole);
        
        // If no token, redirect to login
        if (!token) {
          console.log('No token found, redirecting to login');
          await handleRedirectToLogin('Your session has expired. Please log in again.');
          return;
        }

        // If role is required but doesn't match
        if (requiredRole && userRole !== requiredRole) {
          console.log(`Role mismatch: required ${requiredRole}, found ${userRole}`);
          
          if (requiredRole === 'admin' && userRole === 'user') {
            Alert.alert('Access Denied', 'You need administrator access for this section.');
            router.replace('/user/home');
          } else {
            // Just redirect to appropriate area based on role
            const redirectPath = userRole === 'admin' ? '/admin/dashboard' : '/user/home';
            router.replace(redirectPath);
          }
          return;
        }

        setAuthChecked(true);
      } catch (error) {
        console.error('Error checking auth:', error);
        await handleRedirectToLogin('Authentication error. Please log in again.');
      }
    };

    checkAuth();
  }, []);

  const handleRedirectToLogin = async (message: string) => {
    // Clear auth data
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userRole');
    
    // Alert user and redirect
    Alert.alert('Session Expired', message, [
      { 
        text: 'OK', 
        onPress: () => router.replace('/Login') 
      }
    ]);
  };

  // This component doesn't render anything
  return null;
};

export default AuthCheck; 