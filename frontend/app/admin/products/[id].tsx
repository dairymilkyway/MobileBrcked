import React, { useState, useEffect, useCallback } from 'react';
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
  StatusBar,
  SafeAreaView,
  Dimensions
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
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

const { width, height } = Dimensions.get('window');

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

  // Replace useEffect with useFocusEffect for data fetching when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (id) {
        dispatch(fetchProductById(id));
      }
      
      return () => {
        // Clean up when screen loses focus
      };
    }, [id, dispatch])
  );
  
  // Keep this useEffect for component unmounting cleanup
  useEffect(() => {
    return () => {
      dispatch(clearSelectedProduct());
    };
  }, [dispatch]);

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
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={LEGO_COLORS.red} />
          <Text style={styles.loadingText}>Building product details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={LEGO_COLORS.red} />
      <AuthCheck requiredRole="admin" />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardContainer}
      >
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentInner}
        >
          {/* Header with LEGO styling */}
          <View style={styles.pageHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color={LEGO_COLORS.darkGrey} />
            </TouchableOpacity>
            <View style={styles.titleContainer}>
              <View style={styles.logoStuds}>
                {[...Array(3)].map((_, i) => (
                  <Stud key={i} color={LEGO_COLORS.yellow} size={14} />
                ))}
              </View>
              <Text style={styles.pageHeaderTitle}>
                {id === 'create' ? 'Add New Product' : 'Edit Product'}
              </Text>
            </View>
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
                style={[styles.dropdown, isFocus && { borderColor: LEGO_COLORS.blue }]}
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
              <View style={styles.sectionHeaderBar}>
                <Text style={styles.sectionTitle}>Product Images (Max: 5)</Text>
                <View style={styles.headerStuds}>
                  <Stud color={LEGO_COLORS.blue} />
                  <Stud color={LEGO_COLORS.green} />
                </View>
              </View>
              <Text style={styles.imageNote}>Images are stored on Cloudinary for secure storage and fast delivery</Text>
              
              {/* Current product images */}
              {product && product.imageURL && product.imageURL.length > 0 && !formData.removeImages && (
                <View style={styles.currentImagesContainer}>
                  <View style={styles.sectionSubHeader}>
                    <Text style={styles.sectionSubTitle}>Current Images</Text>
                    <TouchableOpacity
                      style={styles.toggleButton}
                      onPress={handleToggleExistingImages}
                    >
                      <Text style={styles.toggleButtonText}>Remove All</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <ScrollView horizontal style={styles.imagesScroll} showsHorizontalScrollIndicator={false}>
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
                          <Ionicons name="close-circle" size={24} color={LEGO_COLORS.red} />
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
                <Text style={styles.sectionSubTitle}>Add New Images</Text>
                
                <View style={styles.uploadButtonsContainer}>
                  <TouchableOpacity 
                    style={[styles.uploadButton, { backgroundColor: LEGO_COLORS.blue }]}
                    onPress={handlePickImages}
                  >
                    <Ionicons name="image-outline" size={24} color={LEGO_COLORS.white} />
                    <Text style={styles.uploadButtonText}>Choose Images</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.uploadButton, { backgroundColor: LEGO_COLORS.green }]}
                    onPress={handleTakePicture}
                  >
                    <Ionicons name="camera-outline" size={24} color={LEGO_COLORS.white} />
                    <Text style={styles.uploadButtonText}>Take Photo</Text>
                  </TouchableOpacity>
                </View>
                
                {/* Show selected new images */}
                {formData.images && formData.images.length > 0 && (
                  <View style={styles.selectedImagesContainer}>
                    <Text style={styles.selectedImagesText}>
                      {formData.images.length} new {formData.images.length === 1 ? 'image' : 'images'} selected
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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
                            <Ionicons name="close-circle" size={24} color={LEGO_COLORS.red} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.submitButton, saving && styles.disabledButton]}
              onPress={handleUpdate}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={LEGO_COLORS.white} />
              ) : (
                <>
                  <Ionicons name="save-outline" size={20} color={LEGO_COLORS.white} />
                  <Text style={styles.submitButtonText}>
                    {id === 'create' ? 'Add Product' : 'Update Product'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Delete button only shown for existing products */}
            {id !== 'create' && (
              <TouchableOpacity
                style={[styles.deleteButton, deleting && styles.disabledButton]}
                onPress={handleDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color={LEGO_COLORS.white} />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={20} color={LEGO_COLORS.white} />
                    <Text style={styles.deleteButtonText}>Delete Product</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
          
          {/* LEGO footer decoration */}
          <View style={styles.legoFooter}>
            {[...Array(8)].map((_, i) => (
              <Stud key={i} color={i % 2 === 0 ? LEGO_COLORS.red : LEGO_COLORS.blue} size={16} />
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: LEGO_COLORS.red,
  },
  keyboardContainer: {
    flex: 1,
    backgroundColor: LEGO_COLORS.lightGrey,
  },
  scrollView: {
    flex: 1,
  },
  contentInner: {
    padding: 16,
    paddingBottom: 40,
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 12,
    borderBottomWidth: 4,
    borderBottomColor: LEGO_COLORS.yellow,
    marginTop: 20,
  },
  backButton: {
    padding: 8,
    marginRight: 10,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoStuds: {
    flexDirection: 'row',
    marginRight: 10,
  },
  pageHeaderTitle: {
    fontSize: 22,
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
  formContainer: {
    backgroundColor: LEGO_COLORS.white,
    borderRadius: 8,
    padding: 16,
    borderWidth: 2,
    borderColor: LEGO_COLORS.darkGrey,
    ...LEGO_SHADOW
  },
  formGroup: {
    marginBottom: 18,
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: LEGO_COLORS.darkGrey,
  },
  input: {
    backgroundColor: LEGO_COLORS.white,
    borderWidth: 2,
    borderColor: LEGO_COLORS.darkGrey,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: LEGO_COLORS.darkGrey,
  },
  textArea: {
    minHeight: 100,
  },
  dropdown: {
    height: 50,
    borderColor: LEGO_COLORS.darkGrey,
    borderWidth: 2,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: LEGO_COLORS.white,
  },
  placeholderStyle: {
    fontSize: 16,
    color: '#999',
  },
  selectedTextStyle: {
    fontSize: 16,
    color: LEGO_COLORS.darkGrey,
  },
  iconStyle: {
    width: 20,
    height: 20,
  },
  sectionHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: LEGO_COLORS.yellow,
    paddingBottom: 10,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: LEGO_COLORS.black,
  },
  headerStuds: {
    flexDirection: 'row',
  },
  imageNote: {
    fontSize: 12,
    color: LEGO_COLORS.darkGrey,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  currentImagesContainer: {
    marginBottom: 24,
    backgroundColor: LEGO_COLORS.lightGrey,
    borderRadius: 8,
    padding: 12,
  },
  sectionSubHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionSubTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: LEGO_COLORS.darkGrey,
  },
  toggleButton: {
    backgroundColor: LEGO_COLORS.red,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: LEGO_COLORS.darkGrey,
    ...LEGO_SHADOW
  },
  toggleButtonText: {
    color: LEGO_COLORS.white,
    fontSize: 12,
    fontWeight: '500',
  },
  imagesScroll: {
    flexDirection: 'row',
  },
  removedImagesNotice: {
    backgroundColor: '#f8d7da',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#721c24',
  },
  removedImagesText: {
    color: '#721c24',
    fontSize: 14,
    flex: 1,
    fontWeight: 'bold',
  },
  undoButton: {
    backgroundColor: LEGO_COLORS.blue,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: LEGO_COLORS.darkGrey,
    ...LEGO_SHADOW
  },
  undoButtonText: {
    color: LEGO_COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  newImagesSection: {
    marginTop: 16,
    backgroundColor: LEGO_COLORS.lightGrey,
    borderRadius: 8,
    padding: 12,
  },
  uploadButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 12,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    width: '48%',
    borderWidth: 1.5,
    borderColor: LEGO_COLORS.black,
    ...LEGO_SHADOW
  },
  uploadButtonText: {
    color: LEGO_COLORS.white,
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 14,
  },
  selectedImagesContainer: {
    marginTop: 16,
  },
  selectedImagesText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
    color: LEGO_COLORS.darkGrey,
  },
  imageContainer: {
    width: 100,
    height: 100,
    margin: 5,
    position: 'relative',
    borderWidth: 2,
    borderColor: LEGO_COLORS.darkGrey,
    borderRadius: 8,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: LEGO_COLORS.white,
    borderRadius: 12,
    zIndex: 10,
    padding: 2,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 1,
  },
  submitButton: {
    backgroundColor: LEGO_COLORS.green,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: LEGO_COLORS.black,
    ...LEGO_SHADOW
  },
  submitButtonText: {
    color: LEGO_COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  deleteButton: {
    backgroundColor: LEGO_COLORS.red,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: LEGO_COLORS.black,
    ...LEGO_SHADOW
  },
  deleteButtonText: {
    color: LEGO_COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  disabledButton: {
    opacity: 0.7,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: LEGO_COLORS.lightGrey,
  },
  loadingText: {
    marginTop: 16,
    color: LEGO_COLORS.darkGrey,
    fontSize: 16,
    fontWeight: '500',
  },
  legoFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 20,
    marginTop: 20,
  },
});

export default EditProductScreen;