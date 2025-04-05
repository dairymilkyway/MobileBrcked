import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, FlatList, TouchableOpacity, SafeAreaView, StatusBar, Alert, Modal, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { fetchAdminOrders, updateOrderStatus, Order, resetOrderState, setSelectedOrder } from '@/redux/slices/orderSlices';

// Get screen dimensions for responsive sizing
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isSmallScreen = screenWidth < 600;

// LEGO brand colors for professional theming (matching dashboard)
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
              <Ionicons name="close" size={24} color={LEGO_COLORS.darkGrey} />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={[1]} // Just need one item to render the content
            keyExtractor={() => 'modal-content'}
            renderItem={() => (
              <>
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
              </>
            )}
            showsVerticalScrollIndicator={true}
          />
        </View>
      </View>
    </Modal>
  );
};

// Order item component
const OrderItem = ({ 
  order, 
  onViewDetails, 
  onUpdateStatus,
  loading
}: { 
  order: Order, 
  onViewDetails: (order: Order) => void,
  onUpdateStatus: (orderId: string, status: Order['status']) => void,
  loading: boolean
}) => {
  // Get status color
  const getStatusColor = (status: string): string => {
    switch(status) {
      case 'delivered': return LEGO_COLORS.green;
      case 'shipped': return LEGO_COLORS.yellow;
      case 'processing': return LEGO_COLORS.blue;
      case 'cancelled': return LEGO_COLORS.red;
      default: return '#9E9E9E'; // Gray
    }
  };

  return (
    <View style={styles.orderItem}>
      {/* Decorative studs */}
      <View style={styles.orderStuds}>
        <Stud color={LEGO_COLORS.blue} />
        <Stud color={LEGO_COLORS.red} />
      </View>
      
      <View style={styles.orderHeader}>
        {/* Status moved above order ID */}
        <View style={styles.statusContainer}>
          <View style={[styles.statusChip, { backgroundColor: getStatusColor(order.status) }]}>
            <Text style={[styles.statusText, 
              order.status === 'shipped' ? {color: LEGO_COLORS.black} : {color: LEGO_COLORS.white}
            ]}>{order.status}</Text>
          </View>
        </View>
        <Text style={styles.orderId}>{order.orderId}</Text>
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
          <Ionicons name="eye-outline" size={16} color={LEGO_COLORS.darkGrey} style={styles.buttonIcon} />
          <Text style={styles.detailsButtonText}>View Details</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.actionButtonsContainer}>
        <Text style={styles.actionTitle}>Update Status:</Text>
        <View style={styles.actionButtonsStack}>
          {order.status !== 'processing' && order.status !== 'delivered' && order.status !== 'cancelled' && (
            <TouchableOpacity 
              style={[
                styles.actionTextButton, 
                styles.processingButton,
                loading && styles.disabledButton
              ]}
              onPress={() => onUpdateStatus(order.orderId, 'processing')}
              disabled={loading}
            >
              <Ionicons name="time-outline" size={18} color={LEGO_COLORS.white} style={styles.buttonIcon} />
              <Text style={styles.actionTextButtonLabel}>Processing</Text>
            </TouchableOpacity>
          )}
          
          {order.status !== 'delivered' && order.status !== 'cancelled' && (
            <TouchableOpacity 
              style={[
                styles.actionTextButton, 
                styles.deliveredButton,
                loading && styles.disabledButton
              ]}
              onPress={() => onUpdateStatus(order.orderId, 'delivered')}
              disabled={loading}
            >
              <Ionicons name="checkmark-circle-outline" size={18} color={LEGO_COLORS.white} style={styles.buttonIcon} />
              <Text style={styles.actionTextButtonLabel}>Delivered</Text>
            </TouchableOpacity>
          )}
          
          {order.status !== 'delivered' && order.status !== 'cancelled' && (
            <TouchableOpacity 
              style={[
                styles.actionTextButton, 
                styles.cancelButton,
                loading && styles.disabledButton
              ]}
              onPress={() => onUpdateStatus(order.orderId, 'cancelled')}
              disabled={loading}
            >
              <Ionicons name="close-circle-outline" size={18} color={LEGO_COLORS.white} style={styles.buttonIcon} />
              <Text style={styles.actionTextButtonLabel}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

export default function OrdersSection() {
  const dispatch = useAppDispatch();
  const { orders, loading, error, selectedOrder, success } = useAppSelector(state => state.orders);
  
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [modalVisible, setModalVisible] = useState(false);

  // Fetch orders when component mounts
  useEffect(() => {
    dispatch(fetchAdminOrders());
    
    return () => {
      // Reset order state when component unmounts
      dispatch(resetOrderState());
    };
  }, [dispatch]);
  
  // Display notification after successful status update
  useEffect(() => {
    if (success) {
      // Schedule a local notification
      const schedulePushNotification = async () => {
        if (selectedOrder) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Order Status Updated',
              body: `Order #${selectedOrder.orderId} status changed to: ${selectedOrder.status}`,
              data: { 
                orderId: selectedOrder.orderId,
                status: selectedOrder.status,
                forceShow: true,
                type: 'orderUpdate',
                immediate: true,
                timestamp: Date.now()
              },
            },
            trigger: null // Send immediately
          });
          
          console.log('Scheduled immediate local notification for status update');
        }
      };
      
      schedulePushNotification();
      
      // Reset success state after notification
      setTimeout(() => {
        dispatch(resetOrderState());
      }, 1000);
    }
  }, [success, selectedOrder]);
  
  // Display error alerts
  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
    }
  }, [error]);
  
  // Handle order status update
  const handleUpdateStatus = (orderId: string, newStatus: Order['status']) => {
    dispatch(updateOrderStatus({ orderId, status: newStatus }));
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
    dispatch(setSelectedOrder(order));
    setModalVisible(true);
  };
  
  // Close order details modal
  const closeOrderDetails = () => {
    setModalVisible(false);
    dispatch(setSelectedOrder(null));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={LEGO_COLORS.red} />
      <View style={styles.container}>
        <View style={styles.contentContainer}>
          {/* Extra Space */}
          <View style={styles.headerSpacer} />
          
          {/* Page Title with LEGO-like header */}
          <View style={styles.pageHeader}>
            <View style={styles.logoContainer}>
              <View style={styles.logoStuds}>
                {[...Array(4)].map((_, i) => (
                  <Stud key={i} color={LEGO_COLORS.yellow} size={14} />
                ))}
              </View>
              <Text style={styles.pageHeaderTitle}>Order Management</Text>
            </View>
            <Text style={styles.pageHeaderSubtitle}>Manage customer orders and track status</Text>
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
          
          {loading && orders.length === 0 ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Building order list...</Text>
            </View>
          ) : (
            <FlatList
              data={getFilteredOrders()}
              keyExtractor={(item) => item._id || item.orderId}
              renderItem={({ item }) => (
                <OrderItem 
                  order={item}
                  onViewDetails={viewOrderDetails}
                  onUpdateStatus={handleUpdateStatus}
                  loading={loading}
                />
              )}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
          
          {/* LEGO footer decoration */}
          <View style={styles.legoFooter}>
            {[...Array(8)].map((_, i) => (
              <Stud key={i} color={i % 2 === 0 ? LEGO_COLORS.red : LEGO_COLORS.blue} size={16} />
            ))}
          </View>
        </View>
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
    backgroundColor: LEGO_COLORS.red, // Match dashboard's red header
  },
  container: {
    flex: 1,
    backgroundColor: LEGO_COLORS.lightGrey,
  },
  contentContainer: {
    flex: 1,
    padding: 20,
  },
  headerSpacer: {
    height: Platform.OS === 'ios' ? 15 : 25, // More space on Android
    width: '100%',
  },
  pageHeader: {
    marginBottom: 24,
    marginTop: 10, // Add top margin
    borderBottomWidth: 4,
    borderBottomColor: LEGO_COLORS.yellow,
    paddingBottom: 12,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginTop: 8,
    marginLeft: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 10,
    marginBottom: 8,
    backgroundColor: LEGO_COLORS.white,
    borderWidth: 2,
    borderColor: LEGO_COLORS.darkGrey,
    ...LEGO_SHADOW
  },
  activeFilter: {
    backgroundColor: LEGO_COLORS.red,
    borderColor: LEGO_COLORS.darkGrey,
  },
  filterText: {
    color: LEGO_COLORS.darkGrey,
    fontSize: 14,
    fontWeight: '500',
  },
  activeFilterText: {
    color: LEGO_COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  listContent: {
    paddingBottom: 20,
  },
  orderItem: {
    backgroundColor: LEGO_COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: LEGO_COLORS.darkGrey,
    ...LEGO_SHADOW
  },
  orderStuds: {
    flexDirection: 'row',
    position: 'absolute',
    top: -8,
    left: 20,
  },
  orderHeader: {
    flexDirection: 'column',
    marginBottom: 12,
    paddingTop: 8,
  },
  statusContainer: {
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  orderId: {
    fontSize: 18,
    fontWeight: 'bold',
    color: LEGO_COLORS.darkGrey,
    ...Platform.select({
      ios: {
        fontFamily: 'System',
      },
      android: {
        fontFamily: 'sans-serif-medium',
      }
    })
  },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: LEGO_COLORS.darkGrey,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  orderDetails: {
    borderBottomWidth: 2,
    borderTopWidth: 2,
    borderColor: LEGO_COLORS.lightGrey,
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
    color: LEGO_COLORS.darkGrey,
    fontSize: 14,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: LEGO_COLORS.black,
  },
  detailsButton: {
    backgroundColor: LEGO_COLORS.lightGrey,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: LEGO_COLORS.darkGrey,
  },
  detailsButtonText: {
    color: LEGO_COLORS.darkGrey,
    fontSize: 14,
    fontWeight: '500',
  },
  actionButtonsContainer: {
    marginTop: 8,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: LEGO_COLORS.darkGrey,
    marginBottom: 8,
    paddingLeft: 4,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButtonsStack: {
    flexDirection: 'column',
    gap: 8,
  },
  actionTextButton: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: LEGO_COLORS.darkGrey,
    ...LEGO_SHADOW
  },
  buttonIcon: {
    marginRight: 8,
  },
  processingButton: {
    backgroundColor: LEGO_COLORS.blue,
  },
  deliveredButton: {
    backgroundColor: LEGO_COLORS.green,
  },
  cancelButton: {
    backgroundColor: LEGO_COLORS.red,
  },
  actionTextButtonLabel: {
    color: LEGO_COLORS.white,
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: LEGO_COLORS.darkGrey,
    fontWeight: '500',
  },
  disabledButton: {
    opacity: 0.5,
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
    backgroundColor: LEGO_COLORS.white,
    borderRadius: 12,
    padding: 20,
    borderWidth: 3,
    borderColor: LEGO_COLORS.darkGrey,
    ...LEGO_SHADOW
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    borderBottomWidth: 3,
    borderBottomColor: LEGO_COLORS.yellow,
    paddingBottom: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: LEGO_COLORS.darkGrey,
  },
  modalSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: LEGO_COLORS.darkGrey,
    marginBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: LEGO_COLORS.lightGrey,
    paddingBottom: 8,
  },
  customerInfoContainer: {
    backgroundColor: LEGO_COLORS.lightGrey,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1.5,
    borderColor: LEGO_COLORS.darkGrey,
  },
  customerInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderItemCard: {
    flexDirection: 'row',
    backgroundColor: LEGO_COLORS.lightGrey,
    borderRadius: 8,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: LEGO_COLORS.darkGrey,
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
    color: LEGO_COLORS.darkGrey,
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
    color: LEGO_COLORS.darkGrey,
    fontWeight: '500',
  },
  paymentMethodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LEGO_COLORS.lightGrey,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: LEGO_COLORS.darkGrey,
  },
  paymentMethodText: {
    marginLeft: 10,
    fontSize: 14,
    color: LEGO_COLORS.darkGrey,
    fontWeight: '500',
  },
  paymentDetails: {
    backgroundColor: LEGO_COLORS.lightGrey,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1.5,
    borderColor: LEGO_COLORS.darkGrey,
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
    color: LEGO_COLORS.darkGrey,
  },
  totalRow: {
    borderTopWidth: 2,
    borderTopColor: LEGO_COLORS.darkGrey,
    marginTop: 5,
    paddingTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: LEGO_COLORS.darkGrey,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: LEGO_COLORS.red,
  },
  legoFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 20,
  },
});