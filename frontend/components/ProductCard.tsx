import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  Platform 
} from 'react-native';

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  image: string;
  pieces: number;
  stock?: number;
  onPress: () => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ 
  id, name, price, image, pieces, stock, onPress 
}) => {
  const [imageError, setImageError] = useState(false);
  const fallbackImage = 'https://via.placeholder.com/300?text=No+Image';
  
  return (
    <TouchableOpacity 
      style={styles.productCard} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Image 
        source={{ uri: imageError ? fallbackImage : image }} 
        style={styles.productImage}
        resizeMode="cover"
        onError={() => setImageError(true)}
      />
      <View style={styles.contentContainer}>
        <View style={styles.nameContainer}>
          <Text style={styles.productName} numberOfLines={2}>
            {name}
          </Text>
        </View>
        <View style={styles.productDetailsContainer}>
          <Text style={styles.productPrice}>₱{price.toFixed(2)}</Text>
          <Text style={styles.productPieces}>{pieces} pcs</Text>
        </View>
        <View style={[
          styles.stockContainer, 
          stock !== undefined ? (stock > 0 ? styles.inStock : styles.outOfStock) : styles.noStock
        ]}>
          {stock !== undefined && (
            <Text style={styles.stockText}>
              {stock > 0 ? `In Stock: ${stock}` : 'Out of Stock'}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  productCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  productImage: {
    width: '100%',
    height: 150, // Fixed height for image
    backgroundColor: '#f0f0f0',
  },
  contentContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  nameContainer: {
    height: 50, // Fixed height for name area
    padding: 8,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 14,
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
    height: 40, // Fixed height
    alignItems: 'center',
  },
  productPrice: {
    color: '#E3000B',
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Futura-Bold' : 'sans-serif-condensed',
  },
  productPieces: {
    color: '#666',
    fontFamily: Platform.OS === 'ios' ? 'Futura-Medium' : 'sans-serif-medium',
  },
  stockContainer: {
    height: 30, // Fixed height for stock container
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    marginTop: 'auto', // Push to bottom
  },
  inStock: {
    backgroundColor: '#f0f8ff',
  },
  outOfStock: {
    backgroundColor: '#fff0f0',
  },
  noStock: {
    backgroundColor: '#f9f9f9',
  },
  stockText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Futura-Medium' : 'sans-serif-medium',
  }
});

export default ProductCard;
