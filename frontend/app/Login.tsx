import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  TextInput, 
  Text, 
  StyleSheet, 
  Alert, 
  TouchableOpacity, 
  Animated, 
  Easing,
  StatusBar,
  Dimensions
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage'; // ✅ Import AsyncStorage
import { API_BASE_URL } from '@/env';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [buttonScale] = useState(new Animated.Value(1));
  
  // Animation for background studs
  const studAnimations = useRef([...Array(8)].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    // ✅ Check if user is already logged in
    const checkLoginStatus = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const role = await AsyncStorage.getItem('userRole');

        console.log('Login check - Token:', token ? 'exists' : 'missing');
        console.log('Login check - Role:', role);

        if (token) {
          if (role === 'admin') {
            console.log('Redirecting to admin dashboard');
            router.replace('/admin/dashboard');
          } else {
            console.log('Redirecting to user home');
            router.replace('/user/home');
          }
        }
      } catch (error) {
        console.error('Error checking login status:', error);
      }
    };

    checkLoginStatus();

    // Animate background studs
    studAnimations.forEach((anim, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 1500 + Math.random() * 1000,
            delay: i * 200,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease)
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 1500 + Math.random() * 1000,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease)
          })
        ])
      ).start();
    });

    return () => {
      studAnimations.forEach(anim => {
        anim.stopAnimation();
      });
    };
  }, []);

  // ✅ Login handler with AsyncStorage token saving
  const handleLogin = async () => {
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
        easing: Easing.in(Easing.ease),
      }),
    ]).start(async () => {
      try {
        // Validate input
        if (!email.trim() || !password.trim()) {
          Alert.alert('Error', 'Please enter email and password');
          return;
        }

        console.log('Attempting login with:', email);
        const response = await fetch(`${API_BASE_URL}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();
        console.log('Login response status:', response.status);
        console.log('Login response role:', data.role);
        
        if (response.ok && data.token) {
          // Clear any existing tokens first
          await AsyncStorage.removeItem('token');
          await AsyncStorage.removeItem('userToken');
          await AsyncStorage.removeItem('userRole');
          
          // Ensure we save the token in BOTH places to maintain consistency
          console.log('Saving token to AsyncStorage, token length:', data.token.length);
          
          // Save token and user data
          await AsyncStorage.setItem('token', data.token);
          await AsyncStorage.setItem('userToken', data.token);
          await AsyncStorage.setItem('userRole', data.role);
          
          // Additional user data if available
          if (data.userId) await AsyncStorage.setItem('userId', data.userId);
          if (data.name) await AsyncStorage.setItem('userName', data.name);
          
          // Verify token was saved
          const savedToken = await AsyncStorage.getItem('token');
          console.log('Verified saved token length:', savedToken ? savedToken.length : 0);

          // Check token with a test call to debug endpoint
          try {
            const testResponse = await fetch(`${API_BASE_URL}/debug/token`, {
              headers: {
                'Authorization': `Bearer ${data.token}`,
                'Accept': 'application/json',
              },
            });
            
            if (testResponse.ok) {
              const testData = await testResponse.json();
              console.log('Token debug info:', testData);
            } else {
              console.warn('Token debug test failed, but continuing anyway');
            }
          } catch (testError) {
            console.warn('Token test error:', testError);
            // Continue with login flow anyway
          }

          Alert.alert('Success', 'Logged in successfully');
          
          if (data.role === 'admin') {
            console.log('Admin login successful, redirecting to admin dashboard');
            router.push('/admin/dashboard');
          } else {
            console.log('User login successful, redirecting to user home');
            router.push('/user/home');
          }
        } else {
          const errorMsg = data.error || data.message || 'Invalid credentials';
          console.error('Login failed:', errorMsg);
          Alert.alert('Login Failed', errorMsg);
        }
      } catch (err) {
        console.error('Login error:', err);
        Alert.alert('Error', 'Something went wrong. Please try again.');
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#FFE500" barStyle="dark-content" />
      
      <View style={styles.backgroundPattern}>
        {studAnimations.map((anim, index) => (
          <Animated.View 
            key={index}
            style={[
              styles.backgroundStud,
              {
                top: `${10 + (index * 15) % 85}%`,
                left: `${5 + (index * 23) % 90}%`,
                opacity: anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.15, 0.3]
                }),
                transform: [{
                  scale: anim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [1, 1.15, 1]
                  })
                }]
              }
            ]}
          />
        ))}
      </View>
      
      <LinearGradient
        colors={['#FFF170', '#FFE500', '#FFD500']}
        style={styles.gradient}
      />
      
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => router.back()}
      >
        <MaterialCommunityIcons name="arrow-left" size={24} color="#0C0A00" />
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.headerContainer}>
          <MaterialCommunityIcons name="toy-brick" size={60} color="#000000" />
          <Text style={styles.title}>Login</Text>
          <Text style={styles.subtitle}>Connect with your BRCKD account</Text>
        </View>
        
        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="email-outline" size={24} color="#0C0A00" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#0C0A00AA"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          
          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="lock-outline" size={24} color="#0C0A00" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#0C0A00AA"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <Animated.View style={{transform: [{ scale: buttonScale }], alignSelf: 'stretch'}}>
            <TouchableOpacity 
              style={styles.button} 
              onPress={handleLogin}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#FF3A2F', '#DA291C', '#B01B10']}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>LOGIN</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
          
          <TouchableOpacity onPress={() => router.push('/Register')}>
            <Text style={styles.link}>
              Don't have an account? <Text style={styles.linkBold}>Register</Text>
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.decorationBrick1} />
        <View style={styles.decorationBrick2} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFE500',
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backgroundPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  backgroundStud: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0C0A00',
    opacity: 0.15,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 10,
    color: '#0C0A00',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#0C0A00',
    textAlign: 'center',
    opacity: 0.8,
  },
  formContainer: {
    width: '100%',
    maxWidth: 350,
    alignItems: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 12,
    borderWidth: 2,
    borderColor: '#0C0A00',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#0C0A00',
  },
  button: {
    marginTop: 10,
    marginBottom: 20,
    borderRadius: 8,
    width: '100%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  link: {
    fontSize: 16,
    color: '#0C0A00',
    opacity: 0.8,
    textAlign: 'center',
  },
  linkBold: {
    fontWeight: 'bold',
    color: '#0055A4',
  },
  decorationBrick1: {
    position: 'absolute',
    bottom: '10%',
    left: '10%',
    width: 60,
    height: 30,
    backgroundColor: '#0055A4',
    borderRadius: 4,
    transform: [{ rotate: '-15deg' }],
    opacity: 0.6,
  },
  decorationBrick2: {
    position: 'absolute',
    top: '15%',
    right: '10%',
    width: 40,
    height: 20,
    backgroundColor: '#DA291C',
    borderRadius: 4,
    transform: [{ rotate: '10deg' }],
    opacity: 0.6,
  },
});
