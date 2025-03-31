import React from 'react';
import { View, Text, StyleSheet, Platform, FlatList, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Define order type
interface Order {
  id: string;
  customer: string;
  date: string;
  status: 'delivered' | 'processing' | 'shipped';
  total: string;
  items: number;
}

// Mock order data
const MOCK_ORDERS: Order[] = [
  { id: 'ORD-001', customer: 'John Smith', date: '2023-03-25', status: 'delivered', total: '$129.99', items: 3 },
  { id: 'ORD-002', customer: 'Emma Jones', date: '2023-03-26', status: 'processing', total: '$85.50', items: 2 },
  { id: 'ORD-003', customer: 'Michael Davis', date: '2023-03-26', status: 'shipped', total: '$210.75', items: 5 },
  { id: 'ORD-004', customer: 'Sarah Wilson', date: '2023-03-27', status: 'processing', total: '$42.99', items: 1 },
  { id: 'ORD-005', customer: 'David Brown', date: '2023-03-28', status: 'delivered', total: '$156.25', items: 4 },
  { id: 'ORD-006', customer: 'Lisa Miller', date: '2023-03-29', status: 'shipped', total: '$88.75', items: 2 },
  { id: 'ORD-007', customer: 'Robert Johnson', date: '2023-03-29', status: 'processing', total: '$175.00', items: 4 },
  { id: 'ORD-008', customer: 'Jennifer Lee', date: '2023-03-30', status: 'delivered', total: '$67.50', items: 1 },
];

// Order item component
const OrderItem = ({ order }: { order: Order }) => {
  // Get status color
  const getStatusColor = (status: 'delivered' | 'processing' | 'shipped'): string => {
    switch(status) {
      case 'delivered': return '#4CAF50'; // Green
      case 'shipped': return '#FF9800'; // Orange
      case 'processing': return '#2196F3'; // Blue
      default: return '#9E9E9E'; // Gray
    }
  };

  return (
    <TouchableOpacity style={styles.orderItem}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderId}>{order.id}</Text>
        <View style={[styles.statusChip, { backgroundColor: getStatusColor(order.status) }]}>
          <Text style={styles.statusText}>{order.status}</Text>
        </View>
      </View>
      
      <View style={styles.orderDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="person-outline" size={16} color="#666" />
          <Text style={styles.detailText}>{order.customer}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color="#666" />
          <Text style={styles.detailText}>{order.date}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="cube-outline" size={16} color="#666" />
          <Text style={styles.detailText}>{order.items} items</Text>
        </View>
      </View>
      
      <View style={styles.orderFooter}>
        <Text style={styles.orderTotal}>{order.total}</Text>
        <View style={styles.orderActions}>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="eye-outline" size={18} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="car-outline" size={18} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#666" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function OrdersSection() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Orders Management</Text>
          <TouchableOpacity style={styles.addButton}>
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>New Order</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.filterContainer}>
          <TouchableOpacity style={[styles.filterChip, styles.activeFilter]}>
            <Text style={styles.activeFilterText}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterChip}>
            <Text style={styles.filterText}>Processing</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterChip}>
            <Text style={styles.filterText}>Shipped</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterChip}>
            <Text style={styles.filterText}>Delivered</Text>
          </TouchableOpacity>
        </View>
        
        <FlatList
          data={MOCK_ORDERS}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <OrderItem order={item} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#c41818',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    marginLeft: 5,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 10,
    marginBottom: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  activeFilter: {
    backgroundColor: '#c41818',
    borderColor: '#c41818',
  },
  filterText: {
    color: '#666666',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  activeFilterText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontWeight: 'bold',
  },
  listContent: {
    paddingBottom: 20,
  },
  orderItem: {
    backgroundColor: '#ffffff',
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
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  orderDetails: {
    borderBottomWidth: 1,
    borderTopWidth: 1,
    borderColor: '#f0f0f0',
    paddingVertical: 12,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    marginLeft: 8,
    color: '#666666',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  orderActions: {
    flexDirection: 'row',
  },
  actionButton: {
    marginLeft: 16,
  }
}); 