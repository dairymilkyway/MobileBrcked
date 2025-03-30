import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Platform, 
  Dimensions,
  TextInput
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AdminSidebar from '@/components/AdminSidebar';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

// Mock user data
const MOCK_USERS = [
  { id: '1', username: 'john_smith', email: 'john@example.com', role: 'user', status: 'active', lastLogin: '2 hours ago' },
  { id: '2', username: 'emma_jones', email: 'emma@example.com', role: 'user', status: 'active', lastLogin: '1 day ago' },
  { id: '3', username: 'admin', email: 'admin@gmail.com', role: 'admin', status: 'active', lastLogin: '5 minutes ago' },
  { id: '4', username: 'mike_wilson', email: 'mike@example.com', role: 'user', status: 'inactive', lastLogin: '2 weeks ago' },
  { id: '5', username: 'sarah_miller', email: 'sarah@example.com', role: 'user', status: 'active', lastLogin: '3 days ago' },
  { id: '6', username: 'david_brown', email: 'david@example.com', role: 'moderator', status: 'active', lastLogin: '12 hours ago' },
  { id: '7', username: 'lisa_taylor', email: 'lisa@example.com', role: 'user', status: 'active', lastLogin: '4 days ago' },
];

// LEGO stud component
const LegoStud = ({ style }) => (
  <View style={[styles.legoStud, style]}>
    <View style={styles.legoStudInner} />
  </View>
);

// User item component
const UserItem = ({ user, onPress }) => {
  // Different colors for different roles
  const getRoleColor = (role) => {
    switch(role) {
      case 'admin': return '#E3000B'; // Red for admin
      case 'moderator': return '#006DB7'; // Blue for moderator
      default: return '#3EC65E'; // Green for regular users
    }
  };
  
  // Different colors for different statuses
  const getStatusColor = (status) => {
    return status === 'active' ? '#3EC65E' : '#A0A0A0';
  };

  return (
    <TouchableOpacity style={styles.userItem} onPress={() => onPress(user)}>
      <View style={styles.userAvatar}>
        <Text style={styles.userInitial}>
          {user.username.charAt(0).toUpperCase()}
        </Text>
        
        {/* LEGO stud on avatar */}
        <LegoStud style={{top: -4, right: -4}} />
      </View>
      
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{user.username}</Text>
        <Text style={styles.userEmail}>{user.email}</Text>
      </View>
      
      <View style={styles.userMeta}>
        <View style={[styles.roleChip, {backgroundColor: getRoleColor(user.role)}]}>
          <Text style={styles.roleText}>{user.role}</Text>
          {/* LEGO stud on role chip */}
          <LegoStud style={{top: -4, right: 8}} />
        </View>
        
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, {backgroundColor: getStatusColor(user.status)}]} />
          <Text style={styles.statusText}>{user.status}</Text>
        </View>
        
        <Text style={styles.lastLogin}>
          <MaterialCommunityIcons name="clock-outline" size={12} color="#FFFFFFAA" />
          {' '}{user.lastLogin}
        </Text>
      </View>
      
      <View style={styles.userActions}>
        <TouchableOpacity style={styles.actionButton}>
          <MaterialCommunityIcons name="pencil" size={16} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.deleteButton]}>
          <MaterialCommunityIcons name="delete" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

export default function UsersScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState(MOCK_USERS);
  
  // Filter users based on search query
  const filteredUsers = users.filter(
    user => 
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.role.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const handleUserPress = (user) => {
    // Handle user selection
    console.log('Selected user:', user);
  };

  return (
    <SafeAreaView style={styles.container}>
      {!isTablet && <AdminSidebar />}
      
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>User Management</Text>
          
          <TouchableOpacity style={styles.addUserButton}>
            <LinearGradient
              colors={['#E3000B', '#B01B10']}
              style={styles.addUserGradient}
            >
              <MaterialCommunityIcons name="account-plus" size={20} color="#FFFFFF" />
              <Text style={styles.addUserText}>Add User</Text>
              
              {/* LEGO studs on button */}
              <View style={styles.buttonStudsContainer}>
                <View style={styles.buttonStud} />
                <View style={styles.buttonStud} />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
        
        <View style={styles.searchContainer}>
          <MaterialCommunityIcons name="magnify" size={20} color="#FFFFFFBB" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            placeholderTextColor="#FFFFFFAA"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialCommunityIcons name="close-circle" size={20} color="#FFFFFFBB" />
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.usersContainer}>
          <View style={styles.userCount}>
            <Text style={styles.userCountText}>
              Showing {filteredUsers.length} of {users.length} users
            </Text>
          </View>
          
          <FlatList
            data={filteredUsers}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <UserItem user={item} onPress={handleUserPress} />}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="account-search" size={50} color="#FFFFFFAA" />
                <Text style={styles.emptyText}>No users found</Text>
              </View>
            }
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#252628',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Futura-Bold' : 'sans-serif-condensed',
  },
  addUserButton: {
    overflow: 'hidden',
    borderRadius: 6,
  },
  addUserGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    position: 'relative',
  },
  addUserText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginLeft: 8,
    fontFamily: Platform.OS === 'ios' ? 'Futura-Bold' : 'sans-serif-condensed',
  },
  buttonStudsContainer: {
    position: 'absolute',
    top: -4,
    right: 10,
    flexDirection: 'row',
    width: 30,
    justifyContent: 'space-between',
  },
  buttonStud: {
    width: 8,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#B01B10',
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.3)',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333436',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#444546',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 46,
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  usersContainer: {
    flex: 1,
    backgroundColor: '#333436',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444546',
    overflow: 'hidden',
  },
  userCount: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#444546',
    backgroundColor: '#2A2B2D',
  },
  userCountText: {
    color: '#FFFFFFAA',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  listContent: {
    padding: 10,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3A3B3D',
    borderRadius: 6,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#4A4B4D',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E3000B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    position: 'relative',
  },
  userInitial: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Futura-Bold' : 'sans-serif-condensed',
  },
  userInfo: {
    flex: 1,
    marginRight: 10,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Futura-Medium' : 'sans-serif-medium',
  },
  userEmail: {
    color: '#FFFFFFCC',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  userMeta: {
    marginRight: 10,
    alignItems: 'flex-end',
  },
  roleChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 6,
    position: 'relative',
  },
  roleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Futura-Medium' : 'sans-serif-medium',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    color: '#FFFFFFCC',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  lastLogin: {
    color: '#FFFFFFAA',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  userActions: {
    flexDirection: 'row',
  },
  actionButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#006DB7',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  deleteButton: {
    backgroundColor: '#E3000B',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#FFFFFFAA',
    fontSize: 16,
    marginTop: 10,
    fontFamily: Platform.OS === 'ios' ? 'Futura-Medium' : 'sans-serif-medium',
  },
  legoStud: {
    width: 12,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
  },
  legoStudInner: {
    width: 8,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
});
