import { configureStore } from '@reduxjs/toolkit';
import productReducer from './slices/productSlice';
import notificationReducer from './slices/notificationSlice';
import orderReducer from './slices/orderSlices';
import reviewReducer from './slices/reviewSlice';

export const store = configureStore({
  reducer: {
    products: productReducer,
    notifications: notificationReducer,
    orders: orderReducer,
    reviews: reviewReducer,
  },
  // Add middleware configuration for better dev experience
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // Disable for FormData objects if needed
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;