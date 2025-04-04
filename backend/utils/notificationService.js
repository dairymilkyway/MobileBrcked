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
    return { error: 'Push token is null or empty' };
  }
  
  // Check if the push token is valid
  if (!Expo.isExpoPushToken(pushToken)) {
    console.error(`Push token ${pushToken} is not a valid Expo push token`);
    return { error: 'Invalid push token' };
  }

  // Construct the message
  const message = {
    to: pushToken,
    sound: 'default',
    title,
    body,
    data,
    priority: 'high', // Add high priority
    channelId: data.channelId || 'default', // Use channel from data or default
  };

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
        console.log('Ticket chunk response:', ticketChunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error(`Error sending chunk ${i + 1}/${chunks.length}:`, error);
      }
    }

    console.log('Push notification tickets:', tickets);
    
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
    return { success: true, tickets };
  } catch (error) {
    console.error('Error sending push notification:', error);
    return { error: error.message };
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
      channelId: 'order-updates'
    }
  );
};

module.exports = {
  sendPushNotification,
  sendOrderStatusNotification,
}; 