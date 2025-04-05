import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, SafeAreaView, StatusBar, Alert, ActivityIndicator, Platform, KeyboardAvoidingView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from '../../../env';

// LEGO brand colors for professional theming
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

interface FormData {
  username: string;
  email: string;
  password: string;
  role: string;
}

const AddUserScreen = () => {
  const [formData, setFormData] = useState<FormData>({
    username: '',
    email: '',
    password: '',
    role: 'user',
  });
  const [loading, setLoading] = useState(false);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    // Basic validation
    if (!formData.username || !formData.email || !formData.password) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    if (!formData.email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        router.replace('/Login');
        return;
      }

      await axios.post(`${API_BASE_URL}/users`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      Alert.alert(
        'Success',
        'User created successfully',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      console.error('Error creating user:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Failed to create user'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={LEGO_COLORS.red} />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardContainer}
      >
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentInner}
        >
          {/* Header with LEGO styling */}
          <View style={styles.pageHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color={LEGO_COLORS.darkGrey} />
            </TouchableOpacity>
            <View style={styles.titleContainer}>
              <View style={styles.logoStuds}>
                {[...Array(3)].map((_, i) => (
                  <Stud key={i} color={LEGO_COLORS.yellow} size={14} />
                ))}
              </View>
              <Text style={styles.pageHeaderTitle}>Add New User</Text>
            </View>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.sectionHeaderBar}>
              <Text style={styles.sectionTitle}>User Information</Text>
              <View style={styles.headerStuds}>
                <Stud color={LEGO_COLORS.blue} />
                <Stud color={LEGO_COLORS.green} />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Username *</Text>
              <TextInput
                style={styles.input}
                value={formData.username}
                onChangeText={(text) => handleInputChange('username', text)}
                placeholder="Enter username"
                autoCapitalize="none"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Email *</Text>
              <TextInput
                style={styles.input}
                value={formData.email}
                onChangeText={(text) => handleInputChange('email', text)}
                placeholder="Enter email"
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Password *</Text>
              <TextInput
                style={styles.input}
                value={formData.password}
                onChangeText={(text) => handleInputChange('password', text)}
                placeholder="Enter password"
                secureTextEntry
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Role</Text>
              <View style={styles.roleContainer}>
                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    formData.role === 'user' && styles.activeRoleButton,
                  ]}
                  onPress={() => handleInputChange('role', 'user')}
                >
                  <Text
                    style={[
                      styles.roleButtonText,
                      formData.role === 'user' && styles.activeRoleButtonText,
                    ]}
                  >
                    User
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    formData.role === 'admin' && styles.activeRoleButton,
                  ]}
                  onPress={() => handleInputChange('role', 'admin')}
                >
                  <Text
                    style={[
                      styles.roleButtonText,
                      formData.role === 'admin' && styles.activeRoleButtonText,
                    ]}
                  >
                    Admin
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={LEGO_COLORS.white} />
              ) : (
                <>
                  <Ionicons name="save-outline" size={20} color={LEGO_COLORS.white} />
                  <Text style={styles.submitButtonText}>Create User</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
          
          {/* LEGO footer decoration */}
          <View style={styles.legoFooter}>
            {[...Array(8)].map((_, i) => (
              <Stud key={i} color={i % 2 === 0 ? LEGO_COLORS.red : LEGO_COLORS.blue} size={16} />
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: LEGO_COLORS.red,
  },
  keyboardContainer: {
    flex: 1,
    backgroundColor: LEGO_COLORS.lightGrey,
  },
  scrollView: {
    flex: 1,
  },
  contentInner: {
    padding: 16,
    paddingBottom: 40,
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 12,
    borderBottomWidth: 4,
    borderBottomColor: LEGO_COLORS.yellow,
    marginTop: 20,
  },
  backButton: {
    padding: 8,
    marginRight: 10,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoStuds: {
    flexDirection: 'row',
    marginRight: 10,
  },
  pageHeaderTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: LEGO_COLORS.black,
    ...Platform.select({
      ios: {
        fontFamily: 'System',
      },
      android: {
        fontFamily: 'sans-serif-black',
      }
    })
  },
  formContainer: {
    backgroundColor: LEGO_COLORS.white,
    borderRadius: 8,
    padding: 16,
    borderWidth: 2,
    borderColor: LEGO_COLORS.darkGrey,
    ...LEGO_SHADOW
  },
  sectionHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: LEGO_COLORS.yellow,
    paddingBottom: 10,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: LEGO_COLORS.black,
  },
  headerStuds: {
    flexDirection: 'row',
  },
  formGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: LEGO_COLORS.darkGrey,
  },
  input: {
    backgroundColor: LEGO_COLORS.white,
    borderWidth: 2,
    borderColor: LEGO_COLORS.darkGrey,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: LEGO_COLORS.darkGrey,
  },
  roleContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  roleButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: LEGO_COLORS.darkGrey,
    backgroundColor: LEGO_COLORS.white,
    ...LEGO_SHADOW
  },
  activeRoleButton: {
    backgroundColor: LEGO_COLORS.red,
    borderColor: LEGO_COLORS.black,
  },
  roleButtonText: {
    fontSize: 16,
    color: LEGO_COLORS.darkGrey,
    fontWeight: '500',
  },
  activeRoleButtonText: {
    color: LEGO_COLORS.white,
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: LEGO_COLORS.green,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: LEGO_COLORS.black,
    ...LEGO_SHADOW
  },
  submitButtonText: {
    color: LEGO_COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  disabledButton: {
    opacity: 0.7,
  },
  legoFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 20,
    marginTop: 20,
  },
});

export default AddUserScreen;