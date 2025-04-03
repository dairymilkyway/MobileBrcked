import React, { useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  ScrollView, 
  Platform,
  Image
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import UserHeader from '@/components/UserHeader';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@/env';

// Define interfaces
interface CartItem {
  id: number;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  imageURL: string | null;
}

interface OrderDetails {
  orderId: string;
  orderDate: string;
  items: CartItem[];
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
  status: 'pending' | 'processing' | 'shipped' | 'delivered';
}

// Define route params interface
interface RouteParams {
  orderId?: string;
  [key: string]: any;
}

export default function OrderConfirmationScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const route = useRoute();
  const params = route.params as RouteParams;
  const [order, setOrder] = React.useState<OrderDetails | null>(null);
  
  // Hide the default header
  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
    
    // Load order details when component mounts
    loadOrderDetails();
  }, []);

  const loadOrderDetails = async () => {
    try {
      const orderId = params?.orderId;
      
      if (!orderId) {
        console.error('No order ID provided');
        return;
      }
      
      // First try to get from API
      const token = await AsyncStorage.getItem('token');
      
      if (token) {
        try {
          const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            
            if (data.success && data.data) {
              setOrder(data.data);
              return;
            }
          }
        } catch (apiError) {
          console.error('Error fetching order from API:', apiError);
        }
      }
      
      // Fallback to AsyncStorage
      const ordersJson = await AsyncStorage.getItem('userOrders');
      
      if (ordersJson) {
        const orders = JSON.parse(ordersJson) as OrderDetails[];
        const foundOrder = orders.find(o => o.orderId === orderId);
        
        if (foundOrder) {
          setOrder(foundOrder);
        }
      }
    } catch (error) {
      console.error('Error loading order details:', error);
    }
  };
  
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        // If invalid date, return the original string or parse it differently
        // Try to format as yyyy-mm-dd manually
        const parts = dateString.split('T')[0].split('-');
        if (parts.length === 3) {
          return `${parts[0]}-${parts[1]}-${parts[2]}`;
        }
        return dateString;
      }
      
      // Format as yyyy-mm-dd
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <UserHeader section="Order Confirmation" />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {order ? (
          <>
            <View style={styles.confirmationHeader}>
              <View style={styles.checkCircle}>
                <MaterialCommunityIcons name="check" size={40} color="#FFFFFF" />
              </View>
              <Text style={styles.confirmationTitle}>Order Confirmed!</Text>
              <Text style={styles.confirmationText}>
                Thank you for your order. Your order has been placed successfully.
              </Text>
              <Text style={styles.orderIdText}>Order ID: {order.orderId}</Text>
              <Text style={styles.orderDateText}>
                Placed on: {formatDate(order.orderDate) || 'Processing date'}
              </Text>
            </View>
            
            <View style={styles.sectionContainer}>
              <View style={styles.studRow}>
                {[...Array(4)].map((_, i) => (
                  <View key={`stud-summary-${i}`} style={styles.stud}>
                    <View style={styles.studInner} />
                  </View>
                ))}
              </View>
              
              <View style={styles.sectionContent}>
                <Text style={styles.sectionTitle}>Order Summary</Text>
                
                {/* Product details */}
                <View style={styles.productsList}>
                  {order.items.map((item, index) => (
                    <View key={item.id || `item-${index}`} style={styles.productItem}>
                      <Image
                        source={{ uri: item.imageURL || 'https://via.placeholder.com/60' }}
                        style={styles.productImage}
                      />
                      <View style={styles.productDetails}>
                        <Text style={styles.productName}>{item.productName}</Text>
                        <Text style={styles.productQuantity}>Quantity: {item.quantity}</Text>
                        <Text style={styles.productPrice}>₱{(item.price * item.quantity).toFixed(2)}</Text>
                      </View>
                    </View>
                  ))}
                </View>
                
                <View style={styles.divider} />
                
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Subtotal:</Text>
                  <Text style={styles.summaryValue}>₱{order.subtotal.toFixed(2)}</Text>
                </View>
                
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Shipping:</Text>
                  <Text style={styles.summaryValue}>₱{order.shipping.toFixed(2)}</Text>
                </View>
                
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Tax (12%):</Text>
                  <Text style={styles.summaryValue}>₱{order.tax.toFixed(2)}</Text>
                </View>
                
                <View style={[styles.summaryRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Total:</Text>
                  <Text style={styles.totalValue}>₱{order.total.toFixed(2)}</Text>
                </View>
              </View>
            </View>
            
            <View style={styles.sectionContainer}>
              <View style={styles.studRow}>
                {[...Array(4)].map((_, i) => (
                  <View key={`stud-shipping-${i}`} style={styles.stud}>
                    <View style={styles.studInner} />
                  </View>
                ))}
              </View>
              
              <View style={styles.sectionContent}>
                <Text style={styles.sectionTitle}>Shipping Information</Text>
                
                <View style={styles.infoSection}>
                  <Text style={styles.infoLabel}>Name:</Text>
                  <Text style={styles.infoValue}>{order.shippingDetails.name}</Text>
                </View>
                
                <View style={styles.infoSection}>
                  <Text style={styles.infoLabel}>Email:</Text>
                  <Text style={styles.infoValue}>{order.shippingDetails.email}</Text>
                </View>
                
                <View style={styles.infoSection}>
                  <Text style={styles.infoLabel}>Phone:</Text>
                  <Text style={styles.infoValue}>{order.shippingDetails.phone}</Text>
                </View>
                
                <View style={styles.infoSection}>
                  <Text style={styles.infoLabel}>Address:</Text>
                  <Text style={styles.infoValue}>
                    {order.shippingDetails.address}, {order.shippingDetails.city}, {order.shippingDetails.postalCode}
                  </Text>
                </View>
                
                <View style={styles.infoSection}>
                  <Text style={styles.infoLabel}>Payment Method:</Text>
                  <Text style={styles.infoValue}>{getPaymentMethodText(order.paymentMethod)}</Text>
                </View>
              </View>
            </View>
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={styles.orderHistoryButton}
                onPress={() => navigation.navigate('orders' as never)}
              >
                <Text style={styles.orderHistoryButtonText}>VIEW ORDER HISTORY</Text>
                <View style={styles.orderHistoryButtonBottom} />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.continueShoppingButton}
                onPress={() => router.push('/user/home')}
              >
                <Text style={styles.continueShoppingButtonText}>CONTINUE SHOPPING</Text>
                <View style={styles.continueShoppingButtonBottom} />
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.noOrderContainer}>
            <MaterialCommunityIcons name="package-variant" size={80} color="#CCCCCC" />
            <Text style={styles.noOrderText}>Order details not found</Text>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.push('/user/home')}
            >
              <Text style={styles.backButtonText}>RETURN HOME</Text>
              <View style={styles.backButtonBottom} />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
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
  confirmationHeader: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
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
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#000000',
  },
  confirmationTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0C0A00',
    marginBottom: 8,
    fontFamily: Platform.select({
      ios: 'Futura-Bold',
      android: 'sans-serif-condensed',
      default: 'System'
    }),
  },
  confirmationText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 16,
  },
  orderIdText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
  },
  orderDateText: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  sectionContainer: {
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#000000',
    marginBottom: 16,
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
  sectionContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#0C0A00',
    fontFamily: Platform.select({
      ios: 'Futura-Bold',
      android: 'sans-serif-condensed',
      default: 'System'
    }),
  },
  productsList: {
    marginBottom: 16,
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
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  summaryLabel: {
    fontSize: 16,
    color: '#333333',
  },
  summaryValue: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '500',
  },
  totalRow: {
    marginTop: 8,
    borderBottomWidth: 0,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#DDDDDD',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0C0A00',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0064C2',
  },
  infoSection: {
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#666666',
  },
  buttonContainer: {
    marginBottom: 40,
    marginTop: 8,
  },
  orderHistoryButton: {
    backgroundColor: '#666666',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 60,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#000000',
    marginBottom: 12,
  },
  orderHistoryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: Platform.select({
      ios: 'Futura-Bold',
      android: 'sans-serif-condensed',
      default: 'System'
    }),
    letterSpacing: 1,
  },
  orderHistoryButtonBottom: {
    width: '94%',
    height: 6,
    backgroundColor: '#444444',
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  continueShoppingButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 60,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#000000',
  },
  continueShoppingButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: Platform.select({
      ios: 'Futura-Bold',
      android: 'sans-serif-condensed',
      default: 'System'
    }),
    letterSpacing: 1,
  },
  continueShoppingButtonBottom: {
    width: '94%',
    height: 6,
    backgroundColor: '#3D8B40',
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  noOrderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 100,
  },
  noOrderText: {
    fontSize: 18,
    color: '#666666',
    marginTop: 16,
    marginBottom: 32,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#E3000B',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 60,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#000000',
    width: '100%',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: Platform.select({
      ios: 'Futura-Bold',
      android: 'sans-serif-condensed',
      default: 'System'
    }),
    letterSpacing: 1,
  },
  backButtonBottom: {
    width: '94%',
    height: 6,
    backgroundColor: '#B3000B',
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
}); 