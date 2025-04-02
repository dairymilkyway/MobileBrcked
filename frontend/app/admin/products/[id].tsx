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
import { getProductById, updateProduct, deleteProduct } from '../../../utils/api';
import { API_BASE_URL } from '../../../env';
import { Product, ProductFormData } from '../../../types/product';
import AuthCheck from '../../../components/AuthCheck';

// Category data for dropdown
const categoryData = [
  { label: 'Minifigure', value: 'Minifigure' },
  { label: 'Set', value: 'Set' },
  { label: 'Piece', value: 'Piece' },
];

const EditProductScreen = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isFocus, setIsFocus] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
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
      fetchProduct(id);
    }
  }, [id]);

  const fetchProduct = async (productId: string) => {
    try {
      setLoading(true);
      const productData = await getProductById(productId);
      setProduct(productData);
      
      // Initialize form data
      setFormData({
        name: productData.name,
        price: productData.price.toString(),
        stock: productData.stock.toString(),
        description: productData.description,
        category: productData.category,
        pieces: productData.pieces.toString(),
        images: [],
        removeImages: false,
      });
    } catch (error) {
      console.error('Error fetching product:', error);
      Alert.alert('Error', 'Failed to load product details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

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
    
    // Create a copy of the product with updated imageURL
    const updatedProduct = {
      ...product,
      imageURL: updatedImageUrls
    };
    
    // Update the local product state 
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
      
      // If we have explicitly modified the existing images (by removing one)
      if (formData.existingImages) {
        // We already have the existingImages in formData, so we can just update
        await updateProduct(id, formData);
      } 
      // If the user has chosen to remove all existing images
      else if (formData.removeImages) {
        await updateProduct(id, formData);
      } 
      // Normal update without image changes
      else {
        await updateProduct(id, formData);
      }
      
      Alert.alert('Success', 'Product updated successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Error updating product:', error);
      Alert.alert('Error', 'Failed to update product');
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
              await deleteProduct(id);
              Alert.alert('Success', 'Product deleted successfully', [
                { text: 'OK', onPress: () => router.back() }
              ]);
            } catch (error) {
              console.error('Error deleting product:', error);
              Alert.alert('Error', 'Failed to delete product');
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
              <View style={styles.imagesHeader}>
                <Text style={styles.label}>Current Images</Text>
                {product?.imageURL && product.imageURL.length > 0 && (
                  <TouchableOpacity 
                    style={[styles.toggleButton, formData.removeImages && styles.toggleButtonActive]}
                    onPress={handleToggleExistingImages}
                  >
                    <Text style={formData.removeImages ? styles.toggleTextActive : styles.toggleText}>
                      {formData.removeImages ? 'Keep Images' : 'Remove All'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              
              {!formData.removeImages && product?.imageURL && product.imageURL.length > 0 ? (
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.currentImagesScroll}
                >
                  {product.imageURL.map((url, index) => (
                    <View key={index} style={styles.imagePreview}>
                      <Image 
                        source={{ uri: url.startsWith('http') ? url : `${API_BASE_URL.replace('/api', '')}${url}` }} 
                        style={styles.imageThumb} 
                      />
                      <TouchableOpacity
                        style={styles.removeImageBtn}
                        onPress={() => handleRemoveCurrentImage(index)}
                      >
                        <View style={styles.removeIconCircle}>
                          <Ionicons name="close" size={18} color="#fff" />
                        </View>
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <Text style={styles.noImagesText}>No current images</Text>
              )}

              <Text style={styles.label}>New Images</Text>
              <View style={styles.imagesContainer}>
                {formData.images && formData.images.map((image, index) => (
                  <View key={index} style={styles.imagePreview}>
                    <Image source={{ uri: image.uri }} style={styles.imageThumb} />
                    <TouchableOpacity
                      style={styles.removeImageBtn}
                      onPress={() => removeImage(index)}
                    >
                      <View style={styles.removeIconCircle}>
                        <Ionicons name="close" size={18} color="#fff" />
                      </View>
                    </TouchableOpacity>
                  </View>
                ))}
                
                {(!formData.images || formData.images.length < 5) && (
                  <View style={styles.imageActions}>
                    <TouchableOpacity
                      style={[styles.imageBtn, styles.galleryBtn]}
                      onPress={handlePickImages}
                    >
                      <Ionicons name="images" size={24} color="#fff" />
                      <Text style={styles.imageBtnText}>Gallery</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.imageBtn, styles.cameraBtn]}
                      onPress={handleTakePicture}
                    >
                      <Ionicons name="camera" size={24} color="#fff" />
                      <Text style={styles.imageBtnText}>Camera</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
              <Text style={styles.imagesHelpText}>
                You can upload up to 5 total images
              </Text>
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
  toggleButton: {
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
});

export default EditProductScreen; 