import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  Platform,
  Alert,
  Image,
  ActivityIndicator
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import UserHeader from '@/components/UserHeader';
import { useNavigation } from '@react-navigation/native';
import { API_BASE_URL } from '@/env';
import AsyncStorage from '@react-native-async-storage/async-storage';

type PaymentMethod = 'gcash' | 'cod' | 'credit_card';

// Define cart item interface
interface CartItem {
  id: number;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  imageURL: string | null;
  selected?: boolean; // Added selected property for checkout
}

// Type for the API response
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// Order details interface
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
  paymentMethod: PaymentMethod;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered';
}

export default function CheckoutScreen() {
  const navigation = useNavigation();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    address: '',
    city: '',
    postalCode: '',
    phone: ''
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);
  
  // Constants for order calculations
  const SHIPPING_FEE = 150;
  const TAX_RATE = 0.12; // 12% tax
  
  // Hide the default header
  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
    
    // Fetch cart items when component mounts
    fetchCartItems();
    // Fetch user profile when component mounts
    fetchUserProfile();
  }, [navigation]);

  // Fetch user profile to get email
  const fetchUserProfile = async () => {
    try {
      // Try to get directly from AsyncStorage first (this should now be saved during login)
      const userEmail = await AsyncStorage.getItem('userEmail');
      
      if (userEmail) {
        console.log('Found email in AsyncStorage:', userEmail);
        setFormData(prev => ({
          ...prev,
          email: userEmail
        }));
        return;
      }
      
      // If no email in AsyncStorage, try to get from token
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        console.error('No token found for user profile');
        return;
      }
      
      // Try API calls as fallback only if needed
      try {
        const response = await fetch(`${API_BASE_URL}/users/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch from /users/me');
        }
        
        const data = await response.json();
        if (data.success && data.data && data.data.email) {
          const email = data.data.email;
          console.log('Email from API:', email);
          
          // Update form and save for future
          setFormData(prev => ({ ...prev, email }));
          await AsyncStorage.setItem('userEmail', email);
        }
      } catch (apiError) {
        console.error('Error fetching from API:', apiError);
      }
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
    }
  };

  const fetchCartItems = async () => {
    try {
      setLoading(true);
      
      // Get token from AsyncStorage
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        setError('You need to login to checkout');
        setLoading(false);
        return;
      }
      
      // Get the selection state
      const selectionJson = await AsyncStorage.getItem('selectedCartItems');
      let selectionMap: Record<number, boolean> = {};
      
      if (selectionJson) {
        const selections = JSON.parse(selectionJson);
        selectionMap = selections.reduce((map: Record<number, boolean>, item: {id: number, selected: boolean}) => {
          map[item.id] = item.selected;
          return map;
        }, {});
      }
      
      const response = await fetch(`${API_BASE_URL}/cart`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch cart items');
      }
      
      const data = await response.json() as ApiResponse<CartItem[]>;
      
      if (data.success) {
        console.log('Cart items received for checkout:', JSON.stringify(data.data));
        
        // Process cart items and filter only selected items
        const processedItems = data.data
          .filter(item => selectionMap[item.id]) // Only include selected items using the selection map
          .map(item => {
            // Ensure quantity is a number
            const numQuantity = Number(item.quantity);
            item.quantity = isNaN(numQuantity) ? 1 : numQuantity;
            item.selected = true; // Mark as selected for checkout
            return item;
          });
        
        if (processedItems.length === 0) {
          setError('No items selected for checkout. Please select items in your cart.');
          setLoading(false);
          return;
        }
        
        setCartItems(processedItems);
        setError(null);
      } else {
        setError(data.message || 'Failed to fetch cart items');
      }
    } catch (error) {
      console.error('Error fetching cart for checkout:', error);
      setError('Error loading cart. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData({
      ...formData,
      [field]: value
    });
  };

  const clearCart = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        console.error('No token available to clear cart');
        return false;
      }
      
      const response = await fetch(`${API_BASE_URL}/cart/clear`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        console.error('Failed to clear cart:', response.status);
        return false;
      }
      
      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Error clearing cart:', error);
      return false;
    }
  };
  
  const saveOrderToStorage = async (order: OrderDetails) => {
    try {
      // Get token from AsyncStorage
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        console.error('No token available to save order');
        return false;
      }
      
      // Send the order to the backend API
      const response = await fetch(`${API_BASE_URL}/orders/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(order)
      });
      
      if (!response.ok) {
        console.error('Failed to create order:', response.status);
        return false;
      }
      
      const data = await response.json();
      
      if (!data.success) {
        console.error('API returned success: false for order creation');
        return false;
      }
      
      // Also save locally for immediate access
      const ordersJson = await AsyncStorage.getItem('userOrders');
      let orders: OrderDetails[] = [];
      
      if (ordersJson) {
        orders = JSON.parse(ordersJson);
      }
      
      // Add new order to local storage
      orders.push(order);
      await AsyncStorage.setItem('userOrders', JSON.stringify(orders));
      
      return true;
    } catch (error) {
      console.error('Error saving order:', error);
      return false;
    }
  };

  const handleSubmit = async () => {
    // Check if cart is empty
    if (cartItems.length === 0) {
      Alert.alert('Empty Cart', 'Your cart is empty. Please add items before checking out.');
      return;
    }
    
    // Check if all required fields are filled
    const requiredFields = ['name', 'email', 'address', 'city', 'postalCode', 'phone'];
    const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData]);
    
    if (missingFields.length > 0) {
      Alert.alert('Missing Information', 'Please fill in all required fields.');
      return;
    }
    
    setIsProcessingOrder(true);
    
    try {
      // Create order details
      const orderId = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      // Ensure orderDate is properly formatted ISO string
      const now = new Date();
      const orderDate = now.toISOString();
      console.log('Created orderDate:', orderDate);
      
      const order: OrderDetails = {
        orderId,
        orderDate,
        items: [...cartItems],
        shippingDetails: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          postalCode: formData.postalCode
        },
        paymentMethod,
        subtotal: calculateSubtotal(),
        shipping: SHIPPING_FEE,
        tax: calculateTax(),
        total: calculateTotal(),
        status: 'pending'
      };
      
      console.log('Order being sent:', JSON.stringify({
        orderId: order.orderId,
        orderDate: order.orderDate
      }));
      
      // Save order to API and storage
      const saveResult = await saveOrderToStorage(order);
      
      if (!saveResult) {
        throw new Error('Failed to save order information');
      }
      
      // The backend API will clear the cart items that are in the order
      // But we'll also clear the selected items state from AsyncStorage
      await AsyncStorage.removeItem('selectedCartItems');
      
      // Navigate to order confirmation page with orderId
      // @ts-ignore - Navigation typing issue
      navigation.navigate('order-confirmation', { orderId });
    } catch (error) {
      console.error('Error processing order:', error);
      Alert.alert(
        'Order Error',
        'There was a problem processing your order. Please try again.'
      );
    } finally {
      setIsProcessingOrder(false);
    }
  };
  
  // Calculate subtotal
  const calculateSubtotal = () => {
    return cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };
  
  // Calculate tax
  const calculateTax = () => {
    return calculateSubtotal() * TAX_RATE;
  };
  
  // Calculate total
  const calculateTotal = () => {
    return calculateSubtotal() + SHIPPING_FEE + calculateTax();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <UserHeader section="Checkout" />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Personal Information Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.studRow}>
            {[...Array(4)].map((_, i) => (
              <View key={i} style={styles.stud}>
                <View style={styles.studInner} />
              </View>
            ))}
          </View>
          
          <View style={styles.sectionContent}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            
            <Text style={styles.inputLabel}>Full Name *</Text>
            <TextInput 
              style={styles.textInput}
              placeholder="Enter your full name"
              value={formData.name}
              onChangeText={(text) => handleInputChange('name', text)}
            />
            
            <Text style={styles.inputLabel}>Email Address *</Text>
            <TextInput 
              style={[styles.textInput, styles.disabledInput]}
              value={formData.email}
              editable={false}
              placeholder="Loading your email..."
            />
            
            <Text style={styles.inputLabel}>Phone Number *</Text>
            <TextInput 
              style={styles.textInput}
              placeholder="Enter your phone number"
              keyboardType="phone-pad"
              value={formData.phone}
              onChangeText={(text) => handleInputChange('phone', text)}
            />
          </View>
        </View>
        
        {/* Shipping Address Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.studRow}>
            {[...Array(4)].map((_, i) => (
              <View key={i} style={styles.stud}>
                <View style={styles.studInner} />
              </View>
            ))}
          </View>
          
          <View style={styles.sectionContent}>
            <Text style={styles.sectionTitle}>Shipping Address</Text>
            
            <Text style={styles.inputLabel}>Address *</Text>
            <TextInput 
              style={styles.textInput}
              placeholder="Enter your street address"
              value={formData.address}
              onChangeText={(text) => handleInputChange('address', text)}
            />
            
            <Text style={styles.inputLabel}>City *</Text>
            <TextInput 
              style={styles.textInput}
              placeholder="Enter your city"
              value={formData.city}
              onChangeText={(text) => handleInputChange('city', text)}
            />
            
            <Text style={styles.inputLabel}>Postal Code *</Text>
            <TextInput 
              style={styles.textInput}
              placeholder="Enter your postal code"
              keyboardType="numeric"
              value={formData.postalCode}
              onChangeText={(text) => handleInputChange('postalCode', text)}
            />
          </View>
        </View>
        
        {/* Order Summary Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.studRow}>
            {[...Array(4)].map((_, i) => (
              <View key={i} style={styles.stud}>
                <View style={styles.studInner} />
              </View>
            ))}
          </View>
          
          <View style={styles.sectionContent}>
            <Text style={styles.sectionTitle}>Order Summary</Text>
            
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#E3000B" />
                <Text style={styles.loadingText}>Loading your cart...</Text>
              </View>
            ) : error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : cartItems.length === 0 ? (
              <Text style={styles.emptyCartText}>Your cart is empty</Text>
            ) : (
              <>
                {/* Product details */}
                <View style={styles.productsList}>
                  {cartItems.map((item) => (
                    <View key={item.id} style={styles.productItem}>
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
                  <Text style={styles.summaryValue}>₱{calculateSubtotal().toFixed(2)}</Text>
                </View>
                
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Shipping:</Text>
                  <Text style={styles.summaryValue}>₱{SHIPPING_FEE.toFixed(2)}</Text>
                </View>
                
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Tax (12%):</Text>
                  <Text style={styles.summaryValue}>₱{calculateTax().toFixed(2)}</Text>
                </View>
                
                <View style={[styles.summaryRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Total:</Text>
                  <Text style={styles.totalValue}>₱{calculateTotal().toFixed(2)}</Text>
                </View>
              </>
            )}
          </View>
        </View>
        
        {/* Payment Method Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.studRow}>
            {[...Array(4)].map((_, i) => (
              <View key={i} style={styles.stud}>
                <View style={styles.studInner} />
              </View>
            ))}
          </View>
          
          <View style={styles.sectionContent}>
            <Text style={styles.sectionTitle}>Payment Method</Text>
            
            {/* GCash Option */}
            <TouchableOpacity 
              style={[
                styles.paymentOption, 
                paymentMethod === 'gcash' && styles.paymentOptionSelected
              ]}
              onPress={() => setPaymentMethod('gcash')}
            >
              <MaterialCommunityIcons 
                name="cellphone" 
                size={24} 
                color={paymentMethod === 'gcash' ? "#0064C2" : "#666666"} 
              />
              <Text style={[
                styles.paymentText, 
                paymentMethod === 'gcash' && styles.paymentTextSelected
              ]}>GCash</Text>
              {paymentMethod === 'gcash' && (
                <MaterialCommunityIcons name="check-circle" size={24} color="#0064C2" />
              )}
            </TouchableOpacity>
            
            {/* COD Option */}
            <TouchableOpacity 
              style={[
                styles.paymentOption, 
                paymentMethod === 'cod' && styles.paymentOptionSelected
              ]}
              onPress={() => setPaymentMethod('cod')}
            >
              <MaterialCommunityIcons 
                name="cash" 
                size={24} 
                color={paymentMethod === 'cod' ? "#0064C2" : "#666666"} 
              />
              <Text style={[
                styles.paymentText, 
                paymentMethod === 'cod' && styles.paymentTextSelected
              ]}>Cash on Delivery</Text>
              {paymentMethod === 'cod' && (
                <MaterialCommunityIcons name="check-circle" size={24} color="#0064C2" />
              )}
            </TouchableOpacity>
            
            {/* Credit Card Option */}
            <TouchableOpacity 
              style={[
                styles.paymentOption, 
                paymentMethod === 'credit_card' && styles.paymentOptionSelected
              ]}
              onPress={() => setPaymentMethod('credit_card')}
            >
              <MaterialCommunityIcons 
                name="credit-card" 
                size={24} 
                color={paymentMethod === 'credit_card' ? "#0064C2" : "#666666"} 
              />
              <Text style={[
                styles.paymentText, 
                paymentMethod === 'credit_card' && styles.paymentTextSelected
              ]}>Credit Card</Text>
              {paymentMethod === 'credit_card' && (
                <MaterialCommunityIcons name="check-circle" size={24} color="#0064C2" />
              )}
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            disabled={isProcessingOrder}
          >
            <Text style={styles.backButtonText}>BACK</Text>
            <View style={styles.backButtonBottom} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.placeOrderButton, isProcessingOrder && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={isProcessingOrder}
          >
            {isProcessingOrder ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.placeOrderText}>PLACE ORDER</Text>
            )}
            <View style={styles.placeOrderBottom} />
          </TouchableOpacity>
        </View>
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
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    color: '#333333',
  },
  textInput: {
    backgroundColor: '#F9F9F9',
    borderWidth: 2,
    borderColor: '#DDDDDD',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 2,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#F9F9F9',
  },
  paymentOptionSelected: {
    borderColor: '#0064C2',
    backgroundColor: '#E6F0FF',
  },
  paymentText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
    flex: 1,
    color: '#333333',
  },
  paymentTextSelected: {
    color: '#0064C2',
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    marginBottom: 40,
    marginTop: 8,
  },
  backButton: {
    backgroundColor: '#666666',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 60,
    flex: 1,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#000000',
    marginRight: 8,
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
    backgroundColor: '#444444',
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  placeOrderButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 60,
    flex: 1.5,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#000000',
    marginLeft: 8,
  },
  placeOrderText: {
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
  placeOrderBottom: {
    width: '94%',
    height: 6,
    backgroundColor: '#3D8B40',
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
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
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    color: '#666666',
    fontSize: 14,
  },
  errorText: {
    color: '#E3000B',
    fontSize: 14,
    padding: 10,
    textAlign: 'center',
  },
  emptyCartText: {
    color: '#666666',
    fontSize: 14,
    padding: 20,
    textAlign: 'center',
  },
  disabledButton: {
    backgroundColor: '#999999',
  },
  disabledInput: {
    backgroundColor: '#EFEFEF',
    color: '#555555',
  },
});
