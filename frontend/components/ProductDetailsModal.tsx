import React, { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, Image, Pressable, Dimensions } from 'react-native';
import { AntDesign, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getProduct } from '../utils/api';
import { Product } from '../types/product';
import { formatCurrency } from '../utils/formatters';
import { Colors } from '../constants/Colors';

// LEGO Theme Colors
const LEGO_COLORS = {
  primary: '#e3000b', // LEGO Red
  secondary: '#f8bf00', // LEGO Yellow
  blue: '#006cb7', // LEGO Blue
  green: '#00af4d', // LEGO Green
  black: '#000000', // LEGO Black
  background: '#f8f8f8', // Light background
  text: '#333333', // Text color
  error: '#e3000b', // Error (using LEGO Red)
  studs: '#ffcf00', // LEGO stud color (bright yellow)
};

interface ProductDetailsModalProps {
  productId: string | null;
  visible: boolean;
  onClose: () => void;
}

// Stud component for LEGO-style decoration
const LegoStud = () => (
  <View style={legoStyles.stud}>
    <View style={legoStyles.studInner} />
  </View>
);

const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({
  productId,
  visible,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Fetch product details when productId changes or modal becomes visible
  useEffect(() => {
    const fetchProductDetails = async () => {
      if (!productId || !visible) return;

      try {
        setLoading(true);
        setError(null);
        
        const productData = await getProduct(productId);
        setProduct(productData);
      } catch (err) {
        console.error('Error fetching product details:', err);
        setError('Failed to load product details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchProductDetails();
  }, [productId, visible]);

  const handleViewProduct = () => {
    if (productId) {
      onClose();
      // Navigate to product details screen
      router.push(`/user/product/${productId}`);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={legoStyles.centeredView}>
        <View style={legoStyles.modalView}>
          {/* LEGO Studs top row */}
          <View style={legoStyles.studRow}>
            <LegoStud />
            <LegoStud />
            <LegoStud />
            <LegoStud />
            <LegoStud />
            <LegoStud />
          </View>
          
          <View style={legoStyles.header}>
            <View style={legoStyles.titleContainer}>
              <FontAwesome5 name="" size={20} color={LEGO_COLORS.black} style={{marginRight: 8}} />
              <Text style={legoStyles.title}>NEW LEGO SET!</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={legoStyles.closeButton}>
              <AntDesign name="close" size={24} color={LEGO_COLORS.primary} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={legoStyles.loadingContainer}>
              <ActivityIndicator size="large" color={LEGO_COLORS.blue} />
              <Text style={legoStyles.loadingText}>Building your LEGO set...</Text>
            </View>
          ) : error ? (
            <View style={legoStyles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={40} color={LEGO_COLORS.error} />
              <Text style={legoStyles.errorText}>{error}</Text>
              <TouchableOpacity
                style={legoStyles.retryButton}
                onPress={() => setProduct(null)} // This will trigger a re-fetch
              >
                <Text style={legoStyles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : product ? (
            <ScrollView
              style={legoStyles.scrollView}
              contentContainerStyle={legoStyles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Product Image */}
              <View style={legoStyles.imageContainer}>
                {product.imageURL && product.imageURL.length > 0 && (
                  <Image
                    source={{ uri: product.imageURL[0] }}
                    style={legoStyles.productImage}
                    resizeMode="cover"
                  />
                )}
                {/* Image corner studs */}
                <View style={[legoStyles.cornerStud, legoStyles.topLeftStud]}>
                  <View style={legoStyles.cornerStudInner} />
                </View>
                <View style={[legoStyles.cornerStud, legoStyles.topRightStud]}>
                  <View style={legoStyles.cornerStudInner} />
                </View>
                <View style={[legoStyles.cornerStud, legoStyles.bottomLeftStud]}>
                  <View style={legoStyles.cornerStudInner} />
                </View>
                <View style={[legoStyles.cornerStud, legoStyles.bottomRightStud]}>
                  <View style={legoStyles.cornerStudInner} />
                </View>
              </View>

              {/* Product Details */}
              <View style={legoStyles.productInfo}>
                <View style={legoStyles.nameContainer}>
                  <Text style={legoStyles.productName}>{product.name}</Text>
                </View>
                
                <View style={legoStyles.priceTagContainer}>
                  <Text style={legoStyles.productPrice}>{formatCurrency(product.price)}</Text>
                </View>
                
                <View style={legoStyles.detailsContainer}>
                  <View style={legoStyles.categoryBadge}>
                    <Text style={legoStyles.productCategory}>{product.category}</Text>
                  </View>
                  
                  <Text style={legoStyles.productDescription}>
                    {product.description}
                  </Text>
                </View>
              </View>

              {/* View Product Button */}
              <TouchableOpacity
                style={legoStyles.viewButton}
                onPress={handleViewProduct}
              >
                <Text style={legoStyles.viewButtonText}>Go To Product</Text>
              </TouchableOpacity>
            </ScrollView>
          ) : (
            <View style={legoStyles.noDataContainer}>
              <Text style={legoStyles.noDataText}>
                We couldn't find these LEGO instructions.
              </Text>
            </View>
          )}
          
          {/* LEGO Studs bottom row */}
          <View style={legoStyles.studRow}>
            <LegoStud />
            <LegoStud />
            <LegoStud />
            <LegoStud />
            <LegoStud />
            <LegoStud />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const { width } = Dimensions.get('window');
const studSize = width * 0.05; // 5% of screen width

const legoStyles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalView: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: LEGO_COLORS.background,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    // Border to look like LEGO brick
    borderWidth: 2,
    borderColor: LEGO_COLORS.blue,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: LEGO_COLORS.secondary,
    borderBottomWidth: 3,
    borderBottomColor: LEGO_COLORS.black,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: LEGO_COLORS.black,
    letterSpacing: 0.5,
  },
  closeButton: {
    padding: 5,
    backgroundColor: LEGO_COLORS.background,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: LEGO_COLORS.primary,
    height: 32,
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    width: '100%',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    height: 300,
    backgroundColor: LEGO_COLORS.background,
  },
  loadingText: {
    marginTop: 15,
    color: LEGO_COLORS.blue,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    height: 300,
    backgroundColor: LEGO_COLORS.background,
  },
  errorText: {
    marginTop: 15,
    color: LEGO_COLORS.error,
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: 'bold',
  },
  retryButton: {
    backgroundColor: LEGO_COLORS.blue,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: '#004e89', // Darker blue for 3D effect
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 200,
    marginBottom: 15,
  },
  productImage: {
    width: '100%',
    height: '100%',
    borderWidth: 3,
    borderColor: LEGO_COLORS.black,
  },
  productInfo: {
    padding: 15,
  },
  nameContainer: {
    backgroundColor: LEGO_COLORS.blue,
    padding: 10,
    borderRadius: 6,
    marginBottom: 12,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: '#004e89', // Darker blue for 3D effect
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  priceTagContainer: {
    backgroundColor: LEGO_COLORS.green,
    alignSelf: 'flex-start',
    paddingVertical: 5,
    paddingHorizontal: 15,
    borderRadius: 15,
    marginBottom: 15,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: '#007a35', // Darker green for 3D effect
    transform: [{ rotate: '-3deg' }],
  },
  productPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  detailsContainer: {
    backgroundColor: '#ffffff',
    padding: 15,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: LEGO_COLORS.black,
  },
  categoryBadge: {
    backgroundColor: LEGO_COLORS.primary,
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  productCategory: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  productDescription: {
    fontSize: 14,
    color: LEGO_COLORS.text,
    lineHeight: 20,
    marginBottom: 15,
  },
  viewButton: {
    backgroundColor: LEGO_COLORS.secondary,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 15,
    marginTop: 5,
    alignItems: 'center',
    borderBottomWidth: 5,
    borderRightWidth: 5,
    borderColor: '#d9a600', // Darker yellow for 3D effect
  },
  viewButtonText: {
    color: LEGO_COLORS.black,
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 1,
  },
  noDataContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
  },
  noDataText: {
    color: LEGO_COLORS.text,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  // LEGO stud styles
  stud: {
    width: studSize,
    height: studSize,
    borderRadius: studSize / 2,
    backgroundColor: LEGO_COLORS.studs,
    margin: 5,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e6bb00', // Slightly darker yellow
  },
  studInner: {
    width: studSize * 0.5,
    height: studSize * 0.5,
    borderRadius: (studSize * 0.5) / 2,
    backgroundColor: '#ffda44', // Lighter yellow
  },
  studRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    padding: 2,
    backgroundColor: LEGO_COLORS.primary,
  },
  // Corner studs for image
  cornerStud: {
    position: 'absolute',
    width: studSize,
    height: studSize,
    borderRadius: studSize / 2,
    backgroundColor: LEGO_COLORS.studs,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e6bb00',
  },
  cornerStudInner: {
    width: studSize * 0.5,
    height: studSize * 0.5,
    borderRadius: (studSize * 0.5) / 2,
    backgroundColor: '#ffda44',
  },
  topLeftStud: {
    top: -studSize / 2,
    left: -studSize / 2,
  },
  topRightStud: {
    top: -studSize / 2,
    right: -studSize / 2,
  },
  bottomLeftStud: {
    bottom: -studSize / 2,
    left: -studSize / 2,
  },
  bottomRightStud: {
    bottom: -studSize / 2,
    right: -studSize / 2,
  },
});

export default ProductDetailsModal; 