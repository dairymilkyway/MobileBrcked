import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TextInput, 
  TouchableOpacity, 
  Alert,
  Image,
  ActivityIndicator,
  Dimensions,
  Platform,
  Animated,
  Easing,
  StatusBar as RNStatusBar
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { getUserProfile, updateUserProfile } from '@/utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, useFocusEffect } from 'expo-router';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<any>(null);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [newProfileImage, setNewProfileImage] = useState<any>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [buttonScale] = useState(new Animated.Value(1));
  
  // Animation for background studs
  const studAnimations = useRef([...Array(8)].map(() => new Animated.Value(0))).current;

  // Request permissions on component mount
  useEffect(() => {
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

  // Handle back navigation
  const handleBackPress = () => {
    // If in edit mode, ask for confirmation before navigating back
    if (isEditMode) {
      Alert.alert(
        'Discard Changes',
        'Are you sure you want to discard your changes?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => router.back() }
        ]
      );
    } else {
      router.back();
    }
  };

  // Fetch user profile function
  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const userData = await getUserProfile();
      
      if (userData) {
        setUser(userData);
        setUsername(userData.username || '');
        setEmail(userData.email || '');
        setProfileImage(userData.profilePicture || null);
      }
      
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Failed to load profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch user profile when the component mounts
  useEffect(() => {
    fetchProfile();
  }, []);

  // Refresh profile data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchProfile();
      return () => {
        // Clean up if needed
      };
    }, [])
  );

  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
    if (!isEditMode) {
      // Reset form fields to current values when entering edit mode
      setUsername(user?.username || '');
      setEmail(user?.email || '');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordFields(false);
      setNewProfileImage(null);
    }
  };

  const togglePasswordFields = () => {
    setShowPasswordFields(!showPasswordFields);
    if (!showPasswordFields) {
      // Clear password fields when showing them
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setNewProfileImage(result.assets[0]);
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
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setNewProfileImage(result.assets[0]);
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

  const handleSaveProfile = async () => {
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
      // Validate inputs
      if (!username.trim() || !email.trim()) {
        Alert.alert('Error', 'Username and email are required');
        return;
      }

      // Check if anything has changed
      const hasChangedBasicInfo = 
        username !== user?.username || 
        email !== user?.email ||
        newProfileImage !== null;
        
      const hasChangedPassword = 
        showPasswordFields && 
        currentPassword && 
        newPassword && 
        confirmPassword;
      
      // If nothing has changed, just exit edit mode
      if (!hasChangedBasicInfo && !hasChangedPassword) {
        setIsEditMode(false);
        Alert.alert('Information', 'No changes were made');
        return;
      }

      // If password fields are shown, validate password inputs
      if (showPasswordFields) {
        if (!currentPassword) {
          Alert.alert('Error', 'Current password is required to change password');
          return;
        }
        
        if (!newPassword) {
          Alert.alert('Error', 'New password is required');
          return;
        }
        
        if (newPassword !== confirmPassword) {
          Alert.alert('Error', 'New passwords do not match');
          return;
        }
      }

      try {
        setIsSaving(true);
        
        // Create form data for multipart upload
        const formData = new FormData();
        
        // Add basic user data
        formData.append('username', username);
        formData.append('email', email);
        
        // Add password fields if the user is changing password
        if (showPasswordFields && currentPassword && newPassword) {
          formData.append('currentPassword', currentPassword);
          formData.append('newPassword', newPassword);
        }
        
        // Add profile image if changed
        if (newProfileImage) {
          const uri = newProfileImage.uri;
          const uriParts = uri.split('.');
          const fileType = uriParts[uriParts.length - 1];
          
          // @ts-ignore - FormData append with file object is not properly typed
          formData.append('profilePicture', {
            uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
            name: `profile-${Date.now()}.${fileType}`,
            type: `image/${fileType}`,
          });
        }
        
        // Call the API to update profile
        const updatedUser = await updateUserProfile(formData);
        
        if (updatedUser) {
          setUser(updatedUser);
          setProfileImage(updatedUser.profilePicture || null);
          Alert.alert('Success', 'Profile updated successfully');
          setIsEditMode(false);
          
          // Clear password fields
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
          setShowPasswordFields(false);
          setNewProfileImage(null);
        }
      } catch (error: any) {
        console.error('Error updating profile:', error);
        Alert.alert('Error', error.message || 'Failed to update profile. Please try again.');
      } finally {
        setIsSaving(false);
      }
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <LinearGradient
          colors={['#FFF170', '#FFE500', '#FFD500']}
          style={styles.gradient}
        />
        <View style={[
          styles.loadingContainer, 
          {
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
            paddingLeft: insets.left,
            paddingRight: insets.right
          }
        ]}>
          <ActivityIndicator size="large" color="#DA291C" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar style="dark" />
      
      <LinearGradient
        colors={['#FFF170', '#FFE500', '#FFD500']}
        style={styles.gradient}
      />
      
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
      
      {/* Content container with safe area padding */}
      <View style={{
        flex: 1, 
        paddingTop: insets.top || RNStatusBar.currentHeight || 0,
        paddingLeft: insets.left, 
        paddingRight: insets.right
      }}>
        <TouchableOpacity 
          style={[styles.backButton, {top: (insets.top || RNStatusBar.currentHeight || 0) + 16}]} 
          onPress={handleBackPress}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#0C0A00" />
        </TouchableOpacity>
        
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerContainer}>
            <MaterialCommunityIcons name="account-circle" size={60} color="#0C0A00" />
            <Text style={styles.title}>My Profile</Text>
            <Text style={styles.subtitle}>Customize your BRCKD experience</Text>
          </View>
          
          <View style={styles.content}>
            <View style={styles.profileImageContainer}>
              <TouchableOpacity 
                onPress={isEditMode ? showImageOptions : undefined}
                disabled={!isEditMode}
                activeOpacity={isEditMode ? 0.7 : 1}
                style={styles.profileImageWrapper}
              >
                <View style={styles.brickOuterBorder}>
                  <View style={styles.brickInnerBorder}>
                    <Image
                      source={{ 
                        uri: newProfileImage 
                          ? newProfileImage.uri 
                          : (profileImage || 'https://minifigs.me/cdn/shop/products/32.png?v=1665143878')
                      }}
                      style={styles.profileImage}
                    />
                  </View>
                </View>
                {isEditMode && (
                  <View style={styles.editIndicator}>
                    <MaterialCommunityIcons name="camera" size={22} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
              <View style={styles.studsContainer}>
                {[...Array(6)].map((_, i) => (
                  <View key={i} style={styles.stud} />
                ))}
              </View>
            </View>
            
            <View style={styles.formContainer}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Username</Text>
                <View style={[styles.inputContainer, !isEditMode && styles.disabledContainer]}>
                  <MaterialCommunityIcons name="account-outline" size={24} color="#0C0A00" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, !isEditMode && styles.disabledInput]}
                    value={username}
                    onChangeText={setUsername}
                    editable={isEditMode}
                    placeholderTextColor="#0C0A00AA"
                  />
                </View>
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <View style={[styles.inputContainer, !isEditMode && styles.disabledContainer]}>
                  <MaterialCommunityIcons name="email-outline" size={24} color="#0C0A00" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, !isEditMode && styles.disabledInput]}
                    value={email}
                    onChangeText={setEmail}
                    editable={isEditMode}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholderTextColor="#0C0A00AA"
                  />
                </View>
              </View>
              
              {isEditMode && (
                <TouchableOpacity 
                  style={styles.changePasswordButton}
                  onPress={togglePasswordFields}
                >
                  <LinearGradient
                    colors={['#0055A4', '#003D75']}
                    style={styles.changePasswordGradient}
                  >
                    <MaterialCommunityIcons
                      name={showPasswordFields ? "chevron-up" : "chevron-down"}
                      size={24}
                      color="#FFFFFF"
                      style={styles.changePasswordIcon}
                    />
                    <Text style={styles.changePasswordText}>
                      {showPasswordFields ? "Hide Password Fields" : "Change Password"}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
              
              {isEditMode && showPasswordFields && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Current Password</Text>
                    <View style={styles.inputContainer}>
                      <MaterialCommunityIcons name="lock-outline" size={24} color="#0C0A00" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        value={currentPassword}
                        onChangeText={setCurrentPassword}
                        secureTextEntry={!isPasswordVisible}
                        placeholderTextColor="#0C0A00AA"
                      />
                      <TouchableOpacity
                        style={styles.passwordVisibilityIcon}
                        onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                      >
                        <MaterialCommunityIcons
                          name={isPasswordVisible ? "eye-off" : "eye"}
                          size={24}
                          color="#0C0A00"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>New Password</Text>
                    <View style={styles.inputContainer}>
                      <MaterialCommunityIcons name="lock-outline" size={24} color="#0C0A00" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry={!isPasswordVisible}
                        placeholderTextColor="#0C0A00AA"
                      />
                    </View>
                  </View>
                  
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Confirm New Password</Text>
                    <View style={styles.inputContainer}>
                      <MaterialCommunityIcons name="lock-outline" size={24} color="#0C0A00" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry={!isPasswordVisible}
                        placeholderTextColor="#0C0A00AA"
                      />
                    </View>
                  </View>
                </>
              )}
              
              <View style={styles.actionsContainer}>
                {isEditMode ? (
                  <Animated.View style={{transform: [{ scale: buttonScale }], marginTop: 20, width: '100%'}}>
                    <TouchableOpacity
                      style={styles.saveButton}
                      onPress={handleSaveProfile}
                      disabled={isSaving}
                      activeOpacity={0.9}
                    >
                      <LinearGradient
                        colors={['#FF3A2F', '#DA291C', '#B01B10']}
                        style={styles.saveButtonGradient}
                      >
                        {isSaving ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <MaterialCommunityIcons name="content-save" size={20} color="#FFFFFF" style={styles.saveButtonIcon} />
                            <Text style={styles.saveButtonText}>SAVE CHANGES</Text>
                          </>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </Animated.View>
                ) : (
                  <TouchableOpacity 
                    style={styles.editButton} 
                    onPress={toggleEditMode}
                    disabled={isSaving}
                  >
                    <LinearGradient
                      colors={['#0055A4', '#003D75']}
                      style={styles.editButtonGradient}
                    >
                      <MaterialCommunityIcons name="pencil" size={20} color="#FFFFFF" style={styles.editButtonIcon} />
                      <Text style={styles.editButtonText}>EDIT PROFILE</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
      
      {/* Decorative elements */}
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
    left: 0,
    right: 0,
    top: 0,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#0C0A00',
    fontWeight: 'bold',
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
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  headerContainer: {
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 20,
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
  content: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  profileImageContainer: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 10,
  },
  profileImageWrapper: {
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  brickOuterBorder: {
    borderWidth: 3,
    borderColor: '#0C0A00',
    borderRadius: 6,
    padding: 4,
    backgroundColor: '#DA291C',
  },
  brickInnerBorder: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  profileImage: {
    width: 120,
    height: 120,
  },
  editIndicator: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: '#0055A4',
    borderRadius: 4,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0C0A00',
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  studsContainer: {
    width: 90,
    height: 20,
    backgroundColor: '#0C0A00',
    borderRadius: 6,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
    paddingHorizontal: 5,
  },
  stud: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFE500',
    marginHorizontal: 2,
  },
  formContainer: {
    width: '100%',
    maxWidth: 350,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0C0A00',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 56,
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
  disabledContainer: {
    borderColor: '#0C0A00',
    opacity: 0.8,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#0C0A00',
  },
  disabledInput: {
    opacity: 0.7,
  },
  passwordVisibilityIcon: {
    padding: 8,
  },
  changePasswordButton: {
    marginBottom: 20,
    width: '100%',
  },
  changePasswordGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  changePasswordIcon: {
    marginRight: 8,
  },
  changePasswordText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  actionsContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
  },
  saveButton: {
    width: '100%',
  },
  saveButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    height: 56,
    borderWidth: 2,
    borderColor: '#0C0A00',
  },
  saveButtonIcon: {
    marginRight: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  editButton: {
    width: '100%',
  },
  editButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    height: 56,
    borderWidth: 2,
    borderColor: '#0C0A00',
  },
  editButtonIcon: {
    marginRight: 8,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  decorationBrick1: {
    position: 'absolute',
    width: 60,
    height: 30,
    borderRadius: 4,
    bottom: 40,
    left: 20,
    transform: [{ rotate: '15deg' }],
    zIndex: -1,
  },
  decorationBrick2: {
    position: 'absolute',
    width: 90,
    height: 40,
    borderRadius: 4,
    bottom: 20,
    right: 30,
    transform: [{ rotate: '-10deg' }],
    zIndex: -1,
  },
  decorationBrick3: {
    position: 'absolute',
    width: 50,
    height: 25,
    borderRadius: 4,
    top: 120,
    right: 15,
    transform: [{ rotate: '25deg' }],
    zIndex: -1,
  },
});