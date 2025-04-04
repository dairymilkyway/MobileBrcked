import { configureStore } from '@reduxjs/toolkit';
import productReducer from './slices/productSlice';
import notificationReducer from './slices/notificationSlice';

export const store = configureStore({
  reducer: {
    products: productReducer,
    notifications: notificationReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 