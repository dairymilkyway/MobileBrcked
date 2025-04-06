import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert,
  Modal,
  ScrollView,
  Dimensions,
  Platform,
  StatusBar,
  SafeAreaView,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppDispatch, useAppSelector } from '../../../redux/hooks';
import { fetchAllReviews, deleteReview } from '../../../redux/slices/reviewSlice';
import { RootState } from '../../../redux/store';
import AuthCheck from '../../../components/AuthCheck';

// Define the Review interface to match our backend model
interface ReviewUser {
  username: string;
  email: string;
  _id: string;
}

interface ReviewProduct {
  name: string;
  imageURL: string[];
  _id: string;
}

interface Review {
  _id: string;
  Name: string;
  Rating: number;
  Comment: string;
  Reviewdate: string;
  UserID: ReviewUser | string;
  ProductID: ReviewProduct | string;
  Productname?: string;
}

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
const getResponsiveSize = (size: number, factor: number = 0.05): number => {
  return Math.round(Math.min(width, height) * factor) + size;
};

// Format date helper function
const formatDate = (dateString: string, showTime = false) => {
  try {
    const date = new Date(dateString);
    
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: showTime ? 'long' : 'short', 
      day: 'numeric'
    };
    
    let formatted = date.toLocaleDateString(undefined, options);
    
    if (showTime) {
      const timeOptions: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: 'numeric' };
      formatted += ' at ' + date.toLocaleTimeString(undefined, timeOptions);
    }
    
    return formatted;
  } catch (error) {
    console.error('Date formatting error:', error);
    return dateString || 'Unknown date';
  }
};

const ReviewsAdminScreen = () => {
  const dispatch = useAppDispatch();
  const { allReviews, fetchingAllReviews, error, deleting } = useAppSelector((state: RootState) => state.reviews);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const router = useRouter();

  const fetchReviewsData = async () => {
    try {
      setRefreshing(true);
      await dispatch(fetchAllReviews()).unwrap();
    } catch (error) {
      console.error('Error fetching reviews:', error);
      Alert.alert('Error', 'Failed to load reviews');
    } finally {
      setRefreshing(false);
    }
  };

  // Add useFocusEffect to refetch reviews whenever the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchReviewsData();
      return () => {
        // Cleanup function if needed
      };
    }, [])
  );

  // Keep the original useEffect for initial load
  useEffect(() => {
    fetchReviewsData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchReviewsData();
  };

  const handleDeleteReview = async (id: string, userName: string) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete the review by "${userName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Get admin token
              const token = await AsyncStorage.getItem('token');
              if (!token) {
                Alert.alert('Authentication Error', 'Please log in again to perform this action.');
                return;
              }
              
              await dispatch(deleteReview({ reviewId: id })).unwrap();
              Alert.alert('Success', 'Review deleted successfully');
              // Refresh the reviews list
              fetchReviewsData();
            } catch (error) {
              console.error('Error deleting review:', error);
              Alert.alert('Error', 'Failed to delete review');
            }
          },
        },
      ]
    );
  };

  const handleViewDetails = (review: Review) => {
    setSelectedReview(review);
    setModalVisible(true);
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
            onPress={() => fetchReviewsData()}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const renderReviewItem = ({ item }: { item: Review }) => {
    // Format the review date
    const formattedDate = formatDate(item.Reviewdate);
    
    // Get username, either from the populated object or directly
    const userName = item.UserID && typeof item.UserID === 'object' ? 
      item.UserID.username : item.Name;
      
    // Get product name
    const productName = item.ProductID && typeof item.ProductID === 'object' ?
      item.ProductID.name : item.Productname || 'Unknown Product';
      
    // Get product image if available
    let productImage = 'https://via.placeholder.com/300';
    
    if (item.ProductID && typeof item.ProductID === 'object' && 
        item.ProductID.imageURL && item.ProductID.imageURL.length > 0) {
      productImage = item.ProductID.imageURL[0].startsWith('http') ? 
        item.ProductID.imageURL[0] : 
        `http://192.168.0.251:9000${item.ProductID.imageURL[0]}`;
    }

    return (
      <View style={styles.reviewItem}>
        <View style={styles.reviewImageContainer}>
          <Image 
            source={{ uri: productImage }} 
            style={styles.reviewImage} 
          />
        </View>
        <View style={styles.reviewDetails}>
          <Text style={styles.reviewProductName} numberOfLines={1}>{productName}</Text>
          <View style={styles.ratingContainer}>
            {[...Array(5)].map((_, i) => (
              <Ionicons 
                key={i} 
                name={i < item.Rating ? "star" : "star-outline"} 
                size={16} 
                color={LEGO_COLORS.yellow} 
              />
            ))}
            <Text style={styles.ratingText}> ({item.Rating}/5)</Text>
          </View>
          <Text style={styles.reviewUserName}>By: {userName}</Text>
          <Text style={styles.reviewDate}>{formattedDate}</Text>
          <TouchableOpacity 
            style={styles.viewDetailsButton}
            onPress={() => handleViewDetails(item)}
          >
            <Text style={styles.viewDetailsText}>View Comment</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteReview(item._id, userName)}
          >
            <Ionicons name="trash-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderDetailsModal = () => {
    if (!selectedReview) return null;
    
    // Get username, either from the populated object or directly
    const userName = selectedReview.UserID && typeof selectedReview.UserID === 'object' ? 
      selectedReview.UserID.username : selectedReview.Name;
      
    // Get product name
    const productName = selectedReview.ProductID && typeof selectedReview.ProductID === 'object' ?
      selectedReview.ProductID.name : selectedReview.Productname || 'Unknown Product';
    
    // Format the review date with time
    const formattedDate = formatDate(selectedReview.Reviewdate, true);

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
                <Text style={styles.modalTitle}>Review Details</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScrollView}>
              <View style={styles.detailsContainer}>
                <Text style={styles.detailsProductName}>{productName}</Text>
                
                <View style={styles.detailsRatingRow}>
                  <Text style={styles.detailsLabel}>Rating:</Text>
                  <View style={styles.detailsRating}>
                    {[...Array(5)].map((_, i) => (
                      <Ionicons 
                        key={i} 
                        name={i < selectedReview.Rating ? "star" : "star-outline"} 
                        size={20} 
                        color={LEGO_COLORS.yellow} 
                      />
                    ))}
                    <Text style={styles.detailsRatingText}> ({selectedReview.Rating}/5)</Text>
                  </View>
                </View>
                
                <View style={styles.detailsRow}>
                  <Text style={styles.detailsLabel}>Reviewer:</Text>
                  <Text style={styles.detailsValue}>{userName}</Text>
                </View>
                
                <View style={styles.detailsRow}>
                  <Text style={styles.detailsLabel}>Date:</Text>
                  <Text style={styles.detailsValue}>{formattedDate}</Text>
                </View>
                
                <Text style={styles.detailsLabel}>Comment:</Text>
                <Text style={styles.reviewComment}>{selectedReview.Comment}</Text>
              </View>
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.deleteModalButton]}
                onPress={() => {
                  setModalVisible(false);
                  handleDeleteReview(selectedReview._id, userName);
                }}
              >
                <Ionicons name="trash-outline" size={20} color="#fff" />
                <Text style={styles.modalButtonText}>Delete Review</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  if (fetchingAllReviews && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={LEGO_COLORS.red} />
          <Text style={styles.loadingText}>Loading reviews...</Text>
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
            <Text style={styles.pageHeaderTitle}>Manage Reviews</Text>
          </View>
          
          <Text style={styles.pageHeaderSubtitle}>View and manage customer product reviews</Text>
        </View>

        <FlatList
          data={allReviews as Review[]}
          renderItem={renderReviewItem}
          keyExtractor={(item: Review) => item._id}
          contentContainerStyle={styles.list}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbox-outline" size={60} color="#ccc" />
              <Text style={styles.emptyText}>No reviews found</Text>
            </View>
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
  list: {
    paddingBottom: 16,
  },
  reviewItem: {
    flexDirection: 'row',
    backgroundColor: LEGO_COLORS.white,
    borderRadius: 8,
    marginBottom: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: LEGO_COLORS.darkGrey,
    ...LEGO_SHADOW
  },
  reviewImageContainer: {
    borderRadius: 8,
    borderWidth: 2,
    borderColor: LEGO_COLORS.darkGrey,
    overflow: 'hidden',
    width: 90,
    height: 90,
  },
  reviewImage: {
    width: 90,
    height: 90,
    backgroundColor: LEGO_COLORS.lightGrey,
  },
  reviewDetails: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  reviewProductName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: LEGO_COLORS.darkGrey,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  ratingText: {
    fontSize: 14,
    color: LEGO_COLORS.darkGrey,
    marginLeft: 4,
  },
  reviewUserName: {
    fontSize: 14,
    color: LEGO_COLORS.blue,
    fontWeight: '500',
  },
  reviewDate: {
    fontSize: 12,
    color: LEGO_COLORS.darkGrey,
    marginTop: 2,
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
    justifyContent: 'center',
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
    justifyContent: 'center',
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 0.6,
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
  // Details styles
  detailsContainer: {
    padding: 20,
    backgroundColor: LEGO_COLORS.white,
  },
  detailsProductName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: LEGO_COLORS.darkGrey,
    marginBottom: 15,
  },
  detailsRatingRow: {
    marginBottom: 12,
    backgroundColor: LEGO_COLORS.lightGrey,
    padding: 12,
    borderRadius: 8,
  },
  detailsRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  detailsRatingText: {
    fontSize: 16,
    color: LEGO_COLORS.darkGrey,
    marginLeft: 4,
  },
  detailsRow: {
    flexDirection: 'row',
    marginBottom: 12,
    backgroundColor: LEGO_COLORS.lightGrey,
    padding: 12,
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
  reviewComment: {
    fontSize: 16,
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

export default ReviewsAdminScreen;