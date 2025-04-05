import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, StatusBar, Alert, ActivityIndicator, Modal, ScrollView, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import axios from 'axios';
import { API_BASE_URL } from '../../../env';

// Define interface for user data
interface User {
  _id: string;
  username: string;
  email: string;
  role: string;
}

const { width, height } = Dimensions.get('window');

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

const UsersScreen = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Fetch users from API
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get token from AsyncStorage
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        router.replace('/Login');
        return;
      }

      // Fetch users from API
      const response = await axios.get(`${API_BASE_URL}/users`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setUsers(response.data);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      if (err.response?.status === 403) {
        Alert.alert('Access Denied', 'You do not have permission to view this page');
        router.back();
      } else {
        setError('Failed to load users. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Delete user handler
  const handleDeleteUser = async (userId: string, username: string) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      // Confirm delete
      Alert.alert(
        'Delete User',
        `Are you sure you want to delete ${username}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Delete', 
            style: 'destructive', 
            onPress: async () => {
              try {
                await axios.delete(`${API_BASE_URL}/users/${userId}`, {
                  headers: {
                    Authorization: `Bearer ${token}`
                  }
                });
                
                // Refresh user list
                fetchUsers();
                Alert.alert('Success', 'User deleted successfully');
                if (selectedUser && selectedUser._id === userId) {
                  setModalVisible(false);
                }
              } catch (error) {
                console.error('Error deleting user:', error);
                Alert.alert('Error', 'Failed to delete user');
              }
            } 
          }
        ]
      );
    } catch (err) {
      console.error('Error deleting user:', err);
      Alert.alert('Error', 'Failed to delete user');
    }
  };

  const handleViewDetails = (user: User) => {
    setSelectedUser(user);
    setModalVisible(true);
  };

  const renderUserItem = ({ item }: { item: User }) => (
    <View style={styles.userCard}>
      <View style={styles.userInfoContainer}>
        <View style={styles.userAvatarContainer}>
          <Text style={styles.userAvatar}>{item.username.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.userDetails}>
          <Text style={styles.userName}>{item.username}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
          <View style={styles.roleContainer}>
            <Text style={[
              styles.userRole, 
              { color: item.role === 'admin' ? LEGO_COLORS.red : LEGO_COLORS.blue }
            ]}>{item.role}</Text>
          </View>
          <TouchableOpacity 
            style={styles.viewDetailsButton}
            onPress={() => handleViewDetails(item)}
          >
            <Text style={styles.viewDetailsText}>View Details</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.editButton]}
          onPress={() => router.push({
            pathname: '/admin/users/edit/[id]' as any,
            params: { id: item._id }
          })}
        >
          <Ionicons name="create-outline" size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteUser(item._id, item.username)}
        >
          <Ionicons name="trash-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderUserDetailsModal = () => {
    if (!selectedUser) return null;
    
    return (
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitle}>
                <View style={styles.logoStuds}>
                  {[...Array(3)].map((_, i) => (
                    <Stud key={i} color={LEGO_COLORS.yellow} size={14} />
                  ))}
                </View>
                <Text style={styles.modalTitle}>User Details</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScrollView}>
              <View style={styles.detailsContainer}>
                <View style={styles.userDetailHeader}>
                  <View style={styles.userDetailAvatarContainer}>
                    <Text style={styles.userDetailAvatar}>
                      {selectedUser.username.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.detailsName}>{selectedUser.username}</Text>
                    <View style={styles.roleDetailsBadge}>
                      <Text style={[
                        styles.roleDetailsText,
                        { backgroundColor: selectedUser.role === 'admin' ? LEGO_COLORS.red : LEGO_COLORS.blue }
                      ]}>{selectedUser.role.toUpperCase()}</Text>
                    </View>
                  </View>
                </View>
                
                <View style={styles.detailsRow}>
                  <Text style={styles.detailsLabel}>Email:</Text>
                  <Text style={styles.detailsValue}>{selectedUser.email}</Text>
                </View>
                
                <View style={styles.detailsRow}>
                  <Text style={styles.detailsLabel}>User ID:</Text>
                  <Text style={styles.detailsValue}>{selectedUser._id}</Text>
                </View>
              </View>
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.editButton]}
                onPress={() => {
                  setModalVisible(false);
                  router.push({
                    pathname: '/admin/users/edit/[id]' as any,
                    params: { id: selectedUser._id }
                  });
                }}
              >
                <Ionicons name="create-outline" size={20} color="#fff" />
                <Text style={styles.modalButtonText}>Edit User</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.deleteButton]}
                onPress={() => {
                  setModalVisible(false);
                  handleDeleteUser(selectedUser._id, selectedUser.username);
                }}
              >
                <Ionicons name="trash-outline" size={20} color="#fff" />
                <Text style={styles.modalButtonText}>Delete User</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // Handle add new user
  const handleAddUser = () => {
    router.push('/admin/users/add' as any);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={LEGO_COLORS.red} />
          <Text style={styles.loadingText}>Loading users...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={LEGO_COLORS.red} />
      <View style={styles.container}>
        <View style={styles.pageHeader}>
          <View style={styles.logoContainer}>
            <View style={styles.logoStuds}>
              {[...Array(4)].map((_, i) => (
                <Stud key={i} color={LEGO_COLORS.yellow} size={14} />
              ))}
            </View>
            <Text style={styles.pageHeaderTitle}>Users Management</Text>
          </View>
          
          <Text style={styles.pageHeaderSubtitle}>Manage system users and access rights</Text>
          
          <TouchableOpacity style={styles.addButton} onPress={handleAddUser}>
            <Ionicons name="add" size={24} color="#fff" />
            <Text style={styles.addButtonText}>Add User</Text>
          </TouchableOpacity>
        </View>
        
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchUsers}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : users.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No users found</Text>
            <TouchableOpacity 
              style={styles.addEmptyButton}
              onPress={handleAddUser}
            >
              <Text style={styles.addButtonText}>Add your first user</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={users}
            renderItem={renderUserItem}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        )}

        {renderUserDetailsModal()}
        
        {/* LEGO footer decoration */}
        <View style={styles.legoFooter}>
          {[...Array(8)].map((_, i) => (
            <Stud key={i} color={i % 2 === 0 ? LEGO_COLORS.red : LEGO_COLORS.blue} size={16} />
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: LEGO_COLORS.red,
  },
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: LEGO_COLORS.lightGrey,
  },
  pageHeader: {
    flexDirection: 'column',
    marginBottom: 24,
    borderBottomWidth: 4,
    borderBottomColor: LEGO_COLORS.yellow,
    paddingBottom: 16,
    marginTop: 30,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  logoStuds: {
    flexDirection: 'row',
    marginRight: 10,
  },
  pageHeaderTitle: {
    fontSize: 24,
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
  pageHeaderSubtitle: {
    fontSize: 16,
    color: LEGO_COLORS.darkGrey,
    marginBottom: 16,
  },
  addButton: {
    flexDirection: 'row',
    backgroundColor: LEGO_COLORS.green,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: LEGO_COLORS.black,
    width: '100%',
    ...LEGO_SHADOW
  },
  addButtonText: {
    color: LEGO_COLORS.white,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: LEGO_COLORS.red,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: LEGO_COLORS.blue,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: LEGO_COLORS.black,
    ...LEGO_SHADOW
  },
  retryButtonText: {
    color: LEGO_COLORS.white,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginTop: 12,
  },
  addEmptyButton: {
    flexDirection: 'row',
    backgroundColor: LEGO_COLORS.green,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    borderWidth: 1.5,
    borderColor: LEGO_COLORS.black,
    ...LEGO_SHADOW
  },
  listContainer: {
    paddingBottom: 20,
  },
  userCard: {
    backgroundColor: LEGO_COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: LEGO_COLORS.darkGrey,
    ...LEGO_SHADOW
  },
  userInfoContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  userAvatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: LEGO_COLORS.red,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 2,
    borderColor: LEGO_COLORS.darkGrey,
  },
  userAvatar: {
    fontSize: 24,
    fontWeight: 'bold',
    color: LEGO_COLORS.white,
  },
  userDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: LEGO_COLORS.darkGrey,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: LEGO_COLORS.darkGrey,
    marginBottom: 8,
  },
  roleContainer: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  userRole: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  viewDetailsButton: {
    backgroundColor: LEGO_COLORS.blue,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  viewDetailsText: {
    fontSize: 12,
    color: LEGO_COLORS.white,
    fontWeight: '500',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: LEGO_COLORS.lightGrey,
    paddingTop: 12,
    gap: 10,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: LEGO_COLORS.black,
    ...LEGO_SHADOW
  },
  editButton: {
    backgroundColor: LEGO_COLORS.blue,
  },
  deleteButton: {
    backgroundColor: LEGO_COLORS.red,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width * 0.92,
    maxHeight: '85%',
    backgroundColor: LEGO_COLORS.white,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: LEGO_COLORS.darkGrey,
    ...LEGO_SHADOW
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 3,
    borderBottomColor: LEGO_COLORS.yellow,
    backgroundColor: LEGO_COLORS.lightGrey,
  },
  modalHeaderTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: LEGO_COLORS.darkGrey,
  },
  modalScrollView: {
    maxHeight: '80%',
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 3,
    borderTopColor: LEGO_COLORS.lightGrey,
    backgroundColor: LEGO_COLORS.lightGrey,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
    borderWidth: 1.5,
    borderColor: LEGO_COLORS.black,
    ...LEGO_SHADOW
  },
  modalButtonText: {
    color: LEGO_COLORS.white,
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 14,
  },
  // User details styles
  detailsContainer: {
    padding: 20,
    backgroundColor: LEGO_COLORS.white,
  },
  userDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    borderBottomWidth: 2,
    borderBottomColor: LEGO_COLORS.lightGrey,
    paddingBottom: 20,
  },
  userDetailAvatarContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: LEGO_COLORS.red,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
    borderWidth: 3,
    borderColor: LEGO_COLORS.darkGrey,
    ...LEGO_SHADOW
  },
  userDetailAvatar: {
    fontSize: 32,
    fontWeight: 'bold',
    color: LEGO_COLORS.white,
  },
  detailsName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: LEGO_COLORS.darkGrey,
    marginBottom: 10,
  },
  roleDetailsBadge: {
    alignSelf: 'flex-start',
  },
  roleDetailsText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: LEGO_COLORS.white,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  detailsRow: {
    flexDirection: 'row',
    marginBottom: 12,
    backgroundColor: LEGO_COLORS.lightGrey,
    padding: 12,
    borderRadius: 8,
  },
  detailsLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: LEGO_COLORS.darkGrey,
    marginRight: 8,
  },
  detailsValue: {
    fontSize: 16,
    color: LEGO_COLORS.darkGrey,
    flex: 1,
  },
  legoFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 20,
  },
});

export default UsersScreen;