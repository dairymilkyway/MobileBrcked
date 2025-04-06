// Add this function to directly handle notification responses
export const registerBackgroundNotificationHandler = () => {
  // When app is in background, this taskName will be triggered
  const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND_NOTIFICATION_TASK';

  // Define the task that will run when a notification is opened from background
  Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK, async ({ data, error, executionInfo }) => {
    if (error) {
      console.error("Error in background notification task:", error);
      return;
    }

    try {
      console.log("Background notification task triggered with data:", data);
      
      // Check if this is an order notification (update or placed)
      if ((data.type === 'orderUpdate' || data.type === 'orderPlaced') && data.orderId) {
        console.log(`Background notification for ${data.type} received with orderId:`, data.orderId);
        
        if (data.type === 'orderPlaced') {
          console.log("BACKGROUND ORDER PLACED NOTIFICATION RECEIVED:", {
            orderId: data.orderId,
            type: data.type,
            timestamp: Date.now()
          });
        }
        
        // Store the data for the app to handle when it opens
        const pendingOrders = await AsyncStorage.getItem('pendingOrderModals') || '[]';
        const orders = JSON.parse(pendingOrders);
        
        // Add this order to the pending list if not already there
        if (!orders.some(order => order.orderId === data.orderId)) {
          orders.push({
            orderId: data.orderId,
            status: data.status || 'pending',
            type: data.type,
            timestamp: Date.now(),
            showModal: true,
            forceShow: true,
            immediate: true
          });
          
          await AsyncStorage.setItem('pendingOrderModals', JSON.stringify(orders));
          console.log(`Added ${data.type} for order ${data.orderId} to pending modals`);
        }
      }
      // Check if this is a product notification
      else if (data.type === 'newProduct' && data.productId) {
        console.log(`Background notification for new product received with productId:`, data.productId);
        
        // Store the data for the app to handle when it opens
        const pendingProducts = await AsyncStorage.getItem('pendingProductModals') || '[]';
        const products = JSON.parse(pendingProducts);
        
        // Add this product to the pending list if not already there
        if (!products.some(product => product.productId === data.productId)) {
          products.push({
            productId: data.productId,
            type: data.type,
            timestamp: Date.now(),
            showModal: true,
            forceShow: true,
            immediate: true
          });
          
          await AsyncStorage.setItem('pendingProductModals', JSON.stringify(products));
          console.log(`Added new product ${data.productId} to pending modals`);
        }
      }
    } catch (error) {
      console.error("Error processing background notification:", error);
    }
  });
}; 