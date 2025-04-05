import React, { useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  ScrollView, 
  Platform,
  Image,
  ActivityIndicator
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import UserHeader from '@/components/UserHeader';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useAppSelector, useAppDispatch } from '@/redux/hooks';
import { fetchOrderById } from '@/redux/slices/orderSlices';

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
  const dispatch = useAppDispatch();
  
  // Get order from Redux store
  const { selectedOrder, loading, error } = useAppSelector(state => state.orders);
  
  // Hide the default header
  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, []);
  
  // Load order details when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      const orderId = params?.orderId;
      
      if (orderId) {
        console.log('Order confirmation screen: Loading order with ID:', orderId);
        
        // Reset any previous order data before fetching new data
        dispatch({ type: 'orders/resetOrderState' });
        
        // Fetch the specific order by ID to ensure we have the latest data
        dispatch(fetchOrderById(orderId));
      } else {
        console.warn('No orderId provided to order confirmation screen');
      }
      
      // Return a cleanup function if needed
      return () => {
        // Cleanup if necessary
      };
    }, [params?.orderId, dispatch])
  );
  
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    
    // If the string is already in YYYY-MM-DD format, return it directly
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    
    try {
      // For ISO strings, extract the date part
      if (dateString.includes('T')) {
        const datePart = dateString.split('T')[0];
        return datePart; // Returns yyyy-mm-dd directly
      }
      
      // Otherwise, parse and format
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
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
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#E3000B" />
            <Text style={styles.loadingText}>Loading order details...</Text>
          </View>
        ) : error ? (
          <View style={styles.noOrderContainer}>
            <MaterialCommunityIcons name="alert-circle-outline" size={80} color="#E3000B" />
            <Text style={styles.noOrderText}>Error: {error}</Text>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.push('/user/home')}
            >
              <Text style={styles.backButtonText}>RETURN HOME</Text>
              <View style={styles.backButtonBottom} />
            </TouchableOpacity>
          </View>
        ) : selectedOrder ? (
          <>
            <View style={styles.confirmationHeader}>
              <View style={styles.checkCircle}>
                <MaterialCommunityIcons name="check" size={40} color="#FFFFFF" />
              </View>
              <Text style={styles.confirmationTitle}>Order Confirmed!</Text>
              <Text style={styles.confirmationText}>
                Thank you for your order. Your order has been placed successfully.
              </Text>
              <Text style={styles.orderIdText}>Order ID: {selectedOrder.orderId}</Text>
              <Text style={styles.orderDateText}>
                Placed on: {formatDate(selectedOrder.createdAt) || 'Processing date'}
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
                  {selectedOrder.items.map((item, index) => (
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
                  <Text style={styles.summaryValue}>₱{selectedOrder.subtotal.toFixed(2)}</Text>
                </View>
                
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Shipping:</Text>
                  <Text style={styles.summaryValue}>₱{selectedOrder.shipping.toFixed(2)}</Text>
                </View>
                
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Tax (12%):</Text>
                  <Text style={styles.summaryValue}>₱{selectedOrder.tax.toFixed(2)}</Text>
                </View>
                
                <View style={[styles.summaryRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Total:</Text>
                  <Text style={styles.totalValue}>₱{selectedOrder.total.toFixed(2)}</Text>
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
                  <Text style={styles.infoValue}>{selectedOrder.shippingDetails.name}</Text>
                </View>
                
                <View style={styles.infoSection}>
                  <Text style={styles.infoLabel}>Email:</Text>
                  <Text style={styles.infoValue}>{selectedOrder.shippingDetails.email}</Text>
                </View>
                
                <View style={styles.infoSection}>
                  <Text style={styles.infoLabel}>Phone:</Text>
                  <Text style={styles.infoValue}>{selectedOrder.shippingDetails.phone}</Text>
                </View>
                
                <View style={styles.infoSection}>
                  <Text style={styles.infoLabel}>Address:</Text>
                  <Text style={styles.infoValue}>
                    {selectedOrder.shippingDetails.address}, {selectedOrder.shippingDetails.city}, {selectedOrder.shippingDetails.postalCode}
                  </Text>
                </View>
                
                <View style={styles.infoSection}>
                  <Text style={styles.infoLabel}>Payment Method:</Text>
                  <Text style={styles.infoValue}>{getPaymentMethodText(selectedOrder.paymentMethod)}</Text>
                </View>
                
                <View style={styles.infoSection}>
                  <Text style={styles.infoLabel}>Status:</Text>
                  <Text style={[styles.infoValue, { 
                    color: 
                      selectedOrder.status === 'delivered' ? '#4CAF50' : 
                      selectedOrder.status === 'processing' ? '#2196F3' :  
                      selectedOrder.status === 'shipped' ? '#FF9800' :
                      selectedOrder.status === 'cancelled' ? '#F44336' : '#9E9E9E'
                  }]}>
                    {selectedOrder.status.charAt(0).toUpperCase() + selectedOrder.status.slice(1)}
                  </Text>
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
  // ...existing code...
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 100,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },

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