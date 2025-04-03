import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import UserHeader from '@/components/UserHeader';
import { useNavigation } from '@react-navigation/native';

// Sample cart data - in a real app this would come from state management or API
const initialCartItems = [
  {
    id: '1',
    name: 'LEGO City Police Station',
    price: 99.99,
    quantity: 1,
    image: 'https://placehold.co/400x400/DA291C/FFD700/png'
  },
  {
    id: '2',
    name: 'LEGO Star Wars X-Wing',
    price: 79.99,
    quantity: 2,
    image: 'https://placehold.co/400x400/DA291C/FFD700/png'
  },
  {
    id: '3',
    name: 'LEGO Friends Heartlake City',
    price: 59.99,
    quantity: 1,
    image: 'https://placehold.co/400x400/DA291C/FFD700/png'
  }
];

export default function CartScreen() {
  const [cartItems, setCartItems] = useState(initialCartItems);
  const navigation = useNavigation();
  
  // Hide the default header
  React.useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);
  
  const updateQuantity = (id: string, change: number) => {
    const maxQuantity = 10; // Set maximum quantity limit
    
    setCartItems(prevItems => 
      prevItems.map(item => {
        if (item.id === id) {
          const newQuantity = Math.max(0, Math.min(maxQuantity, item.quantity + change));
          return { ...item, quantity: newQuantity };
        }
        return item;
      }).filter(item => item.quantity > 0) // Remove items with quantity 0
    );
  };
  
  const clearCart = () => {
    setCartItems([]);
  };
  
  const getTotal = () => {
    return cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2);
  };

  const renderCartItem = ({ item }: { item: { id: string; name: string; price: number; quantity: number; image: string } }) => (
    <View style={styles.cartItemContainer}>
      <View style={styles.studRow}>
        {[...Array(3)].map((_, i) => (
          <View key={i} style={styles.stud}>
            <View style={styles.studInner} />
          </View>
        ))}
      </View>
      
      <View style={styles.cartItem}>
        <Image source={{ uri: item.image }} style={styles.itemImage} />
        
        <View style={styles.itemDetails}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemPrice}>₱{item.price}</Text>
        </View>
        
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
            style={[styles.quantityButton, { backgroundColor: '#4CAF50' }]}
            onPress={() => updateQuantity(item.id, 1)}
          >
            <MaterialCommunityIcons name="plus" size={18} color="#FFFFFF" />
            <View style={styles.buttonStud} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <UserHeader section="Cart" />
      
      <View style={styles.content}>
        {cartItems.length > 0 ? (
          <>
            <FlatList
              data={cartItems}
              renderItem={renderCartItem}
              keyExtractor={item => item.id}
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
                <Text style={styles.totalLabel}>Total:</Text>
                <Text style={styles.totalAmount}>₱{getTotal()}</Text>
              </View>
              
              <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.clearCartButton} onPress={clearCart}>
                  <Text style={styles.clearCartText}>CLEAR CART</Text>
                  <View style={styles.clearButtonBottom} />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.checkoutButton} 
                  onPress={() => navigation.navigate('checkout' as never)}
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
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
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
    flex: 1,
    marginRight: 8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#0C0A00',
  },
  itemPrice: {
    fontSize: 16,
    color: '#E3000B',
    fontWeight: '700',
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
  }
});
