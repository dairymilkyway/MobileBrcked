import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { API_BASE_URL } from '@/env';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkReviewEligibility, submitProductReview, updateProductReview } from '@/utils/api';

// Define interfaces
interface Review {
  _id: string;
  Name: string;
  Rating: number;
  Comment: string;
  Reviewdate: string;
  UserID: {
    username: string;
    email: string;
    _id: string;
  } | string;
}

interface ProductInfo {
  name: string;
  imageURL: string[];
}

interface RatingData {
  averageRating: number;
  totalReviews: number;
}

interface ReviewEligibility {
  canReview: boolean;
  hasPurchased: boolean;
  hasReviewed: boolean;
  existingReviewId: string | null;
}

// Define the state interface
interface ReviewState {
  reviews: Review[];
  product: ProductInfo | null;
  ratings: RatingData;
  reviewEligibility: ReviewEligibility;
  loading: boolean;
  ratingLoading: boolean;
  eligibilityLoading: boolean;
  submitting: boolean;
  error: string | null;
}

// Initial state
const initialState: ReviewState = {
  reviews: [],
  product: null,
  ratings: {
    averageRating: 0,
    totalReviews: 0
  },
  reviewEligibility: {
    canReview: false,
    hasPurchased: false,
    hasReviewed: false,
    existingReviewId: null
  },
  loading: false,
  ratingLoading: false,
  eligibilityLoading: false,
  submitting: false,
  error: null
};

// Async thunks
export const fetchProductReviews = createAsyncThunk(
  'reviews/fetchProductReviews',
  async (productId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/reviews/product/${productId}`);
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error('Error response:', errorText);
        throw new Error(`Error ${response.status}: Failed to fetch reviews`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        return data.reviews || [];
      } else {
        throw new Error(data.message || 'Failed to load reviews');
      }
    } catch (err: any) {
      console.error('Error fetching reviews:', err);
      return rejectWithValue(err.message || 'Failed to load reviews');
    }
  }
);

export const fetchProductInfo = createAsyncThunk(
  'reviews/fetchProductInfo',
  async (productId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/products/${productId}`);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: Failed to fetch product info`);
      }
      
      const data = await response.json();
      if (data.success && data.data) {
        return {
          name: data.data.name,
          imageURL: data.data.imageURL || []
        };
      } else {
        throw new Error('Failed to get product information');
      }
    } catch (err: any) {
      console.error('Error fetching product info:', err);
      return rejectWithValue(err.message || 'Failed to get product information');
    }
  }
);

export const fetchProductRatings = createAsyncThunk(
  'reviews/fetchProductRatings',
  async (productId: string, { rejectWithValue }) => {
    try {
      const apiUrl = `${API_BASE_URL}/reviews/product/${productId}/rating`;
      console.log(`Fetching product ratings from: ${apiUrl}`);
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        console.error(`Failed to fetch ratings: ${response.status}`);
        throw new Error(`Failed to fetch ratings: ${response.status}`);
      }
      
      const ratingData = await response.json();
      if (ratingData.success) {
        return {
          averageRating: ratingData.averageRating || 0,
          totalReviews: ratingData.totalReviews || 0
        };
      } else {
        console.error('API returned failure for ratings:', ratingData.message);
        throw new Error(ratingData.message || 'Failed to fetch ratings');
      }
    } catch (err: any) {
      console.error('Error fetching product ratings:', err);
      return rejectWithValue(err.message || 'Failed to fetch ratings');
    }
  }
);

export const checkReviewEligibilityThunk = createAsyncThunk(
  'reviews/checkEligibility',
  async (productId: string, { rejectWithValue }) => {
    try {
      const result = await checkReviewEligibility(productId);
      
      if (result.success) {
        return {
          canReview: result.canReview,
          hasPurchased: result.hasPurchased,
          hasReviewed: result.hasReviewed,
          existingReviewId: result.existingReviewId
        };
      } else {
        throw new Error(result.message || 'Failed to check review eligibility');
      }
    } catch (err: any) {
      console.error('Error checking review eligibility:', err);
      return rejectWithValue(err.message || 'Failed to check review eligibility');
    }
  }
);

export const submitReview = createAsyncThunk(
  'reviews/submitReview',
  async ({ 
    productId, 
    rating, 
    comment, 
    isEdit = false,
    reviewId = null 
  }: { 
    productId: string, 
    rating: number, 
    comment: string,
    isEdit?: boolean,
    reviewId?: string | null
  }, { rejectWithValue, dispatch }) => {
    try {
      if (isEdit && reviewId) {
        // Update existing review
        await updateProductReview(reviewId, rating, comment);
        
        // Refresh reviews after updating
        dispatch(fetchProductReviews(productId));
        return { success: true, message: 'Review updated successfully' };
      } else {
        // Create new review
        await submitProductReview(productId, rating, comment);
        
        // Refresh reviews after submitting
        dispatch(fetchProductReviews(productId));
        return { success: true, message: 'Review submitted successfully' };
      }
    } catch (err: any) {
      console.error('Error submitting review:', err);
      return rejectWithValue(err.message || 'Failed to submit review');
    }
  }
);

// Create the slice
const reviewSlice = createSlice({
  name: 'reviews',
  initialState,
  reducers: {
    clearReviewState: (state) => {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    // Handle fetchProductReviews
    builder
      .addCase(fetchProductReviews.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProductReviews.fulfilled, (state, action: PayloadAction<Review[]>) => {
        state.loading = false;
        state.reviews = action.payload;
        state.error = null;
      })
      .addCase(fetchProductReviews.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to load reviews';
      })
      
    // Handle fetchProductInfo
      .addCase(fetchProductInfo.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProductInfo.fulfilled, (state, action: PayloadAction<ProductInfo>) => {
        state.loading = false;
        state.product = action.payload;
        state.error = null;
      })
      .addCase(fetchProductInfo.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to get product information';
      })
      
    // Handle fetchProductRatings
      .addCase(fetchProductRatings.pending, (state) => {
        state.ratingLoading = true;
        state.error = null;
      })
      .addCase(fetchProductRatings.fulfilled, (state, action: PayloadAction<RatingData>) => {
        state.ratingLoading = false;
        state.ratings = action.payload;
        state.error = null;
      })
      .addCase(fetchProductRatings.rejected, (state, action) => {
        state.ratingLoading = false;
        state.error = action.payload as string || 'Failed to fetch ratings';
      })
      
    // Handle checkReviewEligibilityThunk
      .addCase(checkReviewEligibilityThunk.pending, (state) => {
        state.eligibilityLoading = true;
        state.error = null;
      })
      .addCase(checkReviewEligibilityThunk.fulfilled, (state, action: PayloadAction<ReviewEligibility>) => {
        state.eligibilityLoading = false;
        state.reviewEligibility = action.payload;
        state.error = null;
      })
      .addCase(checkReviewEligibilityThunk.rejected, (state, action) => {
        state.eligibilityLoading = false;
        state.error = action.payload as string || 'Failed to check review eligibility';
      })
      
    // Handle submitReview
      .addCase(submitReview.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(submitReview.fulfilled, (state) => {
        state.submitting = false;
        state.error = null;
      })
      .addCase(submitReview.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload as string || 'Failed to submit review';
      });
  },
});

export const { clearReviewState } = reviewSlice.actions;
export default reviewSlice.reducer;
