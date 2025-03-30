import React from 'react';
import { View, Text, StyleSheet, Platform, Dimensions, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AdminSidebar from '@/components/AdminSidebar';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

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
];

// Order item component
const OrderItem = ({ order }: { order: Order }) => {
  // Get status color
  const getStatusColor = (status: 'delivered' | 'processing' | 'shipped'): string => {
    switch(status) {
      case 'delivered': return '#3EC65E'; // Green
      case 'shipped': return '#FF8C01'; // Orange
      case 'processing': return '#006DB7'; // Blue
      default: return '#A0A0A0'; // Gray
    }
  };

  return (
    <View style={styles.orderItem}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderId}>{order.id}</Text>
        <View style={[styles.statusChip, { backgroundColor: getStatusColor(order.status) }]}>
          <Text style={styles.statusText}>{order.status}</Text>
        </View>
      </View>
      
      <View style={styles.orderDetails}>
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="account" size={16} color="#FFFFFFBB" />
          <Text style={styles.detailText}>{order.customer}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="calendar" size={16} color="#FFFFFFBB" />
          <Text style={styles.detailText}>{order.date}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="toy-brick-outline" size={16} color="#FFFFFFBB" />
          <Text style={styles.detailText}>{order.items} items</Text>
        </View>
      </View>
      
      <View style={styles.orderFooter}>
        <Text style={styles.orderTotal}>{order.total}</Text>
        <View style={styles.orderActions}>
          <MaterialCommunityIcons name="eye" size={20} color="#FFFFFFBB" style={styles.actionIcon} />
          <MaterialCommunityIcons name="truck-delivery" size={20} color="#FFFFFFBB" style={styles.actionIcon} />
          <MaterialCommunityIcons name="check-circle" size={20} color="#FFFFFFBB" style={styles.actionIcon} />
        </View>
      </View>
    </View>
  );
};

export default function OrdersScreen() {
  return (
    <SafeAreaView style={styles.container}>
      {!isTablet && <AdminSidebar />}
      
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Orders Management</Text>
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
  container: {
    flex: 1,
    backgroundColor: '#252628',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Futura-Bold' : 'sans-serif-condensed',
  },
  listContent: {
    paddingBottom: 20,
  },
  orderItem: {
    backgroundColor: '#333436',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#444546',
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
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Futura-Bold' : 'sans-serif-condensed',
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
    textTransform: 'capitalize',
    fontFamily: Platform.OS === 'ios' ? 'Futura-Medium' : 'sans-serif-medium',
  },
  orderDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    color: '#FFFFFFBB',
    marginLeft: 8,
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Futura-Medium' : 'sans-serif-medium',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#444546',
  },
  orderTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Futura-Bold' : 'sans-serif-condensed',
  },
  orderActions: {
    flexDirection: 'row',
  },
  actionIcon: {
    marginLeft: 16,
  },
}); 