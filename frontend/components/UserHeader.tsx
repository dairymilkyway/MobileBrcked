import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function UserHeader({ section = 'Home' }) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // LEGO studs for the top of bricks
  const renderStuds = (count) => {
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
    try {
      // Clear the user token and role from AsyncStorage
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userRole');
      
      // Navigate back to the login screen
      router.replace('/Login');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.leftSection}>
          <View style={styles.logoContainer}>
            <View style={styles.logoShadow}>
              <MaterialCommunityIcons name="toy-brick" size={45} color="#FFFFFF" />
            </View>
          </View>
          <Text style={styles.sectionText}>{section}</Text>
        </View>
        <View style={styles.rightSection}>
          <TouchableOpacity 
            style={styles.legoButton}
            onPress={() => alert('Profile feature coming soon')}
          >
            <MaterialCommunityIcons name="account" size={22} color="#FFFFFF" />
            <View style={styles.buttonStud} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.legoButton, { backgroundColor: '#FFC500' }]}
            onPress={() => alert('Notifications feature coming soon')}
          >
            <MaterialCommunityIcons 
              name="bell" 
              size={22} 
              color="#FFFFFF" 
            />
            <View style={styles.buttonStud} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.legoButton, { backgroundColor: '#4CAF50' }]}
            onPress={() => alert('Cart feature coming soon')}
          >
            <MaterialCommunityIcons 
              name="cart" 
              size={22} 
              color="#FFFFFF" 
            />
            <View style={styles.buttonStud} />
          </TouchableOpacity>
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
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center'
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
    backgroundColor: 'rgba(255,255,255,0.8)',
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
});