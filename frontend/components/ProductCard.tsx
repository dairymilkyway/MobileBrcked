import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  Platform 
} from 'react-native';

export interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  image: string;
  pieces: number;
  onPress?: () => void;
}

const ProductCard = ({ id, name, price, image, pieces, onPress }: ProductCardProps) => {
  return (
    <TouchableOpacity style={styles.productCard} onPress={onPress}>
      <Image 
        source={{ uri: image }}
        style={styles.productImage}
        resizeMode="cover"
      />
      <Text style={styles.productName} numberOfLines={2}>
        {name}
      </Text>
      <View style={styles.productDetailsContainer}>
        <Text style={styles.productPrice}>${price.toFixed(2)}</Text>
        <Text style={styles.productPieces}>{pieces} pieces</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
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

export default ProductCard;
