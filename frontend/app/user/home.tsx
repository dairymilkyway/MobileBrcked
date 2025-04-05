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
import { registerPushTokenAfterLogin } from '@/utils/notificationHelper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { 
  searchFilterProducts, 
  setSearchQuery as setStoreSearchQuery, 
  setCategoryFilter as setStoreCategoryFilter,
  setPriceRange as setStorePriceRange,
  clearFilters as clearStoreFilters
} from '@/redux/slices/productSlice';

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

export default function Home() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  
  // Get state from Redux store
  const { 
    items: products, 
    loading, 
    error, 
    searchQuery: storeSearchQuery,
    categoryFilter: storeCategoryFilter,
    minPrice: storeMinPrice,
    maxPrice: storeMaxPrice
  } = useAppSelector(state => state.products);
  
  // Local UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [currentCategory, setCurrentCategory] = useState<string | null>(null);
  const [minPrice, setMinPrice] = useState<number | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [showPriceFilter, setShowPriceFilter] = useState(false);
  const [filtersApplied, setFiltersApplied] = useState(false);
  const [customMinPrice, setCustomMinPrice] = useState<string>('');
  const [customMaxPrice, setCustomMaxPrice] = useState<string>('');

  // Sync local state with Redux state on mount
  useEffect(() => {
    setSearchQuery(storeSearchQuery || '');
    setCurrentCategory(storeCategoryFilter);
    setMinPrice(storeMinPrice);
    setMaxPrice(storeMaxPrice);
  }, [storeSearchQuery, storeCategoryFilter, storeMinPrice, storeMaxPrice]);

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

  const fetchProducts = async () => {
    console.log('fetchProducts called, resetting all filters');
    
    // Reset local state first
    setSearchQuery('');
    setCurrentCategory(null);
    setMinPrice(null);
    setMaxPrice(null);
    
    // Then update Redux store
    dispatch(clearStoreFilters());
    
    // Fetch all products using Redux action
    dispatch(searchFilterProducts({ limit: 50 }));
  };

  // Update the search handler to ensure it works with categories
  const handleSearch = async () => {
    console.log('Search initiated with:');
    console.log('- Search query:', searchQuery);
    console.log('- Category:', currentCategory);
    console.log('- Price range:', minPrice, maxPrice);
    
    // Update Redux store with current filters
    dispatch(setStoreSearchQuery(searchQuery));
    dispatch(setStoreCategoryFilter(currentCategory));
    dispatch(setStorePriceRange({ min: minPrice, max: maxPrice }));
    
    // Use Redux action to search with filters
    dispatch(searchFilterProducts({
      query: searchQuery,
      category: currentCategory,
      minPrice,
      maxPrice,
      limit: 50
    }));
  };

  // Modify the category filter function to maintain search query
  const handleCategoryFilter = (category: string) => {
    console.log(`Changing category filter: ${category}, current: ${currentCategory}`);
    
    // Toggle category selection - if already selected, clear it
    const newCategory = currentCategory === category ? null : category;
    setCurrentCategory(newCategory);
    
    // Update Redux store immediately
    dispatch(setStoreCategoryFilter(newCategory));
    
    // Execute search with current search query and updated category
    setTimeout(() => {
      dispatch(searchFilterProducts({
        query: searchQuery, // Keep the current search query
        category: newCategory,
        minPrice: minPrice,
        maxPrice: maxPrice,
        limit: 50
      }));
    }, 50);
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
    // Reset Redux store
    dispatch(clearStoreFilters());
    
    // Reset local state
    setSearchQuery('');
    setCurrentCategory(null);
    setMinPrice(null);
    setMaxPrice(null);
    
    // Fetch all products
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

  // Update the search bar component to display currently active filters
  return (
    <View style={styles.container}>
      <UserHeader section="Home" />
      <ScrollView style={styles.scrollView}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder={currentCategory ? `Search in ${currentCategory}s` : "Search LEGO sets"}
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
              onPress={() => {
                console.log('All categories selected');
                // Reset just the category filter but KEEP search query
                setCurrentCategory(null);
                dispatch(setStoreCategoryFilter(null));
                
                // Perform search with updated filters but keep search query
                dispatch(searchFilterProducts({
                  query: searchQuery, // Keep current search!
                  category: null,
                  minPrice: minPrice,
                  maxPrice: maxPrice,
                  limit: 50
                }));
              }}
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
            
            {!loading && !error && (
              <Text style={styles.productCount}>
                Showing {products.length} products
                {currentCategory ? ` in category "${currentCategory}"` : ''}
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