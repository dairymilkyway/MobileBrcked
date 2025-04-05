import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Platform
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { API_BASE_URL } from '@/env';
import AsyncStorage from '@react-native-async-storage/async-storage';

// LEGO brand colors
const LEGO_COLORS = {
  yellow: '#FFD500',
  red: '#E3000B',
  blue: '#006DB7',
  green: '#00AF4D',
  black: '#000000',
  darkGrey: '#333333',
  lightGrey: '#F2F2F2',
  white: '#FFFFFF',
};

// LEGO-inspired shadow
const LEGO_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.25,
  shadowRadius: 3.84,
  elevation: 5,
};

// Order details interface
interface OrderDetails {
  orderId: string;
  createdAt: string;
  items: {
    productId: string;
    productName: string;
    price: number;
    quantity: number;
    imageURL: string | null;
  }[];
  shippingDetails: {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    postalCode: string;
  };
  paymentMethod: 'gcash' | 'cod' | 'credit_card';
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  deliveredAt?: string;
  cancelledAt?: string;
}

interface OrderDetailsModalProps {
  orderId: string | null;
  visible: boolean;
  onClose: () => void;
}

// Helper component for LEGO stud
const Stud = ({ color = LEGO_COLORS.yellow }: { color?: string }) => (
  <View style={[styles.stud, { backgroundColor: color }]}>
    <View style={styles.studInner} />
  </View>
);

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({ 
  orderId, 
  visible, 
  onClose 
}) => {
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state function
  const resetState = () => {
    setOrder(null);
    setLoading(false);
    setError(null);
  };

  useEffect(() => {
    if (visible && orderId) {
      fetchOrderDetails(orderId);
    } else if (!visible) {
      // Reset state when modal is closed
      resetState();
    }
  }, [visible, orderId]);

  const fetchOrderDetails = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching order details for ID:', id);

      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        setError('Authentication required');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/orders/${id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      console.log('Order details response:', data);

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch order details');
      }

      const orderData = data.data || data;
      setOrder(orderData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching order details:', err);
    } finally {
      setLoading(false);
    }
  };

  // Format date string
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get status color
  const getStatusColor = (status: string): string => {
    switch(status) {
      case 'delivered': return LEGO_COLORS.green;
      case 'shipped': return LEGO_COLORS.yellow;
      case 'processing': return LEGO_COLORS.blue;
      case 'cancelled': return LEGO_COLORS.red;
      default: return '#9E9E9E'; // Gray for pending
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.studsContainer}>
            {[...Array(8)].map((_, i) => (
              <Stud key={`stud-${i}`} color={i % 2 === 0 ? LEGO_COLORS.red : LEGO_COLORS.blue} />
            ))}
          </View>
          
          <View style={styles.modalHeader}>
            <MaterialCommunityIcons name="toy-brick-outline" size={24} color={LEGO_COLORS.red} />
            <Text style={styles.modalTitle}>Order Details</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={onClose}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={LEGO_COLORS.blue} />
              <Text style={styles.loadingText}>Loading order details...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <MaterialCommunityIcons name="alert-circle-outline" size={64} color={LEGO_COLORS.red} />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => orderId && fetchOrderDetails(orderId)}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : order ? (
            <FlatList
              data={[1]} // Just need one item to render the content
              keyExtractor={() => 'order-content'}
              renderItem={() => (
                <>
                  <View style={styles.orderHeader}>
                    <Text style={styles.orderId}>Order #{order.orderId}</Text>
                    <View style={[styles.statusChip, { backgroundColor: getStatusColor(order.status) }]}>
                      <Text style={[styles.statusText, 
                        order.status === 'shipped' ? {color: LEGO_COLORS.black} : {color: LEGO_COLORS.white}
                      ]}>
                        {order.status.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.orderDate}>
                      Placed on {formatDate(order.createdAt)}
                    </Text>
                    {order.status === 'delivered' && order.deliveredAt && (
                      <Text style={styles.orderDate}>
                        Delivered on {formatDate(order.deliveredAt)}
                      </Text>
                    )}
                    {order.status === 'cancelled' && order.cancelledAt && (
                      <Text style={styles.orderDate}>
                        Cancelled on {formatDate(order.cancelledAt)}
                      </Text>
                    )}
                  </View>
                  
                  <View style={styles.section}>
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
                  
                  <View style={styles.section}>
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
                  
                  <View style={styles.section}>
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
          ) : (
            <View style={styles.errorContainer}>
              <MaterialCommunityIcons name="information-outline" size={64} color={LEGO_COLORS.yellow} />
              <Text style={styles.emptyText}>No order information available</Text>
            </View>
          )}
          
          <View style={styles.bottomStudsContainer}>
            {[...Array(8)].map((_, i) => (
              <Stud key={`stud-bottom-${i}`} color={i % 2 === 0 ? LEGO_COLORS.red : LEGO_COLORS.blue} />
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContent: {
    width: '90%',
    height: '85%',
    backgroundColor: LEGO_COLORS.white,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: LEGO_COLORS.darkGrey,
    overflow: 'hidden',
    ...LEGO_SHADOW,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 2,
    borderBottomColor: LEGO_COLORS.lightGrey,
  },
  modalTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: LEGO_COLORS.darkGrey,
    marginLeft: 8,
    ...Platform.select({
      ios: {
        fontFamily: 'System',
      },
      android: {
        fontFamily: 'sans-serif-medium',
      }
    })
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: LEGO_COLORS.lightGrey,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: LEGO_COLORS.darkGrey,
  },
  closeButtonText: {
    fontSize: 16,
    color: LEGO_COLORS.darkGrey,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: LEGO_COLORS.darkGrey,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: LEGO_COLORS.red,
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: LEGO_COLORS.darkGrey,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: LEGO_COLORS.blue,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: LEGO_COLORS.darkGrey,
  },
  retryButtonText: {
    color: LEGO_COLORS.white,
    fontWeight: 'bold',
  },
  studsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: LEGO_COLORS.yellow,
    paddingVertical: 5,
  },
  bottomStudsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: LEGO_COLORS.yellow,
    paddingVertical: 5,
  },
  stud: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
  },
  studInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  orderHeader: {
    padding: 16,
    borderBottomWidth: 2,
    borderBottomColor: LEGO_COLORS.lightGrey,
  },
  orderId: {
    fontSize: 18,
    fontWeight: 'bold',
    color: LEGO_COLORS.darkGrey,
    marginBottom: 8,
    ...Platform.select({
      ios: {
        fontFamily: 'System',
      },
      android: {
        fontFamily: 'sans-serif-medium',
      }
    })
  },
  orderDate: {
    fontSize: 14,
    color: LEGO_COLORS.darkGrey,
    marginTop: 4,
  },
  statusChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: LEGO_COLORS.darkGrey,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  section: {
    padding: 16,
    borderBottomWidth: 2,
    borderBottomColor: LEGO_COLORS.lightGrey,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: LEGO_COLORS.darkGrey,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        fontFamily: 'System',
      },
      android: {
        fontFamily: 'sans-serif-medium',
      }
    })
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
  detailText: {
    marginLeft: 8,
    color: LEGO_COLORS.darkGrey,
    fontSize: 14,
  },
  orderItemCard: {
    flexDirection: 'row',
    backgroundColor: LEGO_COLORS.lightGrey,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: LEGO_COLORS.darkGrey,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: LEGO_COLORS.darkGrey,
  },
  noImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 6,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: LEGO_COLORS.darkGrey,
  },
  itemDetails: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: LEGO_COLORS.darkGrey,
    marginBottom: 6,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  itemLabel: {
    fontSize: 14,
    color: '#666',
  },
  itemValue: {
    fontSize: 14,
    fontWeight: '500',
    color: LEGO_COLORS.darkGrey,
  },
  paymentMethodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LEGO_COLORS.blue,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: LEGO_COLORS.darkGrey,
  },
  paymentMethodText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: LEGO_COLORS.white,
    marginLeft: 8,
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
    marginBottom: 8,
  },
  paymentLabel: {
    fontSize: 14,
    color: '#666',
  },
  paymentValue: {
    fontSize: 14,
    fontWeight: '500',
    color: LEGO_COLORS.darkGrey,
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: LEGO_COLORS.darkGrey,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: LEGO_COLORS.darkGrey,
  },
});

export default OrderDetailsModal; 