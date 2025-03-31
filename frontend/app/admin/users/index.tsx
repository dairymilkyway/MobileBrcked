import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Define interface for user data
interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  lastActive: string;
  orders: number;
}

// Mock data
const userData: User[] = [
  { id: 1, name: 'John Builder', email: 'john@example.com', role: 'Administrator', lastActive: '2 hours ago', orders: 24 },
  { id: 2, name: 'Emma Bricks', email: 'emma@example.com', role: 'Moderator', lastActive: '1 day ago', orders: 12 },
  { id: 3, name: 'Mike Blocks', email: 'mike@example.com', role: 'Content Creator', lastActive: '5 mins ago', orders: 8 },
  { id: 4, name: 'Sarah Plates', email: 'sarah@example.com', role: 'Inventory Manager', lastActive: '3 hours ago', orders: 16 },
  { id: 5, name: 'David Lego', email: 'david@example.com', role: 'Customer', lastActive: '1 hour ago', orders: 9 },
  { id: 6, name: 'Jessica Brick', email: 'jessica@example.com', role: 'Customer', lastActive: '2 days ago', orders: 7 },
  { id: 7, name: 'Robert Piece', email: 'robert@example.com', role: 'Customer', lastActive: '4 hours ago', orders: 15 },
  { id: 8, name: 'Michelle Set', email: 'michelle@example.com', role: 'Customer', lastActive: '12 hours ago', orders: 4 },
];

const UsersScreen = () => {
  const renderUserItem = ({ item }: { item: User }) => (
    <TouchableOpacity style={styles.userCard}>
      <View style={styles.userInfoContainer}>
        <View style={styles.userAvatarContainer}>
          <Text style={styles.userAvatar}>{item.name.charAt(0)}</Text>
        </View>
        <View style={styles.userDetails}>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
          <Text style={styles.userRole}>{item.role}</Text>
        </View>
      </View>
      <View style={styles.userStatsContainer}>
        <View style={styles.userStatItem}>
          <Ionicons name="time-outline" size={16} color="#666" />
          <Text style={styles.userStatText}>{item.lastActive}</Text>
        </View>
        <View style={styles.userStatItem}>
          <Ionicons name="cart-outline" size={16} color="#666" />
          <Text style={styles.userStatText}>{item.orders} Orders</Text>
        </View>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="create-outline" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Users Management</Text>
          <TouchableOpacity style={styles.addButton}>
            <Ionicons name="add" size={24} color="#fff" />
            <Text style={styles.addButtonText}>Add User</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.filterContainer}>
          <TouchableOpacity style={styles.filterButton}>
            <Ionicons name="filter-outline" size={16} color="#333" />
            <Text style={styles.filterButtonText}>Filter</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterButton}>
            <Ionicons name="search-outline" size={16} color="#333" />
            <Text style={styles.filterButtonText}>Search</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={userData}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#c41818',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterButtonText: {
    marginLeft: 6,
    color: '#333',
  },
  listContainer: {
    paddingBottom: 20,
  },
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  userInfoContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  userAvatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#c41818',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userAvatar: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  userDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  userRole: {
    fontSize: 14,
    color: '#c41818',
    fontWeight: '500',
  },
  userStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  userStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  userStatText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#666',
  },
  actionButton: {
    backgroundColor: '#c41818',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default UsersScreen; 