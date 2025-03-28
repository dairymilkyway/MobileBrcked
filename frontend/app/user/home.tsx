import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Platform, 
  TouchableOpacity, 
  TextInput, 
  Image 
} from 'react-native';
import UserHeader from '@/components/UserHeader';
import { IconSymbol } from '@/components/ui/IconSymbol';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');

  const legoSets = [
    {
      id: 1,
      name: 'Space Shuttle Discovery',
      price: 179.99,
      image: 'https://cdn.lego.com/api/getcontent/dam/blitline/lego-product/legacy/product-detail/10283/main.jpg',
      pieces: 2354,
    },
    {
      id: 2,
      name: 'Colosseum',
      price: 549.99,
      image: 'https://cdn.lego.com/api/getcontent/dam/blitline/lego-product/legacy/product-detail/10276/main.jpg',
      pieces: 9036,
    },
    {
      id: 3,
      name: 'Millennium Falcon',
      price: 849.99,
      image: 'https://cdn.lego.com/api/getcontent/dam/blitline/lego-product/legacy/product-detail/75192/main.jpg',
      pieces: 7541,
    },
    {
      id: 4,
      name: 'Medieval Castle',
      price: 399.99,
      image: 'https://cdn.lego.com/api/getcontent/dam/blitline/lego-product/legacy/product-detail/icons/castle/main.jpg',
      pieces: 3955,
    }
  ];

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
          />
          <TouchableOpacity style={styles.searchButton}>
            <IconSymbol name="magnifyingglass" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Banner */}
        <View style={styles.bannerContainer}>
          <Image 
            source={{ uri: 'https://www.lego.com/cdn/cs/catalog/images/homepage-hero-xl.jpg' }}
            style={styles.bannerImage}
            resizeMode="cover"
          />
          <View style={styles.bannerOverlay}>
            <Text style={styles.bannerTitle}>Build Your World</Text>
            <Text style={styles.bannerSubtitle}>Discover Endless Creativity</Text>
          </View>
        </View>

        {/* Products Container */}
        <View style={styles.productsContainer}>
          <Text style={styles.sectionTitle}>Popular LEGO Sets</Text>
          <View style={styles.productGrid}>
            {legoSets.map((set) => (
              <TouchableOpacity key={set.id} style={styles.productCard}>
                <Image 
                  source={{ uri: set.image }}
                  style={styles.productImage}
                  resizeMode="cover"
                />
                <Text style={styles.productName} numberOfLines={2}>
                  {set.name}
                </Text>
                <View style={styles.productDetailsContainer}>
                  <Text style={styles.productPrice}>${set.price.toFixed(2)}</Text>
                  <Text style={styles.productPieces}>{set.pieces} pieces</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
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