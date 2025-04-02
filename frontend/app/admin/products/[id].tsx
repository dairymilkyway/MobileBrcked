import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Dropdown } from 'react-native-element-dropdown';
import { deleteProduct } from '../../../utils/api';
import { API_BASE_URL } from '../../../env';
import { Product, ProductFormData } from '../../../types/product';
import AuthCheck from '../../../components/AuthCheck';
import { useAppDispatch, useAppSelector } from '../../../redux/hooks';
import { fetchProductById, editProduct, removeProduct, clearSelectedProduct, ProductsState } from '../../../redux/slices/productSlice';
import { RootState } from '../../../redux/store';

// Category data for dropdown
const categoryData = [
  { label: 'Minifigure', value: 'Minifigure' },
  { label: 'Set', value: 'Set' },
  { label: 'Piece', value: 'Piece' },
];

const EditProductScreen = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const { selectedProduct, loading } = useAppSelector((state: RootState) => state.products as ProductsState);
  const [product, setProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isFocus, setIsFocus] = useState(false);
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    price: '',
    stock: '',
    description: '',
    category: 'Minifigure',
    pieces: '1',
    images: [],
    removeImages: false,
  });

  useEffect(() => {
    if (id) {
      dispatch(fetchProductById(id));
    }
    
    // Clear selected product when component unmounts
    return () => {
      dispatch(clearSelectedProduct());
    };
  }, [id, dispatch]);

  useEffect(() => {
    if (selectedProduct) {
      // Set local product state from Redux state
      setProduct(selectedProduct);
      
      // Initialize form data when product data is loaded
      setFormData({
        name: selectedProduct.name,
        price: selectedProduct.price.toString(),
        stock: selectedProduct.stock.toString(),
        description: selectedProduct.description,
        category: selectedProduct.category,
        pieces: selectedProduct.pieces.toString(),
        images: [],
        removeImages: false,
      });
    }
  }, [selectedProduct]);

  const handleInputChange = (field: keyof ProductFormData, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleCategoryChange = (item: { label: string; value: string }) => {
    setFormData({
      ...formData,
      category: item.value as 'Minifigure' | 'Set' | 'Piece'
    });
    setIsFocus(false);
  };

  const handlePickImages = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.7,
        aspect: [4, 3],
        allowsEditing: false,
      });

      if (!result.canceled && result.assets.length > 0) {
        const currentCount = formData.images ? formData.images.length : 0;
        const existingImagesCount = formData.removeImages ? 0 : (product?.imageURL?.length || 0);
        const totalCount = currentCount + existingImagesCount + result.assets.length;
        
        if (totalCount > 5) {
          Alert.alert('Too many images', 'You can only have up to 5 images total');
          return;
        }

        setFormData({
          ...formData,
          images: [...(formData.images || []), ...result.assets],
        });
      }
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert('Error', 'Failed to pick images');
    }
  };

  const handleTakePicture = async () => {
    try {
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      
      if (cameraPermission.status !== 'granted') {
        Alert.alert('Permission Required', 'Camera access is needed to take pictures');
        return;
      }
      
      const currentCount = formData.images ? formData.images.length : 0;
      const existingImagesCount = formData.removeImages ? 0 : (product?.imageURL?.length || 0);
      const totalCount = currentCount + existingImagesCount;
      
      if (totalCount >= 5) {
        Alert.alert('Too many images', 'You can only have up to 5 images total');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        aspect: [4, 3],
        allowsEditing: true,
      });

      if (!result.canceled && result.assets.length > 0) {
        setFormData({
          ...formData,
          images: [...(formData.images || []), ...result.assets],
        });
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to take picture');
    }
  };

  const handleRemoveCurrentImage = (index: number) => {
    if (!product) return;
    
    // Create a new array of images without this specific image
    const updatedImageUrls = [...product.imageURL].filter((_, idx) => idx !== index);
    
    // Create a copy of the product with updated imageURL for local state rendering
    const updatedProduct = {
      ...product,
      imageURL: updatedImageUrls
    };
    
    // Update the local product state 
    // Don't dispatch fetchProductById as it reloads the product from server
    
    // Instead of reloading the whole product, just update our local state
    setProduct(updatedProduct);
    
    // Update formData to include the updated existing images
    setFormData({
      ...formData,
      // We need to pass these existing images to the backend
      existingImages: updatedImageUrls
    });
    
    console.log('Removed image at index', index);
    console.log('Remaining images:', updatedImageUrls);
  };

  const handleToggleExistingImages = () => {
    if (formData.removeImages) {
      // If we're toggling back to keep images, unset the removeImages flag
      setFormData({ 
        ...formData, 
        removeImages: false,
        existingImages: undefined 
      });
    } else {
      // If we're toggling to remove all images, set existingImages to empty array
      setFormData({ 
        ...formData, 
        removeImages: true,
        existingImages: []
      });
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...(formData.images || [])];
    newImages.splice(index, 1);
    setFormData({ ...formData, images: newImages });
    console.log('Removed new image at index', index);
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert('Validation Error', 'Product name is required');
      return false;
    }
    
    if (!formData.price.trim() || isNaN(Number(formData.price)) || Number(formData.price) <= 0) {
      Alert.alert('Validation Error', 'Product price must be a positive number');
      return false;
    }
    
    if (!formData.stock.trim() || isNaN(Number(formData.stock)) || Number(formData.stock) < 0) {
      Alert.alert('Validation Error', 'Product stock must be a non-negative number');
      return false;
    }
    
    if (!formData.description.trim()) {
      Alert.alert('Validation Error', 'Product description is required');
      return false;
    }
    
    if (!formData.pieces.trim() || isNaN(Number(formData.pieces)) || Number(formData.pieces) <= 0) {
      Alert.alert('Validation Error', 'Number of pieces must be a positive number');
      return false;
    }
    
    return true;
  };

  const handleUpdate = async () => {
    if (!validateForm() || !id) return;
    
    try {
      setSaving(true);
      await dispatch(editProduct({ id, productData: formData })).unwrap();
      Alert.alert('Success', 'Product updated successfully', [
        { text: 'OK', onPress: () => router.push('/admin/products') }
      ]);
    } catch (error) {
      console.error('Error updating product:', error);
      Alert.alert('Error', typeof error === 'string' ? error : 'Failed to update product');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this product? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!id) return;
            
            try {
              setDeleting(true);
              await dispatch(removeProduct(id)).unwrap();
              Alert.alert('Success', 'Product deleted successfully', [
                { text: 'OK', onPress: () => router.push('/admin/products') }
              ]);
            } catch (error) {
              console.error('Error deleting product:', error);
              Alert.alert('Error', typeof error === 'string' ? error : 'Failed to delete product');
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E3000B" />
        <Text style={styles.loadingText}>Loading product...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <AuthCheck requiredRole="admin" />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView style={styles.scrollView}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Edit Product</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.formContainer}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Product Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(value) => handleInputChange('name', value)}
                placeholder="Enter product name"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Price (₱) *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.price}
                  onChangeText={(value) => handleInputChange('price', value)}
                  placeholder="0.00"
                  placeholderTextColor="#999"
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>Stock *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.stock}
                  onChangeText={(value) => handleInputChange('stock', value)}
                  placeholder="0"
                  placeholderTextColor="#999"
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Category *</Text>
              <Dropdown
                style={[styles.dropdown, isFocus && { borderColor: '#3498db' }]}
                placeholderStyle={styles.placeholderStyle}
                selectedTextStyle={styles.selectedTextStyle}
                iconStyle={styles.iconStyle}
                data={categoryData}
                maxHeight={300}
                labelField="label"
                valueField="value"
                placeholder={!isFocus ? 'Select category' : '...'}
                value={formData.category}
                onFocus={() => setIsFocus(true)}
                onBlur={() => setIsFocus(false)}
                onChange={handleCategoryChange}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Number of Pieces *</Text>
              <TextInput
                style={styles.input}
                value={formData.pieces}
                onChangeText={(value) => handleInputChange('pieces', value)}
                placeholder="1"
                placeholderTextColor="#999"
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(value) => handleInputChange('description', value)}
                placeholder="Enter product description"
                placeholderTextColor="#999"
                multiline
                textAlignVertical="top"
                numberOfLines={4}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Product Images (Max: 5)</Text>
              <Text style={styles.imageNote}>Images are stored on Cloudinary for secure storage and fast delivery</Text>
              
              {/* Current product images */}
              {product && product.imageURL && product.imageURL.length > 0 && !formData.removeImages && (
                <View style={styles.currentImagesContainer}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Current Images</Text>
                    <TouchableOpacity
                      style={styles.toggleButton}
                      onPress={handleToggleExistingImages}
                    >
                      <Text style={styles.toggleButtonText}>Remove All</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <ScrollView horizontal style={styles.imagesScroll}>
                    {product.imageURL.map((imageUrl: string, index: number) => (
                      <View key={index} style={styles.imageContainer}>
                        <Image 
                          source={{ 
                            uri: imageUrl.startsWith('/uploads') 
                              ? `${API_BASE_URL}${imageUrl}` 
                              : imageUrl 
                          }} 
                          style={styles.productImage} 
                        />
                        <TouchableOpacity
                          style={styles.removeImageButton}
                          onPress={() => handleRemoveCurrentImage(index)}
                        >
                          <Ionicons name="close-circle" size={24} color="#e74c3c" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}
              
              {/* When all current images are set to be removed */}
              {formData.removeImages && (
                <View style={styles.removedImagesNotice}>
                  <Text style={styles.removedImagesText}>All current images will be removed</Text>
                  <TouchableOpacity
                    style={styles.undoButton}
                    onPress={handleToggleExistingImages}
                  >
                    <Text style={styles.undoButtonText}>Keep Current Images</Text>
                  </TouchableOpacity>
                </View>
              )}
              
              {/* Add new images section */}
              <View style={styles.newImagesSection}>
                <Text style={styles.sectionTitle}>Add New Images</Text>
                
                <View style={styles.uploadButtonsContainer}>
                  <TouchableOpacity 
                    style={styles.uploadButton}
                    onPress={handlePickImages}
                  >
                    <Ionicons name="image-outline" size={24} color="#fff" />
                    <Text style={styles.uploadButtonText}>Choose Images</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.uploadButton}
                    onPress={handleTakePicture}
                  >
                    <Ionicons name="camera-outline" size={24} color="#fff" />
                    <Text style={styles.uploadButtonText}>Take Photo</Text>
                  </TouchableOpacity>
                </View>
                
                {/* Show selected new images */}
                {formData.images && formData.images.length > 0 && (
                  <View style={styles.selectedImagesContainer}>
                    <Text style={styles.selectedImagesText}>
                      {formData.images.length} new {formData.images.length === 1 ? 'image' : 'images'} selected
                    </Text>
                    <ScrollView horizontal>
                      {formData.images.map((image, index) => (
                        <View key={index} style={styles.imageContainer}>
                          <Image 
                            source={{ uri: image.uri }} 
                            style={styles.previewImage} 
                          />
                          <TouchableOpacity
                            style={styles.removeImageButton}
                            onPress={() => removeImage(index)}
                          >
                            <Ionicons name="close-circle" size={24} color="#e74c3c" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            </View>

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleUpdate}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={20} color="#fff" />
                  <Text style={styles.submitButtonText}>Update Product</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  deleteButton: {
    backgroundColor: '#E3000B',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formContainer: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#555',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    minHeight: 100,
  },
  dropdown: {
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
  },
  placeholderStyle: {
    fontSize: 16,
    color: '#999',
  },
  selectedTextStyle: {
    fontSize: 16,
    color: '#333',
  },
  iconStyle: {
    width: 20,
    height: 20,
  },
  dropdownIcon: {
    marginRight: 10,
  },
  imagesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  oldToggleButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  toggleButtonActive: {
    backgroundColor: '#E3000B',
  },
  toggleText: {
    fontSize: 12,
    color: '#666',
  },
  toggleTextActive: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  currentImagesScroll: {
    marginBottom: 16,
  },
  noImagesText: {
    color: '#999',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  imagePreview: {
    width: 100,
    height: 100,
    margin: 5,
    position: 'relative',
  },
  imageThumb: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  removeImageBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    zIndex: 10,
  },
  removeIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E3000B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  imageActions: {
    width: 100,
    height: 100,
    margin: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3498db',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginVertical: 4,
    width: '100%',
  },
  galleryBtn: {
    backgroundColor: '#3498db',
  },
  cameraBtn: {
    backgroundColor: '#2ecc71',
  },
  imageBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 4,
    fontSize: 12,
  },
  imagesHelpText: {
    fontSize: 12,
    color: '#777',
    marginTop: 8,
  },
  submitButton: {
    backgroundColor: '#E3000B',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    flexDirection: 'row',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
    fontSize: 16,
  },
  imageNote: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
    fontStyle: 'italic',
  },
  
  currentImagesContainer: {
    marginBottom: 20,
  },
  
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  
  toggleButton: {
    backgroundColor: '#f8d7da',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  
  toggleButtonText: {
    color: '#721c24',
    fontSize: 12,
    fontWeight: '500',
  },
  
  imagesScroll: {
    flexDirection: 'row',
  },
  
  removedImagesNotice: {
    backgroundColor: '#f8d7da',
    padding: 12,
    borderRadius: 4,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  removedImagesText: {
    color: '#721c24',
    fontSize: 14,
    flex: 1,
  },
  
  undoButton: {
    backgroundColor: '#e2e3e5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  
  undoButtonText: {
    color: '#383d41',
    fontSize: 12,
    fontWeight: '500',
  },
  
  newImagesSection: {
    marginTop: 10,
  },
  
  uploadButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3498db',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginVertical: 4,
    width: '48%',
  },
  
  uploadButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 4,
    fontSize: 12,
  },
  
  selectedImagesContainer: {
    marginTop: 10,
    marginBottom: 10,
  },
  
  selectedImagesText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#555',
  },
  
  imageContainer: {
    width: 100,
    height: 100,
    margin: 5,
    position: 'relative',
  },
  
  productImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  
  removeImageButton: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
});

export default EditProductScreen; 