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
  Dimensions,
  ScrollView,
  Image,
  Platform,
  ActivityIndicator
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { API_BASE_URL } from '@/env';
import * as ImagePicker from 'expo-image-picker';

const { width } = Dimensions.get('window');
const DEFAULT_PROFILE_IMAGE = 'https://minifigs.me/cdn/shop/products/32.png?v=1665143878';

export default function RegisterScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [buttonScale] = useState(new Animated.Value(1));
  
  // Animation for background studs
  const studAnimations = useRef([...Array(8)].map(() => new Animated.Value(0))).current;
  
  useEffect(() => {
    // Request camera and media library permissions
    (async () => {
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (cameraStatus !== 'granted' || libraryStatus !== 'granted') {
        Alert.alert('Permission Required', 'Camera and photo library permissions are needed for profile picture upload.');
      }
    })();

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

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const takePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      'Profile Picture',
      'Choose an option',
      [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Gallery', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleRegister = async () => {
    // Button press animation
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease)
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
        easing: Easing.in(Easing.ease)
      })
    ]).start(async () => {
      if (!username || !email || !password) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }

      try {
        setIsUploading(true);
        
        // Create form data for multipart upload
        const formData = new FormData();
        formData.append('username', username);
        formData.append('email', email);
        formData.append('password', password);
        
        // Add image if selected
        if (image) {
          const uriParts = image.split('.');
          const fileType = uriParts[uriParts.length - 1];
          
          // @ts-ignore - FormData append with file object is not properly typed in React Native
          formData.append('profilePicture', {
            uri: Platform.OS === 'ios' ? image.replace('file://', '') : image,
            name: `profile-${Date.now()}.${fileType}`,
            type: `image/${fileType}`,
          });
        }
        
        const response = await fetch(`${API_BASE_URL}/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          body: formData,
        });
        
        const data = await response.json();
        setIsUploading(false);
        
        if (response.ok) {
          Alert.alert('Success', 'Registered successfully');
          router.push('/Login');
        } else {
          Alert.alert('Error', data.error || 'Registration failed');
        }
      } catch (err) {
        setIsUploading(false);
        Alert.alert('Error', 'Something went wrong with registration');
        console.error('Registration error:', err);
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

      <ScrollView contentContainerStyle={styles.scrollView}>
        <View style={styles.content}>
          <View style={styles.headerContainer}>
            <MaterialCommunityIcons name="toy-brick-plus" size={60} color="#00000" />
            <Text style={styles.title}>Register</Text>
            <Text style={styles.subtitle}>Create your BRCKD account</Text>
          </View>
          
          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="account-outline" size={24} color="#0C0A00" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Username"
                placeholderTextColor="#0C0A00AA"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </View>
            
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

            <TouchableOpacity 
              style={styles.imageButton} 
              onPress={showImageOptions}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="image-plus" size={24} color="#FFFFFF" style={styles.imageButtonIcon} />
              <Text style={styles.imageButtonText}>{image ? 'Change Profile Picture' : 'Upload Profile Picture'}</Text>
            </TouchableOpacity>
            
            {image && (
              <View style={styles.selectedImageContainer}>
                <Image source={{ uri: image }} style={styles.selectedImagePreview} />
                <TouchableOpacity 
                  style={styles.removeImageButton}
                  onPress={() => setImage(null)}
                >
                  <MaterialCommunityIcons name="close-circle" size={22} color="#DA291C" />
                </TouchableOpacity>
              </View>
            )}

            <Animated.View style={{transform: [{ scale: buttonScale }], alignSelf: 'stretch', marginTop: 20}}>
              <TouchableOpacity 
                style={styles.button} 
                onPress={handleRegister}
                activeOpacity={0.9}
                disabled={isUploading}
              >
                <LinearGradient
                  colors={['#FF3A2F', '#DA291C', '#B01B10']}
                  style={styles.buttonGradient}
                >
                  {isUploading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.buttonText}>CREATE ACCOUNT</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
            
            <TouchableOpacity onPress={() => router.push('/Login')}>
              <Text style={styles.link}>
                Already have an account? <Text style={styles.linkBold}>Login</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.decorationBrick1, { backgroundColor: '#0055A4' }]} />
      <View style={[styles.decorationBrick2, { backgroundColor: '#DA291C' }]} />
      <View style={[styles.decorationBrick3, { backgroundColor: '#0C0A00' }]} />
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
  scrollView: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0055A4',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    width: '100%',
    marginTop: 5,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  imageButtonIcon: {
    marginRight: 10,
  },
  imageButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  selectedImageContainer: {
    position: 'relative',
    marginBottom: 5,
  },
  selectedImagePreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 0,
  },
  button: {
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
    bottom: '5%',
    left: '15%',
    width: 60,
    height: 30,
    borderRadius: 4,
    transform: [{ rotate: '-15deg' }],
    opacity: 0.6,
  },
  decorationBrick2: {
    position: 'absolute',
    top: '12%',
    right: '10%',
    width: 40,
    height: 20,
    borderRadius: 4,
    transform: [{ rotate: '10deg' }],
    opacity: 0.6,
  },
  decorationBrick3: {
    position: 'absolute',
    top: '25%',
    left: '10%',
    width: 35,
    height: 18,
    borderRadius: 4,
    transform: [{ rotate: '35deg' }],
    opacity: 0.4,
  },
});