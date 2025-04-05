import React, { useState } from 'react';
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
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Dropdown } from 'react-native-element-dropdown';
import { ProductFormData, Product } from '../../../types/product';
import AuthCheck from '../../../components/AuthCheck';
import { useAppDispatch, useAppSelector } from '../../../redux/hooks';
import { addProduct, ProductsState } from '../../../redux/slices/productSlice';
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

const CreateProductScreen = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { loading } = useAppSelector((state: RootState) => state.products as ProductsState);
  const [isFocus, setIsFocus] = useState(false);
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    price: '',
    stock: '',
    description: '',
    category: 'Minifigure',
    pieces: '1',
    images: [],
  });

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
        if (formData.images && formData.images.length + result.assets.length > 5) {
          Alert.alert('Too many images', 'You can only upload up to 5 images');
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
      
      if (formData.images && formData.images.length >= 5) {
        Alert.alert('Too many images', 'You can only upload up to 5 images');
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

  const removeImage = (index: number) => {
    const newImages = [...(formData.images || [])];
    newImages.splice(index, 1);
    setFormData({ ...formData, images: newImages });
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

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    try {
      await dispatch(addProduct(formData)).unwrap();
      Alert.alert('Success', 'Product created successfully', [
        { text: 'OK', onPress: () => router.push('/admin/products') }
      ]);
    } catch (error) {
      console.error('Error creating product:', error);
      Alert.alert('Error', typeof error === 'string' ? error : 'Failed to create product');
    }
  };

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
              <Text style={styles.pageHeaderTitle}>Create New Product</Text>
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
              <Text style={styles.imageNote}>Images will be uploaded to Cloudinary for secure storage and fast delivery</Text>
              
              <View style={styles.newImagesSection}>
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
                
                {/* Show selected images */}
                {formData.images && formData.images.length > 0 && (
                  <View style={styles.selectedImagesContainer}>
                    <Text style={styles.selectedImagesText}>
                      {formData.images.length} {formData.images.length === 1 ? 'image' : 'images'} selected
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
              style={[styles.submitButton, loading && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={LEGO_COLORS.white} />
              ) : (
                <>
                  <Ionicons name="save-outline" size={20} color={LEGO_COLORS.white} />
                  <Text style={styles.submitButtonText}>Create Product</Text>
                </>
              )}
            </TouchableOpacity>
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
  disabledButton: {
    opacity: 0.7,
  },
  legoFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 20,
    marginTop: 20,
  },
});

export default CreateProductScreen;