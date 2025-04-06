const { Expo } = require('expo-server-sdk');

// Create a new Expo SDK client
const expo = new Expo();

/**
 * Send push notification to a specific user
 * @param {string} pushToken - The Expo push token
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} data - Additional data to send with the notification
 * @returns {Promise<Object>} - Result of the notification
 */
const sendPushNotification = async (pushToken, title, body, data = {}) => {
  console.log('============================================');
  console.log('SENDING PUSH NOTIFICATION');
  console.log('============================================');
  console.log(`To: ${pushToken}`);
  console.log(`Title: ${title}`);
  console.log(`Body: ${body}`);
  console.log(`Data:`, data);
  
  // Check if the push token is valid
  if (!pushToken) {
    console.error('Push token is null or empty');
    return { success: false, error: 'Push token is null or empty' };
  }
  
  // Check if the push token is valid
  if (!Expo.isExpoPushToken(pushToken)) {
    console.error(`Push token ${pushToken} is not a valid Expo push token`);
    return { success: false, error: 'Invalid push token' };
  }

  // Ensure uniqueness to prevent Expo from deduplicating notifications
  const uniqueId = data.timestamp || Date.now() + Math.floor(Math.random() * 1000);
  
  // Construct the message
  const message = {
    to: pushToken,
    sound: 'default',
    title,
    body,
    data: {
      ...data,
      title, // Include title and body in data for consistency
      body,
      orderId: data.orderId, // Ensure orderId is in the right place
      status: data.status,
      showModal: data.showModal || false,
      uniqueId // Ensure every notification has a unique identifier
    },
    priority: 'high', // Add high priority
    channelId: data.channelId || 'default', // Use channel from data or default
    // Add iOS specific options
    badge: 1,
    // iOS specific configuration
    _displayInForeground: true,
    _contentAvailable: true,
    _mutableContent: true,
    _interruptionLevel: 'timeSensitive', // iOS 15+ for faster delivery
    _relevanceScore: 1.0, // Maximum relevance for faster delivery
  };
  
  // For iOS devices, we need to ensure the notification can be handled while app is in background
  if (pushToken.startsWith('ExponentPushToken[')) {
    message._contentAvailable = true;
    message._mutableContent = true;
    
    // If this is an order notification, set the category for iOS action handling
    if (data.type === 'orderUpdate') {
      message._category = 'ORDER_UPDATE';
    } else if (data.type === 'newProduct') {
      message._category = 'NEW_PRODUCT';
    }
  }

  // For Android, ensure the right channel is used
  if (data.channelId) {
    console.log(`Using notification channel: ${data.channelId}`);
  }

  try {
    console.log('Creating notification chunks...');
    // Send the notification
    const chunks = expo.chunkPushNotifications([message]);
    console.log(`Created ${chunks.length} chunks`);
    
    const tickets = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      try {
        console.log(`Sending chunk ${i + 1}/${chunks.length}...`);
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        console.log('Ticket chunk response:', JSON.stringify(ticketChunk));
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error(`Error sending chunk ${i + 1}/${chunks.length}:`, error);
      }
    }

    console.log('Push notification tickets:', JSON.stringify(tickets));
    
    // Check for errors in tickets
    const errors = tickets.filter(ticket => ticket.status === 'error');
    if (errors.length > 0) {
      console.error('Errors in notification tickets:', errors);
      return { 
        success: tickets.length > errors.length, 
        tickets,
        errors 
      };
    }

    console.log('Push notification sent successfully to', pushToken);
    return { success: true, tickets, uniqueId };
  } catch (error) {
    console.error('Error sending push notification:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send order status update notification to a user
 * @param {string} pushToken - The Expo push token
 * @param {string} orderId - The order ID
 * @param {string} status - The new order status
 * @returns {Promise<Object>} - Result of the notification
 */
const sendOrderStatusNotification = async (pushToken, orderId, status) => {
  console.log(`Preparing order status notification for order #${orderId}, status: ${status}`);
  
  const title = 'Order Update';
  let body = `Your order #${orderId} `;

  switch (status) {
    case 'processing':
      body += 'is now being processed.';
      break;
    case 'shipped':
      body += 'has been shipped! Your package is on the way.';
      break;
    case 'delivered':
      body += 'has been delivered. Enjoy!';
      break;
    case 'cancelled':
      body += 'has been cancelled.';
      break;
    default:
      body += `status has been updated to: ${status}`;
  }

  // Use a dedicated order-updates channel with higher importance for your school project
  return sendPushNotification(
    pushToken, 
    title, 
    body, 
    { 
      orderId, 
      status, 
      type: 'orderUpdate',
      importance: 'high',
      channelId: 'order-updates',
      showModal: true, // Add flag for modal to show when notification is tapped
      forceShow: true,  // Ensure notification is shown even if app is in foreground
      // Add additional metadata for iOS
      _displayInForeground: true,
      _contentAvailable: true,
      _category: 'ORDER_UPDATE',
      _mutableContent: true
    }
  );
};

/**
 * Send order placed notification to a user
 * @param {string} pushToken - The Expo push token
 * @param {string} orderId - The order ID
 * @param {number} total - The order total
 * @param {number} timestamp - Optional timestamp for uniqueness
 * @returns {Promise<Object>} - Result of the notification
 */
const sendOrderPlacedNotification = async (pushToken, orderId, total, timestamp = Date.now()) => {
  console.log(`Preparing order placed notification for order #${orderId} with timestamp ${timestamp}`);
  
  const title = 'Order Placed';
  const body = `Your Order Placed Successfully!`;

  // Use a dedicated order-updates channel with higher importance
  return sendPushNotification(
    pushToken, 
    title, 
    body, 
    { 
      orderId, 
      status: 'pending',
      type: 'orderPlaced',
      importance: 'high',
      channelId: 'order-updates',
      showModal: true, // Add flag for modal to show when notification is tapped
      forceShow: true,  // Ensure notification is shown even if app is in foreground
      // Add additional metadata for iOS
      _displayInForeground: true,
      _contentAvailable: true,
      _category: 'ORDER_PLACED',
      _mutableContent: true,
      timestamp, // Add timestamp for uniqueness
      uniqueId: `order-placed-${orderId}-${timestamp}` // Additional uniqueness
    }
  );
};

/**
 * Send new product notification to a user
 * @param {string} pushToken - The Expo push token
 * @param {string} productId - The product ID
 * @param {string} productName - The name of the product
 * @param {number} timestamp - Optional timestamp for uniqueness
 * @returns {Promise<Object>} - Result of the notification
 */
const sendNewProductNotification = async (pushToken, productId, productName, timestamp = Date.now()) => {
  console.log(`Preparing new product notification for product #${productId} (${productName}) with timestamp ${timestamp}`);
  
  const title = '🔥 New Product Alert! 🛍️';
  const body = `✨ Check out our new product: ${productName} 🤩`;

  // Create a unique identifier that combines token hash, productId and timestamp
  // This helps Expo's deduplication and our app's deduplication
  const tokenHash = pushToken.substring(pushToken.length - 8);
  const uniqueId = `new-product-${productId}-${tokenHash}-${timestamp}`;
  
  // The random component further ensures uniqueness
  const randomComponent = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  const trackingId = `${productId}-${timestamp}-${randomComponent}`;
  
  console.log(`Using uniqueId: ${uniqueId} for product notification`);

  // Use a dedicated product-updates channel with high importance
  return sendPushNotification(
    pushToken, 
    title, 
    body, 
    { 
      productId, 
      type: 'newProduct',
      importance: 'high',
      priority: 'high', // Add explicit priority
      ttl: 0, // Send immediately, do not delay
      expiration: 3600, // Expire after 1 hour
      channelId: 'product-updates',
      showModal: true, // Add flag for modal to show when notification is tapped
      forceShow: true,  // Ensure notification is shown even if app is in foreground
      // Add additional metadata for iOS
      _displayInForeground: true,
      _contentAvailable: true,
      _category: 'NEW_PRODUCT',
      _mutableContent: true,
      _interruptionLevel: 'timeSensitive', // Mark as time-sensitive for iOS 15+
      _relevanceScore: 1.0, // Maximum relevance
      timestamp, // Add timestamp for uniqueness
      uniqueId, // More unique identifier
      productNotificationId: uniqueId, // Additional reference for deduplication
      trackingId, // Different ID for tracking
      sentAt: Date.now() // Explicit send time
    }
  );
};

module.exports = {
  sendPushNotification,
  sendOrderStatusNotification,
  sendOrderPlacedNotification,
  sendNewProductNotification,
}; 