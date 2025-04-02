import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Dimensions,
  FlatList
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { API_BASE_URL } from '@/env';
import UserHeader from '@/components/UserHeader';
import { MaterialCommunityIcons } from '@expo/vector-icons';
const FETCH_TIMEOUT = 10000;

interface Product {
  _id: string;
  name: string;
  price: number;
  imageURL: string[];  // Changed from image: string to match home.tsx
  pieces: number;
  category: string;
  description: string;
  stock: number; // Added stock property
}

export default function ProductDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const carouselRef = useRef<FlatList>(null);
  
  // Sample images for demonstration - in real implementation, these would come from the product data
  const [productImages, setProductImages] = useState<string[]>([]);
  
  useEffect(() => {
    fetchProductDetails();
  }, [id]);
  
  useEffect(() => {
    // If product is loaded, initialize the image array
    if (product) {
      // Use imageURL property instead of image
      if (product.imageURL && product.imageURL.length > 0) {
        // If we have multiple images, use them all
        setProductImages(product.imageURL);
      } else {
        // Fallback to a placeholder if no images
        setProductImages(['https://via.placeholder.com/300']);
      }
    }
  }, [product]);

  const fetchWithTimeout = async (url: string, options = {}) => {
    const controller = new AbortController();
    const { signal } = controller;
    
    const timeout = setTimeout(() => {
      controller.abort();
    }, FETCH_TIMEOUT);
    
    try {
      const response = await fetch(url, { ...options, signal });
      clearTimeout(timeout);
      return response;
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  };

  const fetchProductDetails = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      
      const apiUrl = `${API_BASE_URL}/products/${id}`;
      console.log(`Fetching product details from: ${apiUrl}`);
      
      const response = await fetchWithTimeout(apiUrl);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Server responded with status: ${response.status}`
        );
      }
      
      const responseData = await response.json();
      
      if (responseData.success) {
        setProduct(responseData.data);
        setError(null);
      } else {
        throw new Error(responseData.message || 'Failed to fetch product details');
      }
    } catch (err: any) {
      console.error('Error fetching product details:', err);
      if (err.name === 'AbortError') {
        setError('Request timed out. Please check your connection and try again.');
      } else if (err.message.includes('Network request failed')) {
        setError('Network error. Please check your connection and server status.');
      } else {
        setError(`Error loading product details: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (increment: boolean) => {
    setQuantity(prev => {
      if (increment) {
        return prev + 1;
      } else {
        return prev > 1 ? prev - 1 : 1;
      }
    });
  };

  // Calculate the total price based on quantity
  const calculateTotal = () => {
    if (!product) return "₱0.00";
    const total = product.price * quantity;
    return `₱${total.toFixed(2)}`;
  };

  // Carousel navigation functions
  const goToNextImage = () => {
    if (!carouselRef.current || currentImageIndex >= productImages.length - 1) return;
    
    const newIndex = currentImageIndex + 1;
    carouselRef.current.scrollToIndex({
      index: newIndex,
      animated: true
    });
    setCurrentImageIndex(newIndex);
  };

  const goToPreviousImage = () => {
    if (!carouselRef.current || currentImageIndex <= 0) return;
    
    const newIndex = currentImageIndex - 1;
    carouselRef.current.scrollToIndex({
      index: newIndex,
      animated: true
    });
    setCurrentImageIndex(newIndex);
  };

  const handleViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentImageIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50
  }).current;

  return (
    <View style={styles.container}>
      {/* Make UserHeader more compact */}
      <UserHeader section="Product Details" compact={true} />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E3000B" />
          <Text style={styles.loadingText}>Loading product details...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={fetchProductDetails}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : product ? (
        <ScrollView style={styles.scrollView} nestedScrollEnabled={true}>
          {/* Product Image Carousel */}
          <View style={styles.carouselContainer}>
            <FlatList
              ref={carouselRef}
              data={productImages}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(_, index) => index.toString()}
              onViewableItemsChanged={handleViewableItemsChanged}
              viewabilityConfig={viewabilityConfig}
              renderItem={({ item }) => (
                <View style={styles.carouselItem}>
                  <Image 
                    source={{ uri: item }}
                    style={styles.productImage}
                    resizeMode="contain"
                  />
                </View>
              )}
            />
            
            {/* Carousel Navigation Buttons - UPDATED */}
            {currentImageIndex > 0 && (
              <TouchableOpacity 
                style={[styles.carouselButton, styles.prevButton]} 
                onPress={goToPreviousImage}
              >
                <MaterialCommunityIcons name="chevron-left" size={30} color="#FFFFFF" />
              </TouchableOpacity>
            )}
            
            {currentImageIndex < productImages.length - 1 && (
              <TouchableOpacity 
                style={[styles.carouselButton, styles.nextButton]} 
                onPress={goToNextImage}
              >
                <MaterialCommunityIcons name="chevron-right" size={30} color="#FFFFFF" />
              </TouchableOpacity>
            )}
            
            {/* Enhanced Carousel Indicators */}
            {productImages.length > 1 && (
              <View style={styles.indicatorContainer}>
                {productImages.map((_, index) => (
                  <View 
                    key={index} 
                    style={[
                      styles.indicator, 
                      index === currentImageIndex && styles.activeIndicator
                    ]} 
                  />
                ))}
              </View>
            )}
          </View>
          
          {/* Product Info with LEGO styling */}
          <View style={styles.productInfoContainer}>
            <Text style={styles.productName}>{product.name}</Text>
            
            <View style={styles.productMetaContainer}>
              <Text style={styles.productCategory}>{product.category}</Text>
              <Text style={styles.productPieces}>{product.pieces} pieces</Text>
            </View>
            
            <Text style={styles.productPrice}>₱{product.price.toFixed(2)}</Text>
            
            {/* Stock Information */}
            <View style={styles.stockContainer}>
              <Text style={styles.stockLabel}>Availability:</Text>
              <View style={[
                styles.stockBadge,
                product.stock > 10 ? styles.inStock : 
                product.stock > 0 ? styles.lowStock : styles.outOfStock
              ]}>
                <Text style={styles.stockText}>
                  {product.stock > 0 
                    ? `${product.stock} in stock` 
                    : 'Out of Stock'}
                </Text>
              </View>
            </View>
            
            <View style={styles.divider} />
            
            <Text style={styles.descriptionTitle}>Description</Text>
            <Text style={styles.descriptionText}>{product.description}</Text>
            
            {/* Quantity Selector */}
            <View style={styles.quantityContainer}>
              <Text style={styles.quantityLabel}>Quantity:</Text>
              <View style={styles.quantityControls}>
                <TouchableOpacity 
                  style={styles.quantityButton}
                  onPress={() => handleQuantityChange(false)}
                >
                  <Text style={styles.quantityButtonText}>-</Text>
                </TouchableOpacity>
                
                <Text style={styles.quantityText}>{quantity}</Text>
                
                <TouchableOpacity 
                  style={styles.quantityButton}
                  onPress={() => handleQuantityChange(true)}
                >
                  <Text style={styles.quantityButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Total Price Display */}
            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalPrice}>{calculateTotal()}</Text>
            </View>
            
            <TouchableOpacity style={styles.addToCartButton}>
              <Text style={styles.addToCartButtonText}>
                Add {quantity > 1 ? `${quantity} items` : 'to Cart'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Product not found</Text>
        </View>
      )}
    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8', // Lighter background
  },
  // Remove header styles as we're using UserHeader component
  scrollView: {
    flex: 1,
  },
  productImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
  productInfoContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
    // Add LEGO-style border
    borderTopWidth: 3,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#0C0A00',
  },
  productName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Futura-Bold' : 'sans-serif-condensed',
    color: '#E3000B', // LEGO red color
  },
  productMetaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  productCategory: {
    backgroundColor: '#006DB7', // LEGO blue
    color: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    fontSize: 14,
    fontWeight: '500',
    overflow: 'hidden',
    fontFamily: Platform.OS === 'ios' ? 'Futura-Medium' : 'sans-serif-medium',
    // Add LEGO-style border
    borderWidth: 1,
    borderColor: '#000000',
  },
  productPieces: {
    fontSize: 16,
    color: '#0C0A00', // Darker for better contrast
    fontFamily: Platform.OS === 'ios' ? 'Futura-Medium' : 'sans-serif-medium',
    fontWeight: 'bold',
  },
  productPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#E3000B', // LEGO red
    marginVertical: 12,
    fontFamily: Platform.OS === 'ios' ? 'Futura-Bold' : 'sans-serif-condensed',
  },
  divider: {
    height: 3, // Thicker divider
    backgroundColor: '#FFE500', // LEGO yellow
    marginVertical: 16,
    borderRadius: 1.5,
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Futura-Bold' : 'sans-serif-condensed',
    color: '#0C0A00', // Darker for better contrast
  },
  descriptionText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginBottom: 24,
    fontFamily: Platform.OS === 'ios' ? 'Futura-Medium' : 'sans-serif',
  },
  addToCartButton: {
    backgroundColor: '#E3000B', // LEGO red
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 2, // LEGO-style border
    borderColor: '#0C0A00',
    // Add LEGO button shadow effect
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  addToCartButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Futura-Bold' : 'sans-serif-condensed',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#0C0A00', // Darker for better contrast
    fontFamily: Platform.OS === 'ios' ? 'Futura-Medium' : 'sans-serif-medium',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#E3000B', // LEGO red
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'Futura-Medium' : 'sans-serif-medium',
  },
  retryButton: {
    backgroundColor: '#E3000B', // LEGO red
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 2, // LEGO-style border
    borderColor: '#0C0A00',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Futura-Bold' : 'sans-serif-condensed',
  },
  // Quantity selector styles with LEGO theme
  quantityContainer: {
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quantityLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Futura-Bold' : 'sans-serif-condensed',
    color: '#0C0A00', // Darker for better contrast
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2, // Thicker border for LEGO style
    borderColor: '#0C0A00',
    borderRadius: 8,
    overflow: 'hidden', // Ensure buttons don't overflow
  },
  quantityButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFE500', // LEGO yellow
  },
  quantityButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0C0A00', // Black text on yellow
  },
  quantityText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 16,
    minWidth: 24,
    textAlign: 'center',
    color: '#0C0A00', // Darker for better contrast
  },
  // Total price styles with LEGO theme
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFE500', // LEGO yellow background
    borderRadius: 8,
    borderWidth: 2, // Thicker border for LEGO style
    borderColor: '#0C0A00',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Futura-Bold' : 'sans-serif-condensed',
    color: '#0C0A00', // Black on yellow for visibility
  },
  totalPrice: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#E3000B', // LEGO red
    fontFamily: Platform.OS === 'ios' ? 'Futura-Bold' : 'sans-serif-condensed',
  },
  // Carousel styles with LEGO theme
  carouselContainer: {
    position: 'relative',
    height: width,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 3, // LEGO-style thick border
    borderBottomColor: '#FFE500', // LEGO yellow
  },
  carouselItem: {
    width: width,
    height: width,
    justifyContent: 'center',
    alignItems: 'center',
  },
  carouselButton: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -20 }],
    width: 44, // Slightly larger for better touch target
    height: 44, // Slightly larger for better touch target
    borderRadius: 22,
    backgroundColor: '#006DB7', // LEGO blue
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderWidth: 2, // LEGO-style border
    borderColor: '#0C0A00',
    // Add shadow for better visibility
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 3,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  prevButton: {
    left: 10,
  },
  nextButton: {
    right: 10,
  },
  // Enhanced carousel indicator styles
  indicatorContainer: {
    position: 'absolute',
    bottom: 15,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingVertical: 8,
  },
  indicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 5,
    borderWidth: 2,
    borderColor: '#0C0A00',
    // Add shadow for better visibility
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.8,
        shadowRadius: 1,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  activeIndicator: {
    backgroundColor: '#E3000B', // LEGO red
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  // Stock styles with LEGO theme
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stockLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10,
    fontFamily: Platform.OS === 'ios' ? 'Futura-Bold' : 'sans-serif-condensed',
    color: '#0C0A00', // Darker for better contrast
  },
  stockBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1, // LEGO-style border
    borderColor: '#0C0A00',
  },
  inStock: {
    backgroundColor: '#4CAF50',
  },
  lowStock: {
    backgroundColor: '#FF9800',
  },
  outOfStock: {
    backgroundColor: '#F44336',
  },
  stockText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Futura-Medium' : 'sans-serif-medium',
  },
});
