import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Image, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert,
  Modal,
  ScrollView,
  Dimensions,
  Platform,
  StatusBar,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { deleteProduct } from '../../../utils/api';
import { Product } from '../../../types/product';
import AuthCheck from '../../../components/AuthCheck';
import { useAppDispatch, useAppSelector } from '../../../redux/hooks';
import { fetchProducts, removeProduct, setCurrentPage, ProductsState } from '../../../redux/slices/productSlice';
import { RootState } from '../../../redux/store';

const { width, height } = Dimensions.get('window');
const isSmallScreen = width < 600;

// LEGO brand colors for professional theming
const LEGO_COLORS = {
  red: '#E3000B',
  yellow: '#FFD500',
  blue: '#006DB7',
  green: '#00AF4D',
  black: '#000000',
  darkGrey: '#333333',
  lightGrey: '#F2F2F2',
  white: '#FFFFFF',
};

// LEGO-inspired shadow for 3D effect
const LEGO_SHADOW = {
  shadowColor: LEGO_COLORS.black,
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.25,
  shadowRadius: 4,
  elevation: 6,
};

// LEGO stud design for decorative elements
const Stud = ({ color = LEGO_COLORS.red, size = 12 }) => (
  <View style={{
    width: size,
    height: size,
    borderRadius: size/2,
    backgroundColor: color,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
    marginHorizontal: 3,
  }} />
);

// Responsive sizing utility
const getResponsiveSize = (size, factor = 0.05) => {
  return Math.round(Math.min(width, height) * factor) + size;
};

const ProductsAdminScreen = () => {
  const dispatch = useAppDispatch();
  const { items: products, loading, error, totalPages, currentPage } = useAppSelector((state: RootState) => state.products as ProductsState);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const router = useRouter();

  const fetchProductsData = async (page = 1) => {
    try {
      setRefreshing(true);
      await dispatch(fetchProducts({ page, limit: 10 })).unwrap();
    } catch (error) {
      console.error('Error fetching products:', error);
      Alert.alert('Error', 'Failed to load products');
    } finally {
      setRefreshing(false);
    }
  };

  // Add useFocusEffect to refetch products whenever the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchProductsData(currentPage);
      return () => {
        // Cleanup function if needed
      };
    }, [currentPage])
  );

  // Keep the original useEffect for initial load
  useEffect(() => {
    fetchProductsData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchProductsData(1);
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete "${name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(removeProduct(id)).unwrap();
              Alert.alert('Success', `Product "${name}" deleted successfully`);
            } catch (error) {
              console.error('Error deleting product:', error);
              Alert.alert('Error', 'Failed to delete product');
            }
          },
        },
      ]
    );
  };

  const handleViewDetails = (product: Product) => {
    setSelectedProduct(product);
    setCurrentImageIndex(0);
    setModalVisible(true);
  };

  const navigateGallery = (direction: 'next' | 'prev') => {
    if (!selectedProduct || !selectedProduct.imageURL.length) return;
    
    if (direction === 'next') {
      setCurrentImageIndex((prev) => 
        prev === selectedProduct.imageURL.length - 1 ? 0 : prev + 1
      );
    } else {
      setCurrentImageIndex((prev) => 
        prev === 0 ? selectedProduct.imageURL.length - 1 : prev - 1
      );
    }
  };

  const handlePageChange = (page: number) => {
    dispatch(setCurrentPage(page));
    fetchProductsData(page);
  };

  // Show error message if there was an error
  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AuthCheck requiredRole="admin" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={() => fetchProductsData(currentPage)}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const renderProductItem = ({ item }: { item: Product }) => {
    const imageUri = item.imageURL && item.imageURL.length > 0 
      ? item.imageURL[0].startsWith('http') 
        ? item.imageURL[0] 
        : `http://192.168.0.251:9000${item.imageURL[0]}`
      : 'https://via.placeholder.com/300';

    return (
      <View style={styles.productItem}>
        <View style={styles.productImageContainer}>
          <Image 
            source={{ uri: imageUri }} 
            style={styles.productImage} 
          />
        </View>
        <View style={styles.productDetails}>
          <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.productPrice}>₱{item.price.toFixed(2)}</Text>
          <View style={styles.stockContainer}>
            <Text style={styles.productStock}>Stock: {item.stock}</Text>
            {item.stock < 10 && (
              <View style={styles.lowStockBadge}>
                <Text style={styles.lowStockText}>Low Stock</Text>
              </View>
            )}
          </View>
          <TouchableOpacity 
            style={styles.viewDetailsButton}
            onPress={() => handleViewDetails(item)}
          >
            <Text style={styles.viewDetailsText}>View Details</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.editButton]}
            onPress={() => router.push({
              pathname: '/admin/products/[id]',
              params: { id: item._id }
            })}
          >
            <Ionicons name="create-outline" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteProduct(item._id, item.name)}
          >
            <Ionicons name="trash-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderDetailsModal = () => {
    if (!selectedProduct) return null;
    
    // Format imageUrl properly
    const getFormattedImageUrl = (url: string) => {
      return url.startsWith('http') ? url : `http://192.168.0.251:9000${url}`;
    };
    
    const currentImageUrl = selectedProduct.imageURL && selectedProduct.imageURL.length > 0 
      ? getFormattedImageUrl(selectedProduct.imageURL[currentImageIndex])
      : 'https://via.placeholder.com/300';

    return (
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitle}>
                <View style={styles.logoStuds}>
                  {[...Array(3)].map((_, i) => (
                    <Stud key={i} color={LEGO_COLORS.yellow} size={14} />
                  ))}
                </View>
                <Text style={styles.modalTitle}>Product Details</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScrollView}>
              {/* Image Gallery */}
              <View style={styles.galleryContainer}>
                <Image 
                  source={{ uri: currentImageUrl }} 
                  style={styles.galleryImage}
                />
                
                {selectedProduct.imageURL.length > 1 && (
                  <View style={styles.galleryControls}>
                    <TouchableOpacity
                      style={styles.galleryButton}
                      onPress={() => navigateGallery('prev')}
                    >
                      <Ionicons name="chevron-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    
                    <Text style={styles.galleryCounter}>
                      {currentImageIndex + 1} / {selectedProduct.imageURL.length}
                    </Text>
                    
                    <TouchableOpacity
                      style={styles.galleryButton}
                      onPress={() => navigateGallery('next')}
                    >
                      <Ionicons name="chevron-forward" size={24} color="#fff" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
              
              {/* Product Information */}
              <View style={styles.detailsContainer}>
                <Text style={styles.detailsName}>{selectedProduct.name}</Text>
                <Text style={styles.detailsPrice}>₱{selectedProduct.price.toFixed(2)}</Text>
                
                <View style={styles.detailsRow}>
                  <Text style={styles.detailsLabel}>Category:</Text>
                  <Text style={styles.detailsValue}>{selectedProduct.category}</Text>
                </View>
                
                <View style={styles.detailsRow}>
                  <Text style={styles.detailsLabel}>Stock:</Text>
                  <Text style={styles.detailsValue}>{selectedProduct.stock}</Text>
                </View>
                
                <View style={styles.detailsRow}>
                  <Text style={styles.detailsLabel}>Pieces:</Text>
                  <Text style={styles.detailsValue}>{selectedProduct.pieces}</Text>
                </View>
                
                <Text style={styles.detailsLabel}>Description:</Text>
                <Text style={styles.detailsDescription}>{selectedProduct.description}</Text>
              </View>
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.editButton]}
                onPress={() => {
                  setModalVisible(false);
                  router.push({
                    pathname: '/admin/products/[id]',
                    params: { id: selectedProduct._id }
                  });
                }}
              >
                <Ionicons name="create-outline" size={20} color="#fff" />
                <Text style={styles.modalButtonText}>Edit Product</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.deleteModalButton]}
                onPress={() => {
                  setModalVisible(false);
                  handleDeleteProduct(selectedProduct._id, selectedProduct.name);
                }}
              >
                <Ionicons name="trash-outline" size={20} color="#fff" />
                <Text style={styles.modalButtonText}>Delete Product</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={LEGO_COLORS.red} />
          <Text style={styles.loadingText}>Building product list...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={LEGO_COLORS.red} />
      <View style={styles.container}>
        <AuthCheck requiredRole="admin" />
        
        <View style={styles.pageHeader}>
          <View style={styles.logoContainer}>
            <View style={styles.logoStuds}>
              {[...Array(4)].map((_, i) => (
                <Stud key={i} color={LEGO_COLORS.yellow} size={14} />
              ))}
            </View>
            <Text style={styles.pageHeaderTitle}>Manage Products</Text>
          </View>
          
          <Text style={styles.pageHeaderSubtitle}>Manage your LEGO product inventory</Text>
          
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => router.push('/admin/products/create')}
          >
            <Ionicons name="add" size={24} color="#fff" />
            <Text style={styles.addButtonText}>Add Product</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={products}
          renderItem={renderProductItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={60} color="#ccc" />
              <Text style={styles.emptyText}>No products found</Text>
              <TouchableOpacity 
                style={styles.addEmptyButton}
                onPress={() => router.push('/admin/products/create')}
              >
                <Text style={styles.addButtonText}>Add your first product</Text>
              </TouchableOpacity>
            </View>
          }
          ListFooterComponent={
            totalPages > 1 ? (
              <View style={styles.pagination}>
                <TouchableOpacity 
                  style={[styles.pageButton, currentPage === 1 && styles.disabledButton]}
                  onPress={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <Ionicons name="chevron-back" size={20} color={currentPage === 1 ? '#ccc' : '#333'} />
                </TouchableOpacity>
                <Text style={styles.pageText}>
                  Page {currentPage} of {totalPages}
                </Text>
                <TouchableOpacity 
                  style={[styles.pageButton, currentPage === totalPages && styles.disabledButton]}
                  onPress={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <Ionicons name="chevron-forward" size={20} color={currentPage === totalPages ? '#ccc' : '#333'} />
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
        
        {renderDetailsModal()}
        
        {/* LEGO footer decoration */}
        <View style={styles.legoFooter}>
          {[...Array(8)].map((_, i) => (
            <Stud key={i} color={i % 2 === 0 ? LEGO_COLORS.red : LEGO_COLORS.blue} size={16} />
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: LEGO_COLORS.red, // LEGO red for consistent look in notch area
  },
  container: {
    flex: 1,
    backgroundColor: LEGO_COLORS.lightGrey,
    padding: 16,
  },
  pageHeader: {
    flexDirection: 'column',
    marginBottom: 24,
    borderBottomWidth: 4,
    borderBottomColor: LEGO_COLORS.yellow,
    paddingBottom: 16,
    marginTop: 30,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  logoStuds: {
    flexDirection: 'row',
    marginRight: 10,
  },
  pageHeaderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: LEGO_COLORS.black,
    ...Platform.select({
      ios: {
        fontFamily: 'System',
      },
      android: {
        fontFamily: 'sans-serif-black',
      }
    })
  },
  pageHeaderSubtitle: {
    fontSize: 16,
    color: LEGO_COLORS.darkGrey,
    marginBottom: 16,
  },
  addButton: {
    flexDirection: 'row',
    backgroundColor: LEGO_COLORS.green,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: LEGO_COLORS.black,
    width: '100%',
    ...LEGO_SHADOW
  },
  addButtonText: {
    color: LEGO_COLORS.white,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  addEmptyButton: {
    flexDirection: 'row',
    backgroundColor: LEGO_COLORS.green,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    borderWidth: 1.5,
    borderColor: LEGO_COLORS.black,
    ...LEGO_SHADOW
  },
  list: {
    paddingBottom: 16,
  },
  productItem: {
    flexDirection: 'row',
    backgroundColor: LEGO_COLORS.white,
    borderRadius: 8,
    marginBottom: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: LEGO_COLORS.darkGrey,
    ...LEGO_SHADOW
  },
  productImageContainer: {
    borderRadius: 8,
    borderWidth: 2,
    borderColor: LEGO_COLORS.darkGrey,
    overflow: 'hidden',
    width: 90,
    height: 90,
  },
  productImage: {
    width: 90,
    height: 90,
    backgroundColor: LEGO_COLORS.lightGrey,
  },
  productDetails: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: LEGO_COLORS.darkGrey,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: LEGO_COLORS.red,
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productStock: {
    fontSize: 14,
    color: LEGO_COLORS.darkGrey,
  },
  lowStockBadge: {
    backgroundColor: LEGO_COLORS.red,
    borderRadius: 12,
    paddingVertical: 2,
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  lowStockText: {
    color: LEGO_COLORS.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  viewDetailsButton: {
    marginTop: 5,
    backgroundColor: LEGO_COLORS.blue,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  viewDetailsText: {
    fontSize: 12,
    color: LEGO_COLORS.white,
    fontWeight: '500',
  },
  actionsContainer: {
    justifyContent: 'space-around',
    marginLeft: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
    borderWidth: 1.5,
    borderColor: LEGO_COLORS.black,
    ...LEGO_SHADOW
  },
  editButton: {
    backgroundColor: LEGO_COLORS.blue,
  },
  deleteButton: {
    backgroundColor: LEGO_COLORS.red,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: LEGO_COLORS.lightGrey,
  },
  loadingText: {
    marginTop: 12,
    color: LEGO_COLORS.darkGrey,
    fontSize: 16,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    color: LEGO_COLORS.darkGrey,
    marginVertical: 16,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  pageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: LEGO_COLORS.white,
    borderWidth: 1.5,
    borderColor: LEGO_COLORS.darkGrey,
    ...LEGO_SHADOW
  },
  disabledButton: {
    backgroundColor: LEGO_COLORS.lightGrey,
    borderColor: '#ccc',
    shadowOpacity: 0.1,
  },
  pageText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: LEGO_COLORS.darkGrey,
    fontWeight: 'bold',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width * 0.92,
    maxHeight: '85%',
    backgroundColor: LEGO_COLORS.white,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: LEGO_COLORS.darkGrey,
    ...LEGO_SHADOW
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 3,
    borderBottomColor: LEGO_COLORS.yellow,
    backgroundColor: LEGO_COLORS.lightGrey,
  },
  modalHeaderTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: LEGO_COLORS.darkGrey,
  },
  modalScrollView: {
    maxHeight: '80%',
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 3,
    borderTopColor: LEGO_COLORS.lightGrey,
    backgroundColor: LEGO_COLORS.lightGrey,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
    borderWidth: 1.5,
    borderColor: LEGO_COLORS.black,
    ...LEGO_SHADOW
  },
  deleteModalButton: {
    backgroundColor: LEGO_COLORS.red,
  },
  modalButtonText: {
    color: LEGO_COLORS.white,
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 14,
  },
  // Gallery styles
  galleryContainer: {
    position: 'relative',
    width: '100%',
    height: width,
    backgroundColor: LEGO_COLORS.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryImage: {
    width: width,
    height: width,
    resizeMode: 'contain',
  },
  galleryControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  galleryButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  galleryCounter: {
    color: LEGO_COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  // Product details styles
  detailsContainer: {
    padding: 20,
    backgroundColor: LEGO_COLORS.white,
  },
  detailsName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: LEGO_COLORS.darkGrey,
    marginBottom: 10,
  },
  detailsPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: LEGO_COLORS.red,
    marginBottom: 20,
  },
  detailsRow: {
    flexDirection: 'row',
    marginBottom: 12,
    backgroundColor: LEGO_COLORS.lightGrey,
    padding: 8,
    borderRadius: 8,
  },
  detailsLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: LEGO_COLORS.darkGrey,
    marginRight: 8,
    marginBottom: 4,
  },
  detailsValue: {
    fontSize: 16,
    color: LEGO_COLORS.darkGrey,
  },
  detailsDescription: {
    fontSize: 15,
    color: LEGO_COLORS.darkGrey,
    lineHeight: 24,
    backgroundColor: LEGO_COLORS.lightGrey,
    padding: 15,
    borderRadius: 8,
    marginTop: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: LEGO_COLORS.lightGrey,
  },
  errorText: {
    fontSize: 18,
    color: LEGO_COLORS.red,
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: LEGO_COLORS.blue,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: LEGO_COLORS.black,
    ...LEGO_SHADOW
  },
  retryButtonText: {
    color: LEGO_COLORS.white,
    fontWeight: 'bold',
  },
  legoFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 20,
  },
});

export default ProductsAdminScreen;