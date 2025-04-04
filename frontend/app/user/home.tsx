import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Platform, 
  TouchableOpacity, 
  TextInput, 
  Image,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import UserHeader from '@/components/UserHeader';
import { IconSymbol } from '@/components/ui/IconSymbol';
import ProductCard from '@/components/ProductCard';
import { API_BASE_URL } from '@/env';
import { registerPushTokenAfterLogin, forceRegisterPushToken } from '@/utils/notificationHelper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Request timeout in milliseconds
const FETCH_TIMEOUT = 10000;

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

interface Product {
  _id: string;
  name: string;
  price: number;
  imageURL: string[];
  pieces: number;
  category: string;
  description: string;
  stock: number;
}

// API response interface to match our backend format
interface ApiResponse {
  success: boolean;
  count: number;
  total: number;
  totalPages: number;
  currentPage: number;
  data: Product[];
  message?: string; // Optional message property
}

export default function Home() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentCategory, setCurrentCategory] = useState<string | null>(null);
  // Add price range state variables
  const [minPrice, setMinPrice] = useState<number | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [showPriceFilter, setShowPriceFilter] = useState(false);
  // Add state variable to track if filters have been applied
  const [filtersApplied, setFiltersApplied] = useState(false);
  // Add state for custom price range inputs
  const [customMinPrice, setCustomMinPrice] = useState<string>('');
  const [customMaxPrice, setCustomMaxPrice] = useState<string>('');

  useEffect(() => {
    fetchProducts();
    
    // Register push token if not already done
    const registerPushToken = async () => {
      try {
        // Only register for users with role 'user'
        const userRole = await AsyncStorage.getItem('userRole');
        if (userRole !== 'user') {
          console.log(`Home screen: User has role '${userRole}', skipping push token registration`);
          return;
        }
        
        console.log('Home screen: Registering push notification token for user...');
        const registered = await registerPushTokenAfterLogin();
        if (registered) {
          console.log('Home screen: Push notification token registered successfully');
        } else {
          console.warn('Home screen: Failed to register push notification token');
        }
      } catch (error) {
        console.error('Home screen: Error registering push notification token:', error);
      }
    };
    
    registerPushToken();
  }, []);

  // Add a new useEffect to handle combined filters
  useEffect(() => {
    if (filtersApplied) {
      handleSearch();
      setFiltersApplied(false);
    }
  }, [filtersApplied]);

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

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setCurrentCategory(null);
      setMinPrice(null);
      setMaxPrice(null);
      
      // Add limit parameter to get all products (adjust higher than your total count)
      console.log(`Fetching products from: ${API_BASE_URL}/products?limit=50`);
      const response = await fetchWithTimeout(`${API_BASE_URL}/products?limit=50`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Server responded with status: ${response.status}`
        );
      }
      
      const responseData: ApiResponse = await response.json();
      console.log(`Received ${responseData.data?.length || 0} total products from API`);
      
      if (responseData.success) {
        // Make sure all products are being set to state
        setProducts(responseData.data || []);
        setError(null);
      } else {
        throw new Error(responseData.message || 'Failed to fetch products');
      }
    } catch (err: any) {
      console.error('Error fetching products:', err);
      if (err.name === 'AbortError') {
        setError('Request timed out. Please check your connection and try again.');
      } else if (err.message.includes('Network request failed')) {
        setError('Network error. Please check your connection and server status.');
      } else {
        setError(`Error loading products: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    try {
      setLoading(true);
      
      // Build the URL with filters
      let apiUrl = `${API_BASE_URL}/products`;
      const queryParams = new URLSearchParams();
      
      // Set limit parameter
      queryParams.append('limit', '50');
      
      // Add category filter if present
      if (currentCategory) {
        queryParams.append('category', currentCategory);
        console.log(`Applying category filter: ${currentCategory}`);
      }
      
      // Add price range if present
      if (minPrice !== null) {
        queryParams.append('minPrice', minPrice.toString());
        console.log(`Applying min price filter: ₱${minPrice}`);
      }
      
      if (maxPrice !== null) {
        queryParams.append('maxPrice', maxPrice.toString());
        console.log(`Applying max price filter: ₱${maxPrice}`);
      }
      
      // Add search query if present
      if (searchQuery.trim()) {
        apiUrl += `/search/${encodeURIComponent(searchQuery)}`;
        console.log(`Applying search query: "${searchQuery}"`);
      }
      
      // Combine URL and query parameters
      apiUrl += `?${queryParams.toString()}`;
      
      console.log(`Searching products with filters from: ${apiUrl}`);
      
      const response = await fetchWithTimeout(apiUrl);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Server responded with status: ${response.status}`
        );
      }
      
      const responseData: ApiResponse = await response.json();
      console.log(`Search found ${responseData.data?.length || 0} products`);
      
      if (responseData.success) {
        // Filter the results client-side to ensure they match all criteria
        // This is a safety measure in case the backend API doesn't filter correctly
        let filteredProducts = responseData.data || [];
        
        // Apply client-side category filter if needed
        if (currentCategory) {
          filteredProducts = filteredProducts.filter(p => 
            p.category === currentCategory
          );
          console.log(`After client-side category filter: ${filteredProducts.length} products`);
        }
        
        // Apply client-side price filter if needed
        if (minPrice !== null || maxPrice !== null) {
          filteredProducts = filteredProducts.filter(p => {
            const price = p.price;
            const passesMinPrice = minPrice === null || price >= minPrice;
            const passesMaxPrice = maxPrice === null || price <= maxPrice;
            return passesMinPrice && passesMaxPrice;
          });
          console.log(`After client-side price filter: ${filteredProducts.length} products`);
        }
        
        setProducts(filteredProducts);
        setError(null);
      } else {
        throw new Error(responseData.message || 'Failed to search products');
      }
    } catch (err: any) {
      console.error('Error searching products:', err);
      if (err.name === 'AbortError') {
        setError('Search request timed out. Please try again.');
      } else if (err.message.includes('Network request failed')) {
        setError('Network error. Please check your connection and server status.');
      } else {
        setError(`Error searching products: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryFilter = (category: string) => {
    // Toggle category selection - if already selected, clear it
    if (currentCategory === category) {
      setCurrentCategory(null);
    } else {
      setCurrentCategory(category);
    }
    
    // Delay applying filters to ensure state is updated
    setTimeout(() => {
      setFiltersApplied(true);
    }, 10); // Slightly longer timeout to ensure state updates
  };

  // Add price range handling function
  const handlePriceRange = (min: number | null, max: number | null) => {
    setMinPrice(min);
    setMaxPrice(max);
    setShowPriceFilter(false);
    
    // Delay applying filters to ensure state is updated
    setTimeout(() => {
      setFiltersApplied(true);
    }, 0);
  };

  const handleCustomPriceRange = () => {
    // Parse inputs to numbers, default to null if empty or invalid
    const min = customMinPrice ? parseInt(customMinPrice, 10) : null;
    const max = customMaxPrice ? parseInt(customMaxPrice, 10) : null;
    
    // Validate inputs
    if ((min !== null && isNaN(min)) || (max !== null && isNaN(max))) {
      Alert.alert('Invalid Price', 'Please enter valid numbers for price range.');
      return;
    }
    
    // Validate min is less than max if both are provided
    if (min !== null && max !== null && min > max) {
      Alert.alert('Invalid Price Range', 'Minimum price should be less than maximum price.');
      return;
    }
    
    // Apply the price filter
    setMinPrice(min);
    setMaxPrice(max);
    setShowPriceFilter(false);
    
    // Clear custom inputs
    setCustomMinPrice('');
    setCustomMaxPrice('');
    
    // Apply filters
    setTimeout(() => {
      setFiltersApplied(true);
    }, 0);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setCurrentCategory(null);
    setMinPrice(null);
    setMaxPrice(null);
    fetchProducts();
  };

  // Update this function to use PHP peso symbol
  const getPriceRangeText = () => {
    if (minPrice !== null && maxPrice !== null) {
      return `₱${minPrice} - ₱${maxPrice}`;
    } else if (minPrice !== null) {
      return `₱${minPrice}+`;
    } else if (maxPrice !== null) {
      return `Under ₱${maxPrice}`;
    }
    return 'Price Range';
  };

  const handleProductPress = (productId: string) => {
    router.push({ pathname: '/user/product/[id]', params: { id: productId } });
  };

  const handleResetSearch = () => {
    setSearchQuery('');
    fetchProducts();
  };

  return (
    <View style={styles.container}>
      <UserHeader section="Home" />
      <ScrollView style={styles.scrollView}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search LEGO sets"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              placeholderTextColor={LEGO_COLORS.darkGrey}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity style={styles.resetButton} onPress={handleResetSearch}>
                <Text style={styles.iconText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <Text style={styles.searchIconText}>🔍</Text>
          </TouchableOpacity>
        </View>

        {/* Banner */}
        <View style={styles.bannerContainer}>
          <Image 
            source={{ uri: 'https://admin.prod.gamesmen-anchorbuild.com/media/wysiwyg/categories/lego/lego_banner.jpg' }}
            style={styles.bannerImage}
            resizeMode="cover"
          />
          <View style={styles.bannerOverlay}>
            <Text style={styles.bannerTitle}>Build Your World</Text>
            <Text style={styles.bannerSubtitle}>Discover Endless Creativity</Text>
          </View>
          
          {/* LEGO Brick Pattern */}
          <View style={styles.brickPatternContainer}>
            {[...Array(8)].map((_, i) => (
              <View key={i} style={styles.brickStud} />
            ))}
          </View>
        </View>

        {/* Category Filters - Made Smaller */}
        <View style={styles.filterRow}>
          <View style={styles.categoryContainer}>
            <TouchableOpacity 
              style={[
                styles.categoryButton, 
                currentCategory === null && styles.categoryButtonActive
              ]}
              onPress={() => fetchProducts()}
            >
              <Text style={[
                styles.categoryText, 
                currentCategory === null && styles.categoryTextActive
              ]}>All</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.categoryButton, 
                currentCategory === 'Set' && styles.categoryButtonActive
              ]}
              onPress={() => handleCategoryFilter('Set')}
            >
              <Text style={[
                styles.categoryText, 
                currentCategory === 'Set' && styles.categoryTextActive
              ]}>Sets</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.categoryButton, 
                currentCategory === 'Minifigure' && styles.categoryButtonActive
              ]}
              onPress={() => handleCategoryFilter('Minifigure')}
            >
              <Text style={[
                styles.categoryText, 
                currentCategory === 'Minifigure' && styles.categoryTextActive
              ]}>MiniFigures</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.categoryButton, 
                currentCategory === 'Piece' && styles.categoryButtonActive
              ]}
              onPress={() => handleCategoryFilter('Piece')}
            >
              <Text style={[
                styles.categoryText, 
                currentCategory === 'Piece' && styles.categoryTextActive
              ]}>Pieces</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Price Filter */}
        <View style={styles.filterContainer}>
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setShowPriceFilter(!showPriceFilter)}
          >
            <Text style={styles.filterButtonText}>
              {getPriceRangeText()}
            </Text>
            <View style={styles.filterButtonIcon}>
              <Text style={styles.filterIconText}>{showPriceFilter ? "▲" : "▼"}</Text>
            </View>
          </TouchableOpacity>
          
          {showPriceFilter && (
            <View style={styles.priceRangeContainer}>
              {/* Preset price ranges */}
              <TouchableOpacity 
                style={styles.priceOption}
                onPress={() => handlePriceRange(0, 200)}
              >
                <Text style={styles.priceOptionText}>₱0 - ₱200</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.priceOption}
                onPress={() => handlePriceRange(200, 500)}
              >
                <Text style={styles.priceOptionText}>₱200 - ₱500</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.priceOption}
                onPress={() => handlePriceRange(500, 1000)}
              >
                <Text style={styles.priceOptionText}>₱500 - ₱1,000</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.priceOption}
                onPress={() => handlePriceRange(1000, 2000)}
              >
                <Text style={styles.priceOptionText}>₱1,000 - ₱2,000</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.priceOption}
                onPress={() => handlePriceRange(2000, null)}
              >
                <Text style={styles.priceOptionText}>₱2,000+</Text>
              </TouchableOpacity>
              
              {/* Custom price range input */}
              <View style={styles.customPriceContainer}>
                <Text style={styles.customPriceLabel}>Custom Price Range:</Text>
                
                <View style={styles.customPriceInputRow}>
                  <View style={styles.customPriceInputWrapper}>
                    <Text style={styles.currencySymbol}>₱</Text>
                    <TextInput
                      style={styles.customPriceInput}
                      placeholder="Min"
                      value={customMinPrice}
                      onChangeText={setCustomMinPrice}
                      keyboardType="number-pad"
                      returnKeyType="done"
                      placeholderTextColor={LEGO_COLORS.darkGrey}
                    />
                  </View>
                  
                  <Text style={styles.customPriceToText}>to</Text>
                  
                  <View style={styles.customPriceInputWrapper}>
                    <Text style={styles.currencySymbol}>₱</Text>
                    <TextInput
                      style={styles.customPriceInput}
                      placeholder="Max"
                      value={customMaxPrice}
                      onChangeText={setCustomMaxPrice}
                      keyboardType="number-pad"
                      returnKeyType="done"
                      placeholderTextColor={LEGO_COLORS.darkGrey}
                    />
                  </View>
                </View>
                
                <TouchableOpacity 
                  style={styles.applyPriceButton}
                  onPress={handleCustomPriceRange}
                >
                  <Text style={styles.applyPriceButtonText}>Apply Custom Price</Text>
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity 
                style={[styles.priceOption, styles.resetOption]}
                onPress={() => {
                  setMinPrice(null);
                  setMaxPrice(null);
                  setCustomMinPrice('');
                  setCustomMaxPrice('');
                  setShowPriceFilter(false);
                  setFiltersApplied(true);
                }}
              >
                <Text style={styles.resetText}>Reset Price</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Active Filters Display */}
        {(currentCategory !== null || minPrice !== null || maxPrice !== null || searchQuery !== '') && (
          <View style={styles.activeFiltersContainer}>
            <Text style={styles.activeFiltersTitle}>Active Filters:</Text>
            <View style={styles.activeFiltersRow}>
              {searchQuery !== '' && (
                <View style={styles.activeFilterTag}>
                  <Text style={styles.activeFilterText}>Search: {searchQuery}</Text>
                </View>
              )}
              
              {currentCategory !== null && (
                <View style={styles.activeFilterTag}>
                  <Text style={styles.activeFilterText}>Category: {currentCategory}</Text>
                </View>
              )}
              
              {(minPrice !== null || maxPrice !== null) && (
                <View style={styles.activeFilterTag}>
                  <Text style={styles.activeFilterText}>Price: {getPriceRangeText()}</Text>
                </View>
              )}
              
              <TouchableOpacity 
                style={styles.resetAllButton}
                onPress={handleResetFilters}
              >
                <Text style={styles.resetAllText}>Reset All</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Products Container */}
        <View style={styles.productsContainer}>
          <View style={styles.sectionTitleContainer}>
            <Text style={styles.sectionTitle}>
              {currentCategory ? `${currentCategory}s` : 'All Products'}
              {searchQuery ? ` matching "${searchQuery}"` : ''}
              {(minPrice !== null || maxPrice !== null) ? ` (${getPriceRangeText()})` : ''}
            </Text>
            
            {!loading && !error && products.length > 0 && (
              <Text style={styles.productCount}>
                Showing {products.length} products
              </Text>
            )}
          </View>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={LEGO_COLORS.red} />
              <Text style={styles.loadingText}>Loading products...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={fetchProducts}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : products.length === 0 ? (
            <View style={styles.noResultsContainer}>
              <IconSymbol name="exclamationmark.triangle" size={40} color={LEGO_COLORS.yellow} />
              <Text style={styles.noResultsText}>No products found. Try a different search.</Text>
            </View>
          ) : (
            <View style={styles.productGrid}>
              {products.map((product) => (
                <View key={product._id} style={styles.productCardWrapper}>
                  <ProductCard 
                    id={product._id}
                    name={product.name}
                    price={product.price}
                    image={product.imageURL && product.imageURL.length > 0 ? 
                      product.imageURL[0] : 'https://via.placeholder.com/300'}
                    pieces={product.pieces}
                    stock={product.stock}
                    onPress={() => handleProductPress(product._id)}
                  />
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LEGO_COLORS.lightGrey,
  },
  scrollView: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: LEGO_COLORS.white,
    alignItems: 'center',
    borderBottomWidth: 4,
    borderBottomColor: LEGO_COLORS.yellow,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: LEGO_COLORS.lightGrey,
    borderRadius: 8,
    marginRight: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: LEGO_COLORS.darkGrey,
    height: 50,
  },
  searchInput: {
    flex: 1,
    padding: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontWeight: '500',
    fontSize: 16,
  },
  searchButton: {
    backgroundColor: LEGO_COLORS.red,
    borderRadius: 8,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: LEGO_COLORS.darkGrey,
    ...LEGO_SHADOW,
  },
  resetButton: {
    padding: 8,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: LEGO_COLORS.darkGrey,
  },
  searchIconText: {
    fontSize: 20,
    color: LEGO_COLORS.white,
  },
  bannerContainer: {
    height: 200,
    position: 'relative',
    marginBottom: 16,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 16,
  },
  bannerTitle: {
    color: LEGO_COLORS.yellow,
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    textShadowColor: LEGO_COLORS.black,
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  bannerSubtitle: {
    color: LEGO_COLORS.white,
    fontSize: 18,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    textShadowColor: LEGO_COLORS.black,
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  brickPatternContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    backgroundColor: LEGO_COLORS.red,
  },
  brickStud: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: LEGO_COLORS.red,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
    marginTop: 2,
    ...LEGO_SHADOW,
  },
  filterRow: {
    backgroundColor: LEGO_COLORS.white,
    paddingVertical: 8,
    marginBottom: 8,
    borderBottomWidth: 3,
    borderBottomColor: LEGO_COLORS.blue,
    ...LEGO_SHADOW,
  },
  categoryContainer: {
    flexDirection: 'row',
    backgroundColor: LEGO_COLORS.white,
    paddingVertical: 5,
    paddingHorizontal: 8,
    justifyContent: 'space-between',
  },
  categoryButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: LEGO_COLORS.lightGrey,
    borderWidth: 1.5,
    borderColor: LEGO_COLORS.darkGrey,
    minWidth: 65,
    alignItems: 'center',
    ...LEGO_SHADOW,
  },
  categoryButtonActive: {
    backgroundColor: LEGO_COLORS.yellow,
    borderColor: LEGO_COLORS.black,
  },
  categoryText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontWeight: 'bold',
    color: LEGO_COLORS.darkGrey,
    fontSize: 13,
  },
  categoryTextActive: {
    color: LEGO_COLORS.black,
  },
  filterContainer: {
    backgroundColor: LEGO_COLORS.white,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
    ...LEGO_SHADOW,
  },
  filterButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: LEGO_COLORS.white,
    borderWidth: 2,
    borderColor: LEGO_COLORS.darkGrey,
    paddingHorizontal: 12,
  },
  filterButtonText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontWeight: 'bold',
    fontSize: 16,
    color: LEGO_COLORS.darkGrey,
  },
  filterButtonIcon: {
    backgroundColor: LEGO_COLORS.blue,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterIconText: {
    color: LEGO_COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  priceRangeContainer: {
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: LEGO_COLORS.lightGrey,
    paddingTop: 8,
    backgroundColor: LEGO_COLORS.white,
    borderRadius: 8,
    ...LEGO_SHADOW,
  },
  priceOption: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: LEGO_COLORS.lightGrey,
  },
  priceOptionText: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    color: LEGO_COLORS.darkGrey,
  },
  resetOption: {
    marginTop: 8,
    backgroundColor: LEGO_COLORS.lightGrey,
    borderRadius: 8,
    alignItems: 'center',
    paddingVertical: 14,
  },
  resetText: {
    color: LEGO_COLORS.red,
    fontWeight: 'bold',
    fontSize: 16,
  },
  activeFiltersContainer: {
    backgroundColor: LEGO_COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: LEGO_COLORS.yellow,
  },
  activeFiltersTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: LEGO_COLORS.darkGrey,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  activeFiltersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  activeFilterTag: {
    backgroundColor: LEGO_COLORS.lightGrey,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: LEGO_COLORS.darkGrey,
  },
  activeFilterText: {
    fontSize: 13,
    color: LEGO_COLORS.darkGrey,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  resetAllButton: {
    backgroundColor: LEGO_COLORS.red,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 8,
    ...LEGO_SHADOW,
  },
  resetAllText: {
    color: LEGO_COLORS.white,
    fontWeight: 'bold',
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  customPriceContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: LEGO_COLORS.lightGrey,
  },
  customPriceLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 8,
    color: LEGO_COLORS.darkGrey,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  customPriceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  customPriceInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LEGO_COLORS.lightGrey,
    borderRadius: 8,
    width: '45%',
    height: 46,
    paddingHorizontal: 8,
    borderWidth: 2,
    borderColor: LEGO_COLORS.darkGrey,
  },
  currencySymbol: {
    marginRight: 4,
    fontSize: 16,
    color: LEGO_COLORS.darkGrey,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontWeight: 'bold',
  },
  customPriceInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  customPriceToText: {
    color: LEGO_COLORS.darkGrey,
    paddingHorizontal: 8,
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  applyPriceButton: {
    backgroundColor: LEGO_COLORS.blue,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: LEGO_COLORS.darkGrey,
    ...LEGO_SHADOW,
  },
  applyPriceButtonText: {
    color: LEGO_COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  productsContainer: {
    padding: 16,
  },
  sectionTitleContainer: {
    backgroundColor: LEGO_COLORS.yellow,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: LEGO_COLORS.darkGrey,
    ...LEGO_SHADOW,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: LEGO_COLORS.black,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  productCount: {
    fontSize: 14,
    color: LEGO_COLORS.darkGrey,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    marginTop: 4,
    fontWeight: '500',
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  productCardWrapper: {
    width: '48%',
    height: 320,
    marginBottom: 16,
    // Add elevation and shadow to make cards look like LEGO bricks
    ...LEGO_SHADOW,
  },
  loadingContainer: {
    padding: 30,
    alignItems: 'center',
    backgroundColor: LEGO_COLORS.white,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: LEGO_COLORS.darkGrey,
    ...LEGO_SHADOW,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: LEGO_COLORS.darkGrey,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontWeight: '500',
  },
  errorContainer: {
    padding: 30,
    alignItems: 'center',
    backgroundColor: LEGO_COLORS.white,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: LEGO_COLORS.red,
    ...LEGO_SHADOW,
  },
  errorText: {
    padding: 20,
    color: LEGO_COLORS.red,
    fontSize: 16,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: LEGO_COLORS.blue,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: LEGO_COLORS.darkGrey,
    ...LEGO_SHADOW,
  },
  retryButtonText: {
    color: LEGO_COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  noResultsContainer: {
    padding: 30,
    alignItems: 'center',
    backgroundColor: LEGO_COLORS.white,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: LEGO_COLORS.yellow,
    ...LEGO_SHADOW,
  },
  noResultsText: {
    padding: 20,
    color: LEGO_COLORS.darkGrey,
    fontSize: 16,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  }
});