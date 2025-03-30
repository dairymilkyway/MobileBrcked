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

// API Configuration
//const API_BASE_URL = 'http://10.0.2.2:9000/api/products'; // For Android emulator pointing to localhost
// const API_BASE_URL = 'http://localhost:9000/api/products'; // For iOS simulator
const API_BASE_URL = 'http://192.168.1.143:9000/api/products'; // For physical device - update with your IP

// Request timeout in milliseconds
const FETCH_TIMEOUT = 10000;

interface Product {
  _id: string;
  name: string;
  price: number;
  image: string;
  pieces: number;
  category: string;
  description: string;
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

  useEffect(() => {
    fetchProducts();
  }, []);

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
      
      console.log(`Fetching products from: ${API_BASE_URL}`);
      const response = await fetchWithTimeout(API_BASE_URL);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Server responded with status: ${response.status}`
        );
      }
      
      const responseData: ApiResponse = await response.json();
      
      if (responseData.success) {
        setProducts(responseData.data);
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
    if (!searchQuery.trim()) {
      return fetchProducts();
    }
    
    try {
      setLoading(true);
      setCurrentCategory(null);
      
      // Use proper endpoint for search
      const apiUrl = `${API_BASE_URL}/search/${encodeURIComponent(searchQuery)}`;
      console.log(`Searching products from: ${apiUrl}`);
      
      const response = await fetchWithTimeout(apiUrl);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Server responded with status: ${response.status}`
        );
      }
      
      const responseData: ApiResponse = await response.json();
      
      if (responseData.success) {
        setProducts(responseData.data);
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

  const handleCategoryFilter = async (category: string) => {
    try {
      setLoading(true);
      setCurrentCategory(category);
      
      // Use proper endpoint for category filtering
      const apiUrl = `${API_BASE_URL}/category/${category}`;
      console.log(`Fetching ${category} products from: ${apiUrl}`);
      
      const response = await fetchWithTimeout(apiUrl);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Server responded with status: ${response.status}`
        );
      }
      
      const responseData: ApiResponse = await response.json();
      
      if (responseData.success) {
        setProducts(responseData.data);
        setError(null);
      } else {
        throw new Error(responseData.message || `Failed to fetch ${category} products`);
      }
    } catch (err: any) {
      console.error(`Error fetching ${category} products:`, err);
      if (err.name === 'AbortError') {
        setError(`Request for ${category} products timed out. Please try again.`);
      } else if (err.message.includes('Network request failed')) {
        setError('Network error. Please check your connection and server status.');
      } else {
        setError(`Error loading ${category} products: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
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
          <TextInput
            style={styles.searchInput}
            placeholder="Search LEGO sets"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity style={styles.resetButton} onPress={handleResetSearch}>
              <IconSymbol name="xmark.circle.fill" size={20} color="#000000" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <IconSymbol name="magnifyingglass" size={22} color="#FFFFFF" />
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
        </View>

        {/* Category Filters */}
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
            ]}>Minifigures</Text>
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

        {/* Products Container */}
        <View style={styles.productsContainer}>
          <Text style={styles.sectionTitle}>
            {currentCategory ? `${currentCategory}s` : 'All Products'}
            {searchQuery ? ` matching "${searchQuery}"` : ''}
          </Text>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#E3000B" />
              <Text style={styles.loadingText}>Loading products...</Text>
            </View>
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : products.length === 0 ? (
            <Text style={styles.noResultsText}>No products found. Try a different search.</Text>
          ) : (
            <View style={styles.productGrid}>
              {products.map((product) => (
                <ProductCard 
                  key={product._id}
                  id={product._id}
                  name={product.name}
                  price={product.price}
                  image={product.image}
                  pieces={product.pieces}
                  onPress={() => handleProductPress(product._id)}
                />
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
    backgroundColor: '#f8f8f8',
  },
  scrollView: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
    marginRight: 10,
    fontFamily: Platform.OS === 'ios' ? 'Futura-Medium' : 'sans-serif-medium',
  },
  searchButton: {
    backgroundColor: '#E3000B',
    borderRadius: 8,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetButton: {
    padding: 5,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
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
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Futura-Bold' : 'sans-serif-condensed',
  },
  bannerSubtitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Futura-Medium' : 'sans-serif-medium',
  },
  categoryContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  categoryButtonActive: {
    backgroundColor: '#E3000B',
  },
  categoryText: {
    fontFamily: Platform.OS === 'ios' ? 'Futura-Medium' : 'sans-serif-medium',
    color: '#333333',
  },
  categoryTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  productsContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#E3000B',
    fontFamily: Platform.OS === 'ios' ? 'Futura-Bold' : 'sans-serif-condensed',
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    fontFamily: Platform.OS === 'ios' ? 'Futura-Medium' : 'sans-serif-medium',
  },
  errorText: {
    padding: 20,
    color: '#E3000B',
    fontSize: 16,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Futura-Medium' : 'sans-serif-medium',
  },
  noResultsText: {
    padding: 20,
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Futura-Medium' : 'sans-serif-medium',
  },
  productCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: 180,
  },
  productName: {
    padding: 8,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'Futura-Medium' : 'sans-serif-medium',
  },
  productDetailsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  productPrice: {
    color: '#E3000B',
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Futura-Bold' : 'sans-serif-condensed',
  },
  productPieces: {
    color: '#666',
    fontFamily: Platform.OS === 'ios' ? 'Futura-Medium' : 'sans-serif-medium',
  }
});