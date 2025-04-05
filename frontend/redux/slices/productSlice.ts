import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { getProducts, getProductById, createProduct, updateProduct, deleteProduct } from '../../utils/api';
import { Product, ProductFormData } from '../../types/product';
import { API_BASE_URL } from '../../env';

// API response interface to match our backend format
interface ApiResponse {
  success: boolean;
  count: number;
  total: number;
  totalPages: number;
  currentPage: number;
  data: Product[];
  message?: string;
}

export interface ProductsState {
  items: Product[];
  selectedProduct: Product | null;
  loading: boolean;
  error: string | null;
  totalPages: number;
  currentPage: number;
  // Add search and filter state
  searchQuery: string;
  categoryFilter: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  // Add productDetails loading state
  productDetailLoading: boolean;
  productDetailError: string | null;
}

const initialState: ProductsState = {
  items: [],
  selectedProduct: null,
  loading: false,
  error: null,
  totalPages: 1,
  currentPage: 1,
  // Initialize search and filter state
  searchQuery: '',
  categoryFilter: null,
  minPrice: null,
  maxPrice: null,
  // Initialize product detail state
  productDetailLoading: false,
  productDetailError: null,
};

// Async thunks
export const fetchProducts = createAsyncThunk(
  'products/fetchProducts',
  async ({ page = 1, limit = 10 }: { page: number; limit: number }, { rejectWithValue }) => {
    try {
      const result = await getProducts(page, limit);
      return result;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch products');
    }
  }
);

export const fetchProductById = createAsyncThunk(
  'products/fetchProductById',
  async (id: string, { rejectWithValue }) => {
    try {
      const product = await getProductById(id);
      return product;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch product');
    }
  }
);

export const addProduct = createAsyncThunk(
  'products/addProduct',
  async (productData: ProductFormData, { rejectWithValue }) => {
    try {
      const product = await createProduct(productData);
      return product;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create product');
    }
  }
);

export const editProduct = createAsyncThunk(
  'products/editProduct',
  async ({ id, productData }: { id: string; productData: ProductFormData }, { rejectWithValue }) => {
    try {
      const product = await updateProduct(id, productData);
      return product;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update product');
    }
  }
);

export const removeProduct = createAsyncThunk(
  'products/removeProduct',
  async (id: string, { rejectWithValue }) => {
    try {
      await deleteProduct(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete product');
    }
  }
);

// Update the async thunk for searching and filtering products
export const searchFilterProducts = createAsyncThunk(
  'products/searchFilterProducts',
  async (
    {
      query = '',
      category = null,
      minPrice = null,
      maxPrice = null,
      limit = 50,
    }: {
      query?: string;
      category?: string | null;
      minPrice?: number | null;
      maxPrice?: number | null;
      limit?: number;
    },
    { rejectWithValue }
  ) => {
    try {
      // Enhanced logging for debugging
      console.log('==========================================');
      console.log('SEARCH FILTER PRODUCTS CALLED WITH:');
      console.log('- query:', query);
      console.log('- category:', category);
      console.log('- minPrice:', minPrice);
      console.log('- maxPrice:', maxPrice);
      
      // Construct API URL properly to handle both search and filters
      let apiUrl = `${API_BASE_URL}/products`;
      const queryParams = new URLSearchParams();
      
      // Set limit parameter
      queryParams.append('limit', limit.toString());
      
      // IMPORTANT: There are two different API endpoints we might use:
      // 1. /products/search/:query - For search queries
      // 2. /products?category=X - For filters without search
      
      // Check if we're doing a search
      const isSearching = query && query.trim().length > 0;
      
      // Add category filter
      if (category) {
        if (isSearching) {
          // If we're searching, add category as parameter to search endpoint
          console.log(`Adding category param with search: category=${category}`);
          queryParams.append('category', category);
        } else {
          // If no search, just use category filter
          console.log(`Using category filter: ${category}`);
          queryParams.append('category', category);
        }
      }
      
      // Add price range
      if (minPrice !== null) {
        queryParams.append('minPrice', minPrice.toString());
      }
      
      if (maxPrice !== null) {
        queryParams.append('maxPrice', maxPrice.toString());
      }
      
      // Add search query if present - this modifies the base URL
      if (isSearching) {
        apiUrl += `/search/${encodeURIComponent(query.trim())}`;
      }
      
      // Combine URL and query parameters
      const finalUrl = `${apiUrl}?${queryParams.toString()}`;
      console.log(`Final API URL: ${finalUrl}`);
      
      // Make the API request
      const response = await fetch(finalUrl);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Server responded with status: ${response.status}`
        );
      }
      
      const responseData: ApiResponse = await response.json();
      console.log(`Search found ${responseData.data?.length || 0} products`);
      
      if (responseData.success) {
        // Apply strict client-side filtering
        let filteredProducts = responseData.data || [];
        
        // Apply strict category filter - MODIFIED
        if (category) {
          console.log(`Applying strict category filter for: ${category}`);
          // STRICT filtering - Always filter by category when specified
          filteredProducts = filteredProducts.filter(product => 
            product.category.toLowerCase() === category.toLowerCase()
          );
          
          console.log(`After strict category filter: ${filteredProducts.length} products remain`);
        }
        
        // Apply price filtering here if needed
        // ...existing code...
        
        console.log('==========================================');
        return {
          products: filteredProducts,
          totalPages: responseData.totalPages,
          currentPage: responseData.currentPage,
        };
      } else {
        throw new Error(responseData.message || 'Failed to search products');
      }
    } catch (error: any) {
      console.error('Error searching products:', error);
      return rejectWithValue(error.message || 'Failed to search products');
    }
  }
);

// Enhanced async thunk for fetching product details
export const fetchProductDetail = createAsyncThunk(
  'products/fetchProductDetail',
  async (id: string, { rejectWithValue }) => {
    try {
      const controller = new AbortController();
      const { signal } = controller;
      
      // Set timeout for request
      const timeout = setTimeout(() => {
        controller.abort();
      }, 10000); // 10 second timeout
      
      const apiUrl = `${API_BASE_URL}/products/${id}`;
      console.log(`Fetching product details from: ${apiUrl}`);
      
      const response = await fetch(apiUrl, { signal });
      clearTimeout(timeout);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Server responded with status: ${response.status}`
        );
      }
      
      const responseData = await response.json();
      
      if (responseData.success) {
        return responseData.data;
      } else {
        throw new Error(responseData.message || 'Failed to fetch product details');
      }
    } catch (error: any) {
      console.error('Error fetching product details:', error);
      if (error.name === 'AbortError') {
        return rejectWithValue('Request timed out. Please check your connection and try again.');
      } else if (error.message.includes('Network request failed')) {
        return rejectWithValue('Network error. Please check your connection and server status.');
      } else {
        return rejectWithValue(error.message || 'Failed to fetch product details');
      }
    }
  }
);

const productSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    clearSelectedProduct: (state) => {
      state.selectedProduct = null;
      state.productDetailError = null;
    },
    setCurrentPage: (state, action: PayloadAction<number>) => {
      state.currentPage = action.payload;
    },
    // Add actions for search and filter state
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    setCategoryFilter: (state, action: PayloadAction<string | null>) => {
      state.categoryFilter = action.payload;
    },
    setPriceRange: (state, action: PayloadAction<{min: number | null, max: number | null}>) => {
      state.minPrice = action.payload.min;
      state.maxPrice = action.payload.max;
    },
    clearFilters: (state) => {
      state.searchQuery = '';
      state.categoryFilter = null;
      state.minPrice = null;
      state.maxPrice = null;
    }
  },
  extraReducers: (builder) => {
    // Handle fetchProducts
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.data;
        state.totalPages = action.payload.totalPages;
        state.currentPage = action.meta.arg.page;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Handle fetchProductById
    builder
      .addCase(fetchProductById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProductById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedProduct = action.payload;
      })
      .addCase(fetchProductById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Handle addProduct
    builder
      .addCase(addProduct.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addProduct.fulfilled, (state, action) => {
        state.loading = false;
        state.items.push(action.payload);
      })
      .addCase(addProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Handle editProduct
    builder
      .addCase(editProduct.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(editProduct.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.items.findIndex(item => item._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        state.selectedProduct = action.payload;
      })
      .addCase(editProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Handle removeProduct
    builder
      .addCase(removeProduct.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeProduct.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.filter(item => item._id !== action.payload);
      })
      .addCase(removeProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
    
    // Handle searchFilterProducts
    builder
      .addCase(searchFilterProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(searchFilterProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.products;
        state.totalPages = action.payload.totalPages;
        state.currentPage = action.payload.currentPage;
      })
      .addCase(searchFilterProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
      
    // Handle fetchProductDetail
    builder
      .addCase(fetchProductDetail.pending, (state) => {
        state.productDetailLoading = true;
        state.productDetailError = null;
      })
      .addCase(fetchProductDetail.fulfilled, (state, action) => {
        state.productDetailLoading = false;
        state.selectedProduct = action.payload;
      })
      .addCase(fetchProductDetail.rejected, (state, action) => {
        state.productDetailLoading = false;
        state.productDetailError = action.payload as string;
      });
  },
});

export const { 
  clearSelectedProduct, 
  setCurrentPage,
  setSearchQuery,
  setCategoryFilter,
  setPriceRange,
  clearFilters
} = productSlice.actions;

export default productSlice.reducer;