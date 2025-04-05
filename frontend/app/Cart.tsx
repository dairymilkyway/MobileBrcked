import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, SafeAreaView, Platform, ActivityIndicator, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import UserHeader from '@/components/UserHeader';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { API_BASE_URL } from '@/env';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define cart item interface
interface CartItem {
  id: number;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  imageURL: string | null;
  stock?: number; // Optional stock property
  selected?: boolean; // Added selected property for checkout
}

// Type for the API response
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// Interface for stock information
interface StockInfo {
  [productId: string]: number;
}

export default function CartScreen() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stockInfo, setStockInfo] = useState<StockInfo>({});
  const [stockError, setStockError] = useState<{[key: number]: string}>({});
  const [selectedAll, setSelectedAll] = useState(false);
  const navigation = useNavigation();
  
  // Hide the default header
  React.useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);
  
  // Replace useEffect with useFocusEffect to refresh cart data whenever screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchCartItems();
      
      // Return a cleanup function if needed
      return () => {
        // Optional cleanup code
      };
    }, [])
  );
  
  const fetchCartItems = async () => {
    try {
      setLoading(true);
      
      // Get token from AsyncStorage
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        setError('You need to login to view your cart');
        setLoading(false);
        return;
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
        console.log('Cart items received:', JSON.stringify(data.data));
        
        // Process and verify cart item quantities
        const processedItems = data.data.map(item => {
          // Ensure quantity is a number
          const numQuantity = Number(item.quantity);
          if (isNaN(numQuantity)) {
            console.warn('Invalid quantity found in cart item:', item);
            item.quantity = 1;
          } else {
            item.quantity = numQuantity;
          }
          // Initialize all items as unselected by default
          item.selected = false;
          return item;
        });
        
        setCartItems(processedItems);
        setSelectedAll(false);
        setError(null);
        
        // Fetch stock information for all products in cart
        fetchStockInfo(processedItems.map(item => item.productId));
      } else {
        setError(data.message || 'Failed to fetch cart items');
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
      setError('Error loading cart. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch stock information for all products in cart
  const fetchStockInfo = async (productIds: string[]) => {
    if (!productIds.length) return;
    
    try {
      const stockData: StockInfo = {};
      
      // Fetch each product's stock information
      await Promise.all(
        productIds.map(async (productId: string) => {
          const response = await fetch(`${API_BASE_URL}/products/${productId}`);
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data) {
              stockData[productId] = data.data.stock || 0;
            }
          }
        })
      );
      
      console.log('Stock info fetched:', stockData);
      setStockInfo(stockData);
    } catch (error) {
      console.error('Error fetching stock info:', error);
    }
  };
  
  const updateQuantity = async (id: number, change: number) => {
    try {
      // Clear any previous error for this item
      setStockError(prev => {
        const newErrors = {...prev};
        delete newErrors[id];
        return newErrors;
      });
      
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        Alert.alert('Error', 'You need to login to update your cart');
        return;
      }
      
      // Find the current item
      const currentItem = cartItems.find(item => item.id === id);
      if (!currentItem) return;
      
      console.log(`Updating quantity for item ${currentItem.productName} (ID: ${id})`);
      console.log(`Current quantity: ${currentItem.quantity}, Change: ${change}`);
      
      // Check stock if trying to increase quantity
      if (change > 0) {
        const availableStock = stockInfo[currentItem.productId];
        if (availableStock !== undefined) {
          if (currentItem.quantity + change > availableStock) {
            // Show error if trying to add more than available stock
            setStockError(prev => ({
              ...prev,
              [id]: `Sorry, only ${availableStock} items available in stock.`
            }));
            return;
          }
        }
      }
      
      // Calculate new quantity
      const newQuantity = Math.max(0, currentItem.quantity + change);
      console.log(`New quantity will be: ${newQuantity}`);
      
      // Optimistically update UI
      setCartItems(prevItems => 
        prevItems.map(item => {
          if (item.id === id) {
            return { ...item, quantity: newQuantity };
          }
          return item;
        }).filter(item => item.quantity > 0) // Remove items with quantity 0
      );
      
      // Send update to server
      const response = await fetch(`${API_BASE_URL}/cart/update/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ quantity: newQuantity })
      });
      
      const data = await response.json();
      console.log('Cart update response:', JSON.stringify(data));
      
      if (!response.ok) {
        // If request fails, refresh the cart to get current state
        fetchCartItems();
        throw new Error('Failed to update cart');
      }
      
      // If quantity is 0, item will be removed from UI
      // No need to handle removal separately as filter does it
    } catch (error) {
      console.error('Error updating quantity:', error);
      Alert.alert('Error', 'Failed to update cart. Please try again.');
    }
  };
  
  const clearCart = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        Alert.alert('Error', 'You need to login to clear your cart');
        return;
      }
      
      // Confirm with user
      Alert.alert(
        'Clear Cart',
        'Are you sure you want to clear your cart?',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Clear',
            style: 'destructive',
            onPress: async () => {
              try {
                // Optimistically clear cart in UI
                setCartItems([]);
                
                // Send request to server
                const response = await fetch(`${API_BASE_URL}/cart/clear`, {
                  method: 'DELETE',
                  headers: {
                    'Authorization': `Bearer ${token}`
                  }
                });
                
                if (!response.ok) {
                  // If request fails, refresh the cart
                  fetchCartItems();
                  throw new Error('Failed to clear cart');
                }
              } catch (error) {
                console.error('Error clearing cart:', error);
                Alert.alert('Error', 'Failed to clear cart. Please try again.');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error clearing cart:', error);
      Alert.alert('Error', 'Failed to clear cart. Please try again.');
    }
  };
  
  // Toggle selection for a single item
  const toggleItemSelection = (id: number) => {
    setCartItems(prevItems => 
      prevItems.map(item => {
        if (item.id === id) {
          return { ...item, selected: !item.selected };
        }
        return item;
      })
    );
    
    // Check if all items are now selected or not
    const updatedItems = cartItems.map(item => item.id === id ? { ...item, selected: !item.selected } : item);
    const allSelected = updatedItems.every(item => item.selected);
    setSelectedAll(allSelected);
  };
  
  // Toggle selection for all items
  const toggleSelectAll = () => {
    const newSelectedState = !selectedAll;
    setSelectedAll(newSelectedState);
    
    setCartItems(prevItems => 
      prevItems.map(item => ({
        ...item, 
        selected: newSelectedState
      }))
    );
  };
  
  const getTotal = () => {
    return cartItems
      .filter(item => item.selected)
      .reduce((sum, item) => sum + (item.price * item.quantity), 0)
      .toFixed(2);
  };

  const getSelectedItemsCount = () => {
    return cartItems.filter(item => item.selected).length;
  };
  
  const proceedToCheckout = async () => {
    const selectedItems = cartItems.filter(item => item.selected);
    if (selectedItems.length === 0) {
      Alert.alert('No Items Selected', 'Please select at least one item to checkout.');
      return;
    }

    try {
      // Save the selected state to AsyncStorage for checkout page to use
      await AsyncStorage.setItem('selectedCartItems', JSON.stringify(
        cartItems.map(item => ({
          id: item.id,
          selected: item.selected
        }))
      ));
      
      // Navigate to checkout
      navigation.navigate('checkout' as never);
    } catch (error) {
      console.error('Error saving selection state:', error);
      Alert.alert('Error', 'There was a problem preparing your checkout. Please try again.');
    }
  };

  const renderCartItem = ({ item }: { item: CartItem }) => {
    console.log('Rendering cart item:', item.productName, 'quantity:', item.quantity);
    
    // Get stock information for this item
    const stock = stockInfo[item.productId];
    const hasStockError = stockError[item.id];
    const isAtStockLimit = stock !== undefined && item.quantity >= stock;
    
    return (
      <View style={styles.cartItemContainer}>
        <View style={styles.studRow}>
          {[...Array(3)].map((_, i) => (
            <View key={i} style={styles.stud}>
              <View style={styles.studInner} />
            </View>
          ))}
        </View>
        
        <View style={styles.cartItem}>
          {/* Product name and price at the same level */}
          <View style={styles.itemDetails}>
            <Text style={styles.itemName} numberOfLines={2} ellipsizeMode="tail">{item.productName}</Text>
            <Text style={styles.itemPrice}>₱{item.price.toFixed(2)}</Text>
          </View>
          
          {/* Checkbox, image, and quantity in a row */}
          <View style={styles.itemContentRow}>
            <TouchableOpacity 
              style={styles.checkboxContainer}
              onPress={() => toggleItemSelection(item.id)}
            >
              <View style={[
                styles.checkbox,
                item.selected && styles.checkboxSelected
              ]}>
                {item.selected && (
                  <MaterialCommunityIcons 
                    name="check" 
                    size={16} 
                    color="#FFFFFF" 
                  />
                )}
              </View>
            </TouchableOpacity>
            
            <Image 
              source={{ uri: item.imageURL || 'https://via.placeholder.com/300' }} 
              style={styles.itemImage} 
            />
            
            <View style={styles.quantityContainerShifted}>
              {hasStockError && (
                <Text style={styles.stockErrorText}>{hasStockError}</Text>
              )}
              
              <View style={styles.quantityControls}>
                <TouchableOpacity 
                  style={styles.quantityButton}
                  onPress={() => updateQuantity(item.id, -1)}
                >
                  <MaterialCommunityIcons name="minus" size={18} color="#FFFFFF" />
                  <View style={styles.buttonStud} />
                </TouchableOpacity>
                
                <Text style={styles.quantityText}>{item.quantity}</Text>
                
                <TouchableOpacity 
                  style={[
                    styles.quantityButton, 
                    { backgroundColor: isAtStockLimit ? '#CCCCCC' : '#4CAF50' }
                  ]}
                  disabled={isAtStockLimit}
                  onPress={() => updateQuantity(item.id, 1)}
                >
                  <MaterialCommunityIcons name="plus" size={18} color="#FFFFFF" />
                  <View style={styles.buttonStud} />
                </TouchableOpacity>
              </View>
              
              {stock !== undefined && (
                <Text style={styles.stockInfoText}>
                  {stock === 0 ? 'Out of stock' : `${stock} in stock`}
                </Text>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <UserHeader section="Cart" />
      
      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#E3000B" />
            <Text style={styles.loadingText}>Loading your cart...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={fetchCartItems}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : cartItems.length > 0 ? (
          <>
            <View style={styles.selectAllContainer}>
              <TouchableOpacity 
                style={styles.selectAllTouchable}
                onPress={toggleSelectAll}
              >
                <View style={[
                  styles.checkbox,
                  selectedAll && styles.checkboxSelected
                ]}>
                  {selectedAll && (
                    <MaterialCommunityIcons 
                      name="check" 
                      size={16} 
                      color="#FFFFFF" 
                    />
                  )}
                </View>
                <Text style={styles.selectAllText}>Select All</Text>
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={cartItems}
              renderItem={renderCartItem}
              keyExtractor={item => String(item.id)}
              contentContainerStyle={styles.cartList}
            />
            
            <View style={styles.cartSummary}>
              <View style={styles.studRow}>
                {[...Array(5)].map((_, i) => (
                  <View key={i} style={styles.stud}>
                    <View style={styles.studInner} />
                  </View>
                ))}
              </View>
              
              <View style={styles.summaryContent}>
                <View style={styles.summaryLeftSection}>
                  <Text style={styles.totalLabel}>Total:</Text>
                  <Text style={styles.selectedInfo}>
                    {getSelectedItemsCount()} item(s) selected
                  </Text>
                </View>
                <Text style={styles.totalAmount}>₱{getTotal()}</Text>
              </View>
              
              <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.clearCartButton} onPress={clearCart}>
                  <Text style={styles.clearCartText}>CLEAR CART</Text>
                  <View style={styles.clearButtonBottom} />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.checkoutButton} 
                  onPress={proceedToCheckout}
                >
                  <Text style={styles.checkoutText}>CHECKOUT</Text>
                  <View style={styles.buttonBottom} />
                </TouchableOpacity>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.emptyCartContainer}>
            <MaterialCommunityIcons name="cart-off" size={80} color="#E3000B" />
            <Text style={styles.emptyCartText}>Your cart is empty!</Text>
            <Text style={styles.emptyCartSubtext}>Time to build your collection</Text>
          </View>
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
  cartList: {
    paddingBottom: 16,
  },
  cartItemContainer: {
    marginBottom: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
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
  cartItem: {
    padding: 12,
    flexDirection: 'column', // Changed from 'row' to 'column'
  },
  itemContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10, // Add space between product name and the content row
  },
  itemImage: {
    width: 70,
    height: 70,
    borderRadius: 4,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#DDDDDD',
  },
  itemDetails: {
    marginBottom: 8, // Add spacing below the product info
    width: '100%', // Take up full width
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemName: {
    fontSize: 18, // Slightly larger as it's now a main header
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#0C0A00',
    flex: 1,
    paddingRight: 10,
  },
  itemPrice: {
    fontSize: 16,
    color: '#E3000B',
    fontWeight: '700',
  },
  quantityContainer: {
    alignItems: 'center',
  },
  quantityContainerShifted: {
    alignItems: 'center',
    marginLeft: 'auto', // This pushes the quantity controls to the right
    paddingRight: 5,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    padding: 8,
    backgroundColor: '#FF3A2F',
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#000',
    height: 36,
    width: 36,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  buttonStud: {
    position: 'absolute',
    top: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.3)',
    right: 12,
  },
  quantityText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 12,
    minWidth: 24,
    textAlign: 'center',
  },
  cartSummary: {
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#000000',
    marginTop: 16,
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
  summaryContent: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0C0A00',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#E3000B',
  },
  buttonContainer: {
    flexDirection: 'row',
    borderTopWidth: 2,
    borderTopColor: '#000000',
  },
  clearCartButton: {
    backgroundColor: '#FF3A2F',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 60,
    flex: 1,
  },
  clearCartText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: Platform.select({
      ios: 'Futura-Bold',
      android: 'sans-serif-condensed',
      default: 'System'
    }),
    letterSpacing: 1,
  },
  clearButtonBottom: {
    width: '94%',
    height: 6,
    backgroundColor: '#D32F2F',
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  checkoutButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 60,
    flex: 1,
    borderLeftWidth: 2,
    borderLeftColor: '#000000',
  },
  checkoutText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: Platform.select({
      ios: 'Futura-Bold',
      android: 'sans-serif-condensed',
      default: 'System'
    }),
    letterSpacing: 1,
  },
  buttonBottom: {
    width: '94%',
    height: 6,
    backgroundColor: '#3D8B40',
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  emptyCartContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyCartText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0C0A00',
    marginTop: 16,
    marginBottom: 8,
    fontFamily: Platform.select({
      ios: 'Futura-Bold',
      android: 'sans-serif-condensed',
      default: 'System'
    }),
  },
  emptyCartSubtext: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  errorText: {
    fontSize: 16,
    color: '#E3000B',
    textAlign: 'center',
    marginBottom: 20
  },
  retryButton: {
    backgroundColor: '#E3000B',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold'
  },
  stockErrorText: {
    color: '#E3000B',
    fontSize: 12,
    marginBottom: 4,
    textAlign: 'center',
    maxWidth: 120,
  },
  stockInfoText: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 4,
    textAlign: 'center',
  },
  checkboxContainer: {
    marginRight: 12,
    justifyContent: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#4CAF50',
  },
  selectAllContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#000000',
  },
  selectAllTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectAllText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0C0A00',
  },
  summaryLeftSection: {
    flexDirection: 'column',
  },
  selectedInfo: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
});
