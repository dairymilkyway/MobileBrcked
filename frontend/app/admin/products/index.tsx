import React, { useEffect, useState } from 'react';
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
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getProducts, deleteProduct } from '../../../utils/api';
import { Product } from '../../../types/product';
import AuthCheck from '../../../components/AuthCheck';

const { width } = Dimensions.get('window');

const ProductsAdminScreen = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const router = useRouter();

  const fetchProducts = async (page = 1) => {
    try {
      setLoading(true);
      const result = await getProducts(page, 10);
      setProducts(result.data);
      setTotalPages(result.totalPages);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error fetching products:', error);
      Alert.alert('Error', 'Failed to load products');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchProducts(1);
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
              setLoading(true);
              await deleteProduct(id);
              // After deleting, refresh the list
              fetchProducts(currentPage);
              Alert.alert('Success', `Product "${name}" deleted successfully`);
            } catch (error) {
              console.error('Error deleting product:', error);
              Alert.alert('Error', 'Failed to delete product');
            } finally {
              setLoading(false);
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

  useEffect(() => {
    fetchProducts();
  }, []);

  const renderProductItem = ({ item }: { item: Product }) => {
    const imageUri = item.imageURL && item.imageURL.length > 0 
      ? item.imageURL[0].startsWith('http') 
        ? item.imageURL[0] 
        : `http://192.168.0.251:9000${item.imageURL[0]}`
      : 'https://via.placeholder.com/300';

    return (
      <View style={styles.productItem}>
        <Image 
          source={{ uri: imageUri }} 
          style={styles.productImage} 
        />
        <View style={styles.productDetails}>
          <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.productPrice}>₱{item.price.toFixed(2)}</Text>
          <Text style={styles.productStock}>Stock: {item.stock}</Text>
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
              <Text style={styles.modalTitle}>Product Details</Text>
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E3000B" />
        <Text style={styles.loadingText}>Loading products...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AuthCheck requiredRole="admin" />
      
      <View style={styles.header}>
        <Text style={styles.title}>Manage Products</Text>
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
              style={styles.addButton}
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
                onPress={() => currentPage > 1 && fetchProducts(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <Ionicons name="chevron-back" size={20} color={currentPage === 1 ? '#ccc' : '#333'} />
              </TouchableOpacity>
              <Text style={styles.pageText}>
                Page {currentPage} of {totalPages}
              </Text>
              <TouchableOpacity 
                style={[styles.pageButton, currentPage === totalPages && styles.disabledButton]}
                onPress={() => currentPage < totalPages && fetchProducts(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <Ionicons name="chevron-forward" size={20} color={currentPage === totalPages ? '#ccc' : '#333'} />
              </TouchableOpacity>
            </View>
          ) : null
        }
      />
      
      {renderDetailsModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    flexDirection: 'row',
    backgroundColor: '#2ecc71',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  list: {
    paddingBottom: 16,
  },
  productItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 12,
    padding: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  productImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  productDetails: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E3000B',
  },
  productStock: {
    fontSize: 14,
    color: '#666',
  },
  viewDetailsButton: {
    marginTop: 5,
    backgroundColor: '#f0f0f0',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  viewDetailsText: {
    fontSize: 12,
    color: '#555',
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
  },
  editButton: {
    backgroundColor: '#3498db',
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
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
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  disabledButton: {
    backgroundColor: '#f9f9f9',
    borderColor: '#eee',
  },
  pageText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#666',
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
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#f8f8f8',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalScrollView: {
    maxHeight: '80%',
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#f8f8f8',
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
  },
  deleteModalButton: {
    backgroundColor: '#e74c3c',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 14,
  },
  // Gallery styles
  galleryContainer: {
    position: 'relative',
    width: '100%',
    height: width,
    backgroundColor: '#000',
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
  },
  galleryCounter: {
    color: '#fff',
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
    backgroundColor: '#fff',
  },
  detailsName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  detailsPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E3000B',
    marginBottom: 20,
  },
  detailsRow: {
    flexDirection: 'row',
    marginBottom: 12,
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderRadius: 8,
  },
  detailsLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#555',
    marginRight: 8,
    marginBottom: 4,
  },
  detailsValue: {
    fontSize: 16,
    color: '#333',
  },
  detailsDescription: {
    fontSize: 15,
    color: '#666',
    lineHeight: 24,
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
    marginTop: 8,
  },
});

export default ProductsAdminScreen; 