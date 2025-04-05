import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  FlatList, 
  TouchableOpacity, 
  Platform,
  ActivityIndicator,
  Image
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import UserHeader from '@/components/UserHeader';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@/env';

// Order details interface
interface OrderDetails {
  orderId: string;
  createdAt: string;
  items: {
    id: number;
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

export default function OrdersScreen() {
  const navigation = useNavigation();
  const [orders, setOrders] = useState<OrderDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  
  // Hide the default header
  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);
  
  // Load orders when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [])
  );
  
  const loadOrders = async () => {
    try {
      setLoading(true);
      
      // Get token from AsyncStorage
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        console.error('No token found for fetching orders');
        setLoading(false);
        return;
      }
      
      try {
        // First try to get orders from the API
        const response = await fetch(`${API_BASE_URL}/orders`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.success && Array.isArray(data.data)) {
            // Sort orders by date (newest first)
            data.data.sort((a: OrderDetails, b: OrderDetails) => {
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });
            
            setOrders(data.data);
            setLoading(false);
            return;
          }
        }
      } catch (apiError) {
        console.error('Error fetching orders from API:', apiError);
        // Continue to try local storage as fallback
      }
      
      // Fallback to AsyncStorage if API fails
      const ordersJson = await AsyncStorage.getItem('userOrders');
      
      if (ordersJson) {
        const loadedOrders = JSON.parse(ordersJson) as OrderDetails[];
        // Sort orders by date (newest first)
        loadedOrders.sort((a, b) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        setOrders(loadedOrders);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleOrderExpansion = (orderId: string) => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
    } else {
      setExpandedOrderId(orderId);
    }
  };
  
  const formatDate = (dateString: string) => {
    if (!dateString) {
      return 'No date';
    }
    
    // If the string is already in YYYY-MM-DD format, return it directly
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    
    try {
      // For ISO strings, extract the date part directly
      if (dateString.includes('T')) {
        const datePart = dateString.split('T')[0];
        return datePart; // Returns yyyy-mm-dd directly
      }
      
      // Otherwise, parse and format
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        // Just return the original string if parsing failed
        return dateString;
      }
      
      // Format as yyyy-mm-dd
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString || 'Date error';
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#FFA500'; // Orange
      case 'processing':
        return '#3498DB'; // Blue
      case 'shipped':
        return '#9B59B6'; // Purple
      case 'delivered':
        return '#2ECC71'; // Green
      case 'cancelled':
        return '#7F8C8D'; // Gray
      default:
        return '#7F8C8D'; // Gray
    }
  };
  
  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'gcash':
        return 'cellphone';
      case 'cod':
        return 'cash';
      case 'credit_card':
        return 'credit-card';
      default:
        return 'cash';
    }
  };
  
  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'gcash':
        return 'GCash';
      case 'cod':
        return 'Cash on Delivery';
      case 'credit_card':
        return 'Credit Card';
      default:
        return 'Unknown';
    }
  };

  const renderOrderItem = ({ item }: { item: OrderDetails }) => {
    const isExpanded = expandedOrderId === item.orderId;
    
    return (
      <View style={styles.orderContainer}>
        <View style={styles.studRow}>
          {[...Array(3)].map((_, i) => (
            <View key={`stud-order-${item.orderId}-${i}`} style={styles.stud}>
              <View style={styles.studInner} />
            </View>
          ))}
        </View>
        
        <TouchableOpacity 
          style={styles.orderHeader} 
          onPress={() => toggleOrderExpansion(item.orderId)}
        >
          <View style={styles.orderHeaderLeft}>
            <Text style={styles.orderIdText}>{item.orderId}</Text>
            <Text style={styles.orderDateText}>
              Order Placed: {item.createdAt ? formatDate(item.createdAt) : 'No date available'}
            </Text>
            {item.status === 'delivered' && item.deliveredAt && (
              <Text style={styles.orderDateText}>
                Delivered: {formatDate(item.deliveredAt)}
              </Text>
            )}
            {item.status === 'cancelled' && item.cancelledAt && (
              <Text style={styles.orderDateText}>
                Cancelled: {formatDate(item.cancelledAt)}
              </Text>
            )}
          </View>
          
          <View style={styles.orderHeaderRight}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
            </View>
            <Text style={styles.orderTotal}>₱{item.total.toFixed(2)}</Text>
            <MaterialCommunityIcons 
              name={isExpanded ? "chevron-up" : "chevron-down"} 
              size={24} 
              color="#333333"
            />
          </View>
        </TouchableOpacity>
        
        {isExpanded && (
          <View style={styles.orderDetails}>
            <Text style={styles.sectionTitle}>Items</Text>
            {item.items.map((product, index) => (
              <View key={product.id || `product-${item.orderId}-${index}`} style={styles.productItem}>
                <Image
                  source={{ uri: product.imageURL || 'https://via.placeholder.com/60' }}
                  style={styles.productImage}
                />
                <View style={styles.productDetails}>
                  <Text style={styles.productName}>{product.productName}</Text>
                  <Text style={styles.productQuantity}>Quantity: {product.quantity}</Text>
                  <Text style={styles.productPrice}>₱{(product.price * product.quantity).toFixed(2)}</Text>
                </View>
              </View>
            ))}
            
            <View style={styles.divider} />
            
            <Text style={styles.sectionTitle}>Shipping Information</Text>
            <View style={styles.infoSection}>
              <Text style={styles.infoLabel}>Name:</Text>
              <Text style={styles.infoValue}>{item.shippingDetails.name}</Text>
            </View>
            <View style={styles.infoSection}>
              <Text style={styles.infoLabel}>Address:</Text>
              <Text style={styles.infoValue}>
                {item.shippingDetails.address}, {item.shippingDetails.city}, {item.shippingDetails.postalCode}
              </Text>
            </View>
            <View style={styles.infoSection}>
              <Text style={styles.infoLabel}>Phone:</Text>
              <Text style={styles.infoValue}>{item.shippingDetails.phone}</Text>
            </View>
            <View style={styles.infoSection}>
              <Text style={styles.infoLabel}>Email:</Text>
              <Text style={styles.infoValue}>{item.shippingDetails.email}</Text>
            </View>
            
            <View style={styles.divider} />
            
            <Text style={styles.sectionTitle}>Payment Information</Text>
            <View style={styles.paymentMethod}>
              <MaterialCommunityIcons 
                name={getPaymentMethodIcon(item.paymentMethod)} 
                size={24} 
                color="#333333" 
              />
              <Text style={styles.paymentMethodText}>
                {getPaymentMethodText(item.paymentMethod)}
              </Text>
            </View>
            
            <View style={styles.divider} />
            
            <Text style={styles.sectionTitle}>Order Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal:</Text>
              <Text style={styles.summaryValue}>₱{item.subtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Shipping:</Text>
              <Text style={styles.summaryValue}>₱{item.shipping.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tax:</Text>
              <Text style={styles.summaryValue}>₱{item.tax.toFixed(2)}</Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalValue}>₱{item.total.toFixed(2)}</Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <UserHeader section="My Orders" />
      
      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#E3000B" />
            <Text style={styles.loadingText}>Loading your orders...</Text>
          </View>
        ) : orders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="package-variant" size={80} color="#CCCCCC" />
            <Text style={styles.emptyText}>You don't have any orders yet</Text>
            <TouchableOpacity 
              style={styles.shopButton}
              onPress={() => navigation.navigate('index' as never)}
            >
              <Text style={styles.shopButtonText}>START SHOPPING</Text>
              <View style={styles.shopButtonBottom} />
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={orders}
            renderItem={renderOrderItem}
            keyExtractor={item => item.orderId}
            contentContainerStyle={styles.ordersList}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F2',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    color: '#666666',
    marginTop: 16,
    marginBottom: 32,
    textAlign: 'center',
  },
  shopButton: {
    backgroundColor: '#E3000B',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#000000',
    position: 'relative',
    width: '100%',
    alignItems: 'center',
  },
  shopButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: Platform.select({
      ios: 'Futura-Bold',
      android: 'sans-serif-condensed',
      default: 'System'
    }),
  },
  shopButtonBottom: {
    width: '94%',
    height: 6,
    backgroundColor: '#B3000B',
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  ordersList: {
    paddingBottom: 20,
  },
  orderContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#000000',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  studRow: {
    flexDirection: 'row',
    padding: 4,
    backgroundColor: '#FFE500',
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
  },
  stud: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFD500',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 2,
    borderWidth: 1,
    borderColor: '#000000',
  },
  studInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFBD00',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    alignItems: 'center',
  },
  orderHeaderLeft: {
    flex: 1,
  },
  orderHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderIdText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#0C0A00',
  },
  orderDateText: {
    fontSize: 14,
    color: '#666666',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E3000B',
    marginRight: 8,
  },
  orderDetails: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#0C0A00',
  },
  productItem: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 4,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#DDDDDD',
  },
  productDetails: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#0C0A00',
  },
  productQuantity: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    color: '#E3000B',
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#EEEEEE',
    marginVertical: 16,
  },
  infoSection: {
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333333',
  },
  infoValue: {
    fontSize: 14,
    color: '#666666',
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentMethodText: {
    fontSize: 14,
    color: '#333333',
    marginLeft: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#333333',
  },
  summaryValue: {
    fontSize: 14,
    color: '#333333',
  },
  totalRow: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    paddingTop: 16,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0C0A00',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E3000B',
  },
});