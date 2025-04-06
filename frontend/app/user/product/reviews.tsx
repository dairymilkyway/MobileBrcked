import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  RefreshControl,
  Image,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Alert
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { AntDesign } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import UserHeader from '@/components/UserHeader';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Import Redux hooks and actions
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { 
  fetchProductReviews, 
  fetchProductInfo,
  checkReviewEligibilityThunk,
  submitReview,
  clearReviewState
} from '@/redux/slices/reviewSlice';

export default function ProductReviews() {
  const { id, edit } = useLocalSearchParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  
  // Get review state from Redux
  const {
    reviews,
    product,
    reviewEligibility,
    loading,
    error,
    submitting
  } = useAppSelector((state) => state.reviews);
  
  // Local UI state
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [userComment, setUserComment] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Initialize with data from Redux state
  const { 
    hasPurchased, 
    hasReviewed, 
    existingReviewId 
  } = reviewEligibility;

  useEffect(() => {
    // Initialize edit mode from URL param
    if (edit === 'true') {
      setIsEditMode(true);
      // If the edit param is true and there's an existing review, just prepare the form data
      // but don't automatically show the modal
      if (hasReviewed && existingReviewId) {
        // Find the existing review to pre-populate the form
        const existingReview = reviews.find(r => r._id === existingReviewId);
        if (existingReview) {
          setUserRating(existingReview.Rating);
          setUserComment(existingReview.Comment);
          // Remove this line to prevent auto-showing modal: setModalVisible(true);
        }
      }
    }
  }, [edit, hasReviewed, existingReviewId, reviews]);

  useEffect(() => {
    getCurrentUser();
    
    // Cleanup on unmount
    return () => {
      dispatch(clearReviewState());
    };
  }, []);
  
  // Add useFocusEffect to refresh data when the screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (id) {
        // Dispatch Redux actions to fetch data
        dispatch(fetchProductReviews(id.toString()));
        dispatch(fetchProductInfo(id.toString()));
        dispatch(checkReviewEligibilityThunk(id.toString()));
      }
      
      return () => {
        // Clean up if needed
      };
    }, [id, dispatch, currentUserId])
  );

  const getCurrentUser = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      setCurrentUserId(userId);
    } catch (err) {
      console.error('Error getting current user ID:', err);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    
    // Dispatch Redux actions
    if (id) {
      dispatch(fetchProductReviews(id.toString()));
      dispatch(checkReviewEligibilityThunk(id.toString()));
    }
    
    setRefreshing(false);
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const roundedRating = Math.round(rating * 2) / 2; // Round to nearest 0.5
    
    for (let i = 1; i <= 5; i++) {
      if (i <= roundedRating) {
        stars.push(
          <AntDesign key={i} name="star" size={16} color="#FFD700" />
        );
      } else if (i - 0.5 === roundedRating) {
        // Replace "starhalf" with a valid icon name
        stars.push(
          <View key={i} style={{position: 'relative'}}>
            <AntDesign name="staro" size={16} color="#FFD700" />
            <View style={{
              position: 'absolute',
              width: '50%',
              height: '100%',
              overflow: 'hidden'
            }}>
              <AntDesign name="star" size={16} color="#FFD700" />
            </View>
          </View>
        );
      } else {
        stars.push(
          <AntDesign key={i} name="staro" size={16} color="#FFD700" />
        );
      }
    }
    
    return stars;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    }).format(date);
  };

  const renderReviewItem = ({ item }) => {
    const isCurrentUserReview = currentUserId && item.UserID && 
      (item.UserID._id === currentUserId || 
       (typeof item.UserID === 'string' && item.UserID === currentUserId));
      
    return (
      <View style={styles.reviewCard}>
        <View style={styles.reviewHeader}>
          <View style={styles.reviewUser}>
            <View style={styles.userIcon}>
              <Text style={styles.userInitial}>{item.Name.charAt(0).toUpperCase()}</Text>
            </View>
            <View>
              <Text style={styles.userName}>
                {item.Name}
                {isCurrentUserReview && ' (You)'}
              </Text>
              <Text style={styles.reviewDate}>{formatDate(item.Reviewdate)}</Text>
            </View>
          </View>
          <View style={styles.ratingContainer}>
            {renderStars(item.Rating)}
          </View>
        </View>
        <Text style={styles.reviewComment}>{item.Comment}</Text>
        
        {isCurrentUserReview && (
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => handleEditReview(item)}
          >
            <AntDesign name="edit" size={16} color="#0066CC" />
            <Text style={styles.editButtonText}>Edit Review</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const handleEditReview = (review) => {
    setUserRating(review.Rating);
    setUserComment(review.Comment);
    setIsEditMode(true);
    setModalVisible(true);
  };

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="comment-off-outline" size={64} color="#CCCCCC" />
      <Text style={styles.emptyText}>No reviews yet for this product</Text>
      {hasPurchased && !hasReviewed && (
        <TouchableOpacity 
          style={styles.addReviewButton}
          onPress={() => handleAddReview()}
        >
          <Text style={styles.addReviewButtonText}>Be the first to review!</Text>
        </TouchableOpacity>
      )}
      {edit === 'true' && hasReviewed && (
        <View style={styles.editPromptContainer}>
          <Text style={styles.editPromptText}>
            You can edit your review by clicking the "Edit your review" button above
          </Text>
        </View>
      )}
    </View>
  );

  const calculateAverageRating = () => {
    if (!reviews || reviews.length === 0) return 0;
    
    const sum = reviews.reduce((acc, review) => acc + review.Rating, 0);
    return sum / reviews.length;
  };

  const handleAddReview = () => {
    if (!reviewEligibility.hasPurchased) {
      Alert.alert(
        "Cannot Review",
        "You can only review products you have purchased.",
        [{ text: "OK" }]
      );
      return;
    }
    
    if (reviewEligibility.hasReviewed) {
      // Find the user's existing review
      const existingReview = reviews.find(
        r => r.UserID && (
          (typeof r.UserID === 'object' && r.UserID._id === currentUserId) || 
          (typeof r.UserID === 'string' && r.UserID === currentUserId)
        )
      );
      
      if (existingReview) {
        handleEditReview(existingReview);
      } else {
        // If we know the user has reviewed but can't find the review, refresh
        onRefresh();
        Alert.alert(
          "Review Found",
          "You have already reviewed this product. You can edit your review.",
          [{ text: "OK" }]
        );
      }
      return;
    }
    
    // New review
    setUserRating(0);
    setUserComment('');
    setIsEditMode(false);
    setModalVisible(true);
  };

  const handleSubmitReview = async () => {
    if (userRating === 0) {
      Alert.alert("Error", "Please select a rating");
      return;
    }
    
    if (!userComment.trim()) {
      Alert.alert("Error", "Please enter a comment");
      return;
    }
    
    try {
      // Use Redux action to submit review
      await dispatch(submitReview({
        productId: id as string,
        rating: userRating,
        comment: userComment,
        isEdit: isEditMode,
        reviewId: reviewEligibility.existingReviewId
      })).unwrap();
      
      // Show success message
      Alert.alert(
        "Success", 
        isEditMode ? "Your review has been updated!" : "Thank you for your review!"
      );
      
      // Reset form and close modal
      setModalVisible(false);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to submit review");
    }
  };

  const renderStarSelector = () => {
    const stars = [];
    
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity 
          key={i} 
          onPress={() => setUserRating(i)}
          style={styles.starSelectable}
        >
          <AntDesign 
            name={i <= userRating ? "star" : "staro"} 
            size={32} 
            color="#FFD700" 
          />
        </TouchableOpacity>
      );
    }
    
    return stars;
  };

  return (
    <View style={styles.container}>
      <UserHeader section="Reviews" compact={true} />
      
      {product && (
        <View style={styles.productHeader}>
          <Image 
            source={{ 
              uri: product.imageURL && product.imageURL.length > 0 
                ? product.imageURL[0] 
                : 'https://via.placeholder.com/100' 
            }} 
            style={styles.productImage} 
          />
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{product.name}</Text>
            {reviews.length > 0 && (
              <View style={styles.averageRatingContainer}>
                <Text style={styles.averageRating}>
                  {calculateAverageRating().toFixed(1)}
                </Text>
                <View style={styles.starsRow}>
                  {renderStars(calculateAverageRating())}
                </View>
                <Text style={styles.reviewCount}>
                  ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})
                </Text>
              </View>
            )}
          </View>
        </View>
      )}
      
      <View style={styles.divider} />

      {!loading && reviewEligibility.hasPurchased && (
        <TouchableOpacity 
          style={styles.writeReviewButton}
          onPress={handleAddReview}
        >
          <AntDesign name="edit" size={20} color="#FFFFFF" />
          <Text style={styles.writeReviewText}>
            {reviewEligibility.hasReviewed ? 'Edit your review' : 'Write a Review'}
          </Text>
        </TouchableOpacity>
      )}
      
      {(loading && !refreshing) ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E3000B" />
          <Text style={styles.loadingText}>Loading reviews...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={onRefresh}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={reviews}
          renderItem={renderReviewItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={renderEmptyComponent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#E3000B"]} // LEGO red
              tintColor="#E3000B"
            />
          }
        />
      )}
      
      <TouchableOpacity 
        style={styles.backToProductButton}
        onPress={() => router.back()}
      >
        <AntDesign name="arrowleft" size={20} color="#FFFFFF" />
        <Text style={styles.backToProductText}>Back to Product</Text>
      </TouchableOpacity>

      {/* Review Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {isEditMode ? 'Edit Your Review' : 'Write a Review'}
              </Text>
              
              {product && (
                <View style={styles.modalProductInfo}>
                  <Image 
                    source={{ 
                      uri: product.imageURL && product.imageURL.length > 0 
                        ? product.imageURL[0] 
                        : 'https://via.placeholder.com/80' 
                    }}
                    style={styles.modalProductImage}
                  />
                  <Text style={styles.modalProductName}>{product.name}</Text>
                </View>
              )}
              
              <Text style={styles.ratingLabel}>Your Rating</Text>
              <View style={styles.ratingSelector}>
                {renderStarSelector()}
              </View>
              
              <Text style={styles.commentLabel}>Your Review</Text>
              <TextInput
                style={styles.commentInput}
                multiline
                numberOfLines={5}
                placeholder="Share your thoughts about this product..."
                value={userComment}
                onChangeText={setUserComment}
                maxLength={500}
              />
              
              <View style={styles.charCount}>
                <Text style={styles.charCountText}>
                  {userComment.length}/500 characters
                </Text>
              </View>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.modalButton, 
                    styles.submitButton,
                    (!userRating || !userComment.trim()) ? styles.disabledButton : {}
                  ]}
                  onPress={handleSubmitReview}
                  disabled={!userRating || !userComment.trim() || submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitButtonText}>
                      {isEditMode ? 'Update Review' : 'Submit Review'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  productHeader: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#EEEEEE',
    borderWidth: 2,
    borderColor: '#0C0A00',
  },
  productInfo: {
    flex: 1,
    paddingLeft: 16,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0C0A00',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Futura-Bold' : 'sans-serif-condensed',
  },
  averageRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  averageRating: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E3000B',
    marginRight: 6,
    fontFamily: Platform.OS === 'ios' ? 'Futura-Bold' : 'sans-serif-condensed',
  },
  starsRow: {
    flexDirection: 'row',
    marginRight: 8,
  },
  reviewCount: {
    fontSize: 14,
    color: '#666666',
    fontFamily: Platform.OS === 'ios' ? 'Futura-Medium' : 'sans-serif',
  },
  divider: {
    height: 3,
    backgroundColor: '#FFE500', // LEGO yellow
    borderRadius: 1.5,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80, // Extra padding for the back button
  },
  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#0C0A00',
    // Add LEGO shadow effect
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewUser: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#006DB7', // LEGO blue
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#0C0A00',
  },
  userInitial: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Futura-Bold' : 'sans-serif-condensed',
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0C0A00',
    fontFamily: Platform.OS === 'ios' ? 'Futura-Bold' : 'sans-serif-condensed',
  },
  reviewDate: {
    fontSize: 12,
    color: '#666666',
    fontFamily: Platform.OS === 'ios' ? 'Futura-Medium' : 'sans-serif',
  },
  ratingContainer: {
    flexDirection: 'row',
  },
  reviewComment: {
    fontSize: 15,
    lineHeight: 22,
    color: '#333333',
    fontFamily: Platform.OS === 'ios' ? 'Futura-Medium' : 'sans-serif',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666666',
    marginTop: 16,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Futura-Bold' : 'sans-serif-condensed',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999999',
    marginTop: 8,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Futura-Medium' : 'sans-serif',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666666',
    fontFamily: Platform.OS === 'ios' ? 'Futura-Medium' : 'sans-serif',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#E3000B',
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'Futura-Medium' : 'sans-serif',
  },
  retryButton: {
    backgroundColor: '#E3000B',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#0C0A00',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Futura-Bold' : 'sans-serif-condensed',
  },
  backToProductButton: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: '#006DB7', // LEGO blue
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#0C0A00',
    // Add LEGO shadow effect
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  backToProductText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
    fontFamily: Platform.OS === 'ios' ? 'Futura-Bold' : 'sans-serif-condensed',
  },
  // New styles for the "Write a Review" button and modal
  writeReviewButton: {
    backgroundColor: '#E3000B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 16,
    borderWidth: 2,
    borderColor: '#0C0A00',
  },
  writeReviewText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
    fontFamily: Platform.OS === 'ios' ? 'Futura-Bold' : 'sans-serif-condensed',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    borderRadius: 12,
    padding: 20,
    borderWidth: 3,
    borderColor: '#0C0A00',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0C0A00',
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Futura-Bold' : 'sans-serif-condensed',
  },
  modalProductInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#DDDDDD',
  },
  modalProductImage: {
    width: 50,
    height: 50,
    borderRadius: 6,
    backgroundColor: '#EEEEEE',
    borderWidth: 1,
    borderColor: '#CCCCCC',
  },
  modalProductName: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0C0A00',
    fontFamily: Platform.OS === 'ios' ? 'Futura-Medium' : 'sans-serif',
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0C0A00',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Futura-Bold' : 'sans-serif-condensed',
  },
  ratingSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  starSelectable: {
    padding: 5,
  },
  commentLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0C0A00',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Futura-Bold' : 'sans-serif-condensed',
  },
  commentInput: {
    borderWidth: 2,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F9F9F9',
    textAlignVertical: 'top',
    fontFamily: Platform.OS === 'ios' ? 'Futura-Medium' : 'sans-serif',
  },
  charCount: {
    alignItems: 'flex-end',
    marginTop: 8,
    marginBottom: 16,
  },
  charCountText: {
    color: '#999',
    fontSize: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CCCCCC',
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#666666',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Futura-Medium' : 'sans-serif-condensed',
  },
  submitButton: {
    backgroundColor: '#006DB7',
    borderColor: '#0C0A00',
    marginLeft: 8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Futura-Bold' : 'sans-serif-condensed',
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
    borderColor: '#AAAAAA',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    alignSelf: 'flex-end',
  },
  editButtonText: {
    color: '#006DB7',
    marginLeft: 4,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Futura-Medium' : 'sans-serif',
  },
  addReviewButton: {
    marginTop: 16,
    backgroundColor: '#E3000B',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#0C0A00',
  },
  addReviewButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Futura-Bold' : 'sans-serif-condensed',
  },
  editPromptContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: 'rgba(0, 109, 183, 0.1)', // Light blue
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#006DB7',
    alignItems: 'center',
  },
  editPromptText: {
    color: '#006DB7',
    textAlign: 'center',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Futura-Medium' : 'sans-serif',
  },
});
