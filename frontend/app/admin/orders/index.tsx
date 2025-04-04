import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, FlatList, TouchableOpacity, SafeAreaView, StatusBar, Alert, Modal, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@/env';
import axios from 'axios';
import * as Notifications from 'expo-notifications';

// Define order type
interface Order {
  _id: string;
  orderId: string;
  userId: string;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    imageURL?: string;
  }[];
  shippingDetails: {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    postalCode: string;
  };
  paymentMethod: string;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
  deliveredAt?: string;
  cancelledAt?: string;
}

// Order detail modal component
const OrderDetailModal = ({ order, visible, onClose }: { order: Order | null, visible: boolean, onClose: () => void }) => {
  if (!order) return null;
  
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Order Details - {order.orderId}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalSection}>
            <Text style={styles.sectionTitle}>Customer Information</Text>
            <View style={styles.customerInfoContainer}>
              <View style={styles.customerInfoItem}>
                <Ionicons name="person" size={18} color="#666" />
                <Text style={styles.detailText}>{order.shippingDetails.name}</Text>
              </View>
              <View style={styles.customerInfoItem}>
                <Ionicons name="mail" size={18} color="#666" />
                <Text style={styles.detailText}>{order.shippingDetails.email}</Text>
              </View>
              <View style={styles.customerInfoItem}>
                <Ionicons name="call" size={18} color="#666" />
                <Text style={styles.detailText}>{order.shippingDetails.phone}</Text>
              </View>
              <View style={styles.customerInfoItem}>
                <Ionicons name="location" size={18} color="#666" />
                <Text style={styles.detailText}>
                  {order.shippingDetails.address}, {order.shippingDetails.city}, {order.shippingDetails.postalCode}
                </Text>
              </View>
            </View>
          </View>
          
          <View style={styles.modalSection}>
            <Text style={styles.sectionTitle}>Order Items</Text>
            {order.items.map((item, index) => (
              <View key={`item-${index}`} style={styles.orderItemCard}>
                {item.imageURL ? (
                  <Image 
                    source={{ uri: item.imageURL }} 
                    style={styles.productImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.noImageContainer}>
                    <Ionicons name="image-outline" size={24} color="#ccc" />
                  </View>
                )}
                <View style={styles.itemDetails}>
                  <Text style={styles.itemName}>{item.productName}</Text>
                  <View style={styles.itemRow}>
                    <Text style={styles.itemLabel}>Quantity:</Text>
                    <Text style={styles.itemValue}>{item.quantity}</Text>
                  </View>
                  <View style={styles.itemRow}>
                    <Text style={styles.itemLabel}>Price:</Text>
                    <Text style={styles.itemValue}>₱{item.price.toFixed(2)}</Text>
                  </View>
                  <View style={styles.itemRow}>
                    <Text style={styles.itemLabel}>Total:</Text>
                    <Text style={styles.itemValue}>₱{(item.quantity * item.price).toFixed(2)}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
          
          <View style={styles.modalSection}>
            <Text style={styles.sectionTitle}>Payment Summary</Text>
            <View style={styles.paymentMethodContainer}>
              <Ionicons 
                name={order.paymentMethod === 'cod' ? 'cash' : order.paymentMethod === 'gcash' ? 'phone-portrait' : 'card'} 
                size={22} 
                color="#666" 
              />
              <Text style={styles.paymentMethodText}>
                {order.paymentMethod === 'cod' ? 'Cash on Delivery' : order.paymentMethod === 'gcash' ? 'GCash' : 'Credit Card'}
              </Text>
            </View>
            <View style={styles.paymentDetails}>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Subtotal:</Text>
                <Text style={styles.paymentValue}>₱{order.subtotal.toFixed(2)}</Text>
              </View>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Shipping:</Text>
                <Text style={styles.paymentValue}>₱{order.shipping.toFixed(2)}</Text>
              </View>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Tax:</Text>
                <Text style={styles.paymentValue}>₱{order.tax.toFixed(2)}</Text>
              </View>
              <View style={[styles.paymentRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total:</Text>
                <Text style={styles.totalValue}>₱{order.total.toFixed(2)}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Order item component
const OrderItem = ({ 
  order, 
  onViewDetails, 
  onUpdateStatus 
}: { 
  order: Order, 
  onViewDetails: (order: Order) => void,
  onUpdateStatus: (orderId: string, status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled') => void
}) => {
  // Get status color
  const getStatusColor = (status: string): string => {
    switch(status) {
      case 'delivered': return '#4CAF50'; // Green
      case 'shipped': return '#FF9800'; // Orange
      case 'processing': return '#2196F3'; // Blue
      case 'cancelled': return '#F44336'; // Red
      default: return '#9E9E9E'; // Gray
    }
  };

  return (
    <View style={styles.orderItem}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderId}>{order.orderId}</Text>
        <View style={[styles.statusChip, { backgroundColor: getStatusColor(order.status) }]}>
          <Text style={styles.statusText}>{order.status}</Text>
        </View>
      </View>
      
      <View style={styles.orderDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="person-outline" size={16} color="#666" />
          <Text style={styles.detailText}>{order.shippingDetails.name}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color="#666" />
          <Text style={styles.detailText}>{new Date(order.createdAt).toLocaleDateString()}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="cube-outline" size={16} color="#666" />
          <Text style={styles.detailText}>{order.items.length} items</Text>
        </View>
      </View>
      
      <View style={styles.orderFooter}>
        <Text style={styles.orderTotal}>₱{order.total.toFixed(2)}</Text>
        <TouchableOpacity 
          style={styles.detailsButton} 
          onPress={() => onViewDetails(order)}
        >
          <Ionicons name="eye-outline" size={16} color="#333" style={styles.buttonIcon} />
          <Text style={styles.detailsButtonText}>View Details</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.actionButtonsContainer}>
        <Text style={styles.actionTitle}>Update Status:</Text>
        <View style={styles.actionButtonsRow}>
          {order.status !== 'processing' && order.status !== 'delivered' && order.status !== 'cancelled' && (
            <TouchableOpacity 
              style={[styles.actionTextButton, styles.processingButton]}
              onPress={() => onUpdateStatus(order.orderId, 'processing')}
            >
              <Ionicons name="time-outline" size={18} color="#FFFFFF" style={styles.buttonIcon} />
              <Text style={styles.actionTextButtonLabel}>Processing</Text>
            </TouchableOpacity>
          )}
          
          {order.status !== 'delivered' && order.status !== 'cancelled' && (
            <TouchableOpacity 
              style={[styles.actionTextButton, styles.deliveredButton]}
              onPress={() => onUpdateStatus(order.orderId, 'delivered')}
            >
              <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" style={styles.buttonIcon} />
              <Text style={styles.actionTextButtonLabel}>Delivered</Text>
            </TouchableOpacity>
          )}
          
          {order.status !== 'delivered' && order.status !== 'cancelled' && (
            <TouchableOpacity 
              style={[styles.actionTextButton, styles.cancelButton]}
              onPress={() => onUpdateStatus(order.orderId, 'cancelled')}
            >
              <Ionicons name="close-circle-outline" size={18} color="#FFFFFF" style={styles.buttonIcon} />
              <Text style={styles.actionTextButtonLabel}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

export default function OrdersSection() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Fetch orders when component mounts
  useEffect(() => {
    fetchOrders();
  }, []);
  
  // Fetch orders from API
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        Alert.alert('Authentication Error', 'You need to be logged in to access this page.');
        setLoading(false);
        return;
      }
      
      try {
        const response = await axios.get(`${API_BASE_URL}/orders/admin`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (response.data.success) {
          setOrders(response.data.data);
        } else {
          Alert.alert('Error', 'Failed to fetch orders.');
        }
      } catch (error: any) {
        console.error('Error fetching orders:', error);
        
        if (error.response) {
          if (error.response.status === 403) {
            Alert.alert(
              'Access Denied', 
              'You do not have admin privileges to access this page.'
            );
          } else {
            Alert.alert('Error', `Server error: ${error.response.status}`);
          }
        } else if (error.request) {
          Alert.alert('Network Error', 'Could not connect to the server. Please check your internet connection.');
        } else {
          Alert.alert('Error', 'An unknown error occurred while fetching orders.');
        }
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Update order status
  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      setLoading(true);
      console.log(`Updating order ${orderId} status to ${newStatus}`);

      const userToken = await AsyncStorage.getItem('userToken');
      
      if (!userToken) {
        Alert.alert('Error', 'You need to be logged in to update orders');
        setLoading(false);
        return;
      }

      const response = await axios.patch(
        `${API_BASE_URL}/orders/admin/status/${orderId}`,
        { status: newStatus },
        {
          headers: {
            'Authorization': `Bearer ${userToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        console.log('Order status updated successfully');
        console.log('Status changed:', response.data.statusChanged);
        console.log('Previous status:', response.data.previousStatus);
        console.log('New status:', response.data.newStatus);
        
        // Create a better notification message based on the status change
        let notificationBody = `Order #${orderId} status changed to: ${newStatus}`;
        if (response.data.previousStatus && response.data.newStatus) {
          notificationBody = `Order #${orderId} status changed from ${response.data.previousStatus} to ${response.data.newStatus}`;
        }
        
        // IMPORTANT: Additional attempt to create notification receipt
        // This bypasses the need for push notifications and directly creates 
        // a receipt that the client can check for
        try {
          console.log('Creating direct notification receipt for order status update');
          
          // Attempt to create a receipt
          const receiptResponse = await axios.post(
            `${API_BASE_URL}/notifications/receipt`,
            {
              orderId,
              status: newStatus,
              previousStatus: response.data.previousStatus,
              message: notificationBody,
              timestamp: Date.now(),
              forceShow: true
            },
            {
              headers: {
                'Authorization': `Bearer ${userToken}`,
                'Content-Type': 'application/json'
              }
            }
          );
          
          if (receiptResponse.data.success) {
            console.log('Notification receipt created successfully');
          }
        } catch (receiptError: any) {
          // If the receipt endpoint doesn't exist, just log and continue
          console.log('Notification receipt API not available:', receiptError.message);
        }
        
        // Immediate local notification for testing purposes
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Order Status Updated',
            body: notificationBody,
            data: { 
              orderId, 
              status: newStatus,
              forceShow: true,  // Special flag to force show notification
              type: 'orderUpdate',
              immediate: true,   // Flag to indicate this is an immediate notification
              previousStatus: response.data.previousStatus,
              statusChanged: true,
              timestamp: response.data.timestamp || Date.now()
            },
          },
          trigger: null // Send immediately
        });
        
        console.log('Scheduled immediate local notification for status update');
        
        // Remove success Alert dialog - just log the success
        console.log('Success', notificationBody);
        
        // Refresh order list
        fetchOrders();
      } else {
        console.error('Failed to update order status:', response.data.message);
        Alert.alert('Error', response.data.message || 'Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      Alert.alert('Error', 'An error occurred while updating the order status');
    } finally {
      setLoading(false);
    }
  };
  
  // Filter orders based on selected filter
  const getFilteredOrders = () => {
    if (selectedFilter === 'all') {
      return orders;
    }
    return orders.filter(order => order.status === selectedFilter);
  };
  
  // View order details
  const viewOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setModalVisible(true);
  };
  
  // Close order details modal
  const closeOrderDetails = () => {
    setModalVisible(false);
    setSelectedOrder(null);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Orders Management</Text>
        </View>
        
        <View style={styles.filterContainer}>
          <TouchableOpacity 
            style={[styles.filterChip, selectedFilter === 'all' && styles.activeFilter]}
            onPress={() => setSelectedFilter('all')}
          >
            <Text style={selectedFilter === 'all' ? styles.activeFilterText : styles.filterText}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterChip, selectedFilter === 'pending' && styles.activeFilter]}
            onPress={() => setSelectedFilter('pending')}
          >
            <Text style={selectedFilter === 'pending' ? styles.activeFilterText : styles.filterText}>Pending</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterChip, selectedFilter === 'processing' && styles.activeFilter]}
            onPress={() => setSelectedFilter('processing')}
          >
            <Text style={selectedFilter === 'processing' ? styles.activeFilterText : styles.filterText}>Processing</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterChip, selectedFilter === 'delivered' && styles.activeFilter]}
            onPress={() => setSelectedFilter('delivered')}
          >
            <Text style={selectedFilter === 'delivered' ? styles.activeFilterText : styles.filterText}>Delivered</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterChip, selectedFilter === 'cancelled' && styles.activeFilter]}
            onPress={() => setSelectedFilter('cancelled')}
          >
            <Text style={selectedFilter === 'cancelled' ? styles.activeFilterText : styles.filterText}>Cancelled</Text>
          </TouchableOpacity>
        </View>
        
        <FlatList
          data={getFilteredOrders()}
          keyExtractor={(item) => item._id || item.orderId}
          renderItem={({ item }) => (
            <OrderItem 
              order={item}
              onViewDetails={viewOrderDetails}
              onUpdateStatus={updateOrderStatus}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </View>
      
      <OrderDetailModal
        order={selectedOrder}
        visible={modalVisible}
        onClose={closeOrderDetails}
      />
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
    marginBottom: 12,
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  detailsButton: {
    backgroundColor: '#e8e8e8',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsButtonText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  actionButtonsContainer: {
    marginTop: 8,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
    paddingLeft: 4,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionTextButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  buttonIcon: {
    marginRight: 6,
  },
  processingButton: {
    backgroundColor: '#2196F3',
  },
  deliveredButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButton: {
    backgroundColor: '#F44336',
  },
  actionTextButtonLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 8,
  },
  customerInfoContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 10,
  },
  customerInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderItemCard: {
    flexDirection: 'row',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 10,
    overflow: 'hidden',
  },
  productImage: {
    width: 80,
    height: 80,
  },
  noImageContainer: {
    width: 80,
    height: 80,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemDetails: {
    flex: 1,
    padding: 10,
  },
  itemName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  itemLabel: {
    fontSize: 14,
    color: '#666',
  },
  itemValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  paymentMethodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  paymentMethodText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  paymentDetails: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 10,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  paymentLabel: {
    fontSize: 14,
    color: '#666',
  },
  paymentValue: {
    fontSize: 14,
    color: '#333',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    marginTop: 5,
    paddingTop: 5,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#c41818',
  },
}); 