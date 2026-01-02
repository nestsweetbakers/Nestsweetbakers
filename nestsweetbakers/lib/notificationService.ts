import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  writeBatch,
  limit,
  orderBy,
} from 'firebase/firestore';
import { db } from './firebase';

export interface Notification {
  id?: string;
  userId: string;
  title: string;
  message: string;
  type: 'order' | 'product' | 'system' | 'promo' | 'info';
  // Use `read` to be compatible with NotificationsPage + header unread counter
  read: boolean;
  createdAt: any;
  link?: string; // used by this service
  metadata?: any;
}

class NotificationService {
  // Send a notification to a specific user
  async sendNotification(
    userId: string,
    title: string,
    message: string,
    type: Notification['type'],
    link?: string,
    metadata?: any
  ): Promise<void> {
    try {
      await addDoc(collection(db, 'notifications'), {
        userId,
        title,
        message,
        type,
        read: false,
        createdAt: serverTimestamp(),
        link,
        metadata,
      });
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }

  // Send notification to all users (broadcast) - OPTIMIZED with batching
  async sendBroadcastNotification(
    title: string,
    message: string,
    type: Notification['type'],
    link?: string
  ): Promise<{ success: boolean; count: number }> {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const userIds = usersSnapshot.docs.map((docSnap) => docSnap.id);

      // Firebase batch limit is 500 operations
      const BATCH_SIZE = 500;
      let totalNotifications = 0;

      for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const batchUserIds = userIds.slice(i, i + BATCH_SIZE);

        batchUserIds.forEach((userId) => {
          const notifRef = doc(collection(db, 'notifications'));
          batch.set(notifRef, {
            userId,
            title,
            message,
            type,
            read: false,
            createdAt: serverTimestamp(),
            link,
          });
        });

        await batch.commit();
        totalNotifications += batchUserIds.length;
      }

      return { success: true, count: totalNotifications };
    } catch (error) {
      console.error('Error sending broadcast notification:', error);
      return { success: false, count: 0 };
    }
  }

  // Notify all users about a single new product
  async notifyNewProduct(product: any): Promise<void> {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));

      // Use batch writes for efficiency
      const BATCH_SIZE = 500;
      const userIds = usersSnapshot.docs.map((docSnap) => docSnap.id);

      for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const batchUserIds = userIds.slice(i, i + BATCH_SIZE);

        batchUserIds.forEach((userId) => {
          const notifRef = doc(collection(db, 'notifications'));
          batch.set(notifRef, {
            userId,
            title: '🎂 New Cake Available!',
            message: `Check out our new ${product.name} starting at ₹${product.basePrice}!`,
            type: 'product',
            read: false,
            createdAt: serverTimestamp(),
            link: `/cakes/${product.id}`,
            metadata: { productId: product.id, productName: product.name },
          });
        });

        await batch.commit();
      }
    } catch (error) {
      console.error('Error notifying new product:', error);
      // Don't throw error to prevent blocking product creation
    }
  }

  // Notify all users about multiple new products (bulk import)
  async notifyBulkProducts(count: number): Promise<void> {
    try {
      await this.sendBroadcastNotification(
        '🎉 New Cakes Added!',
        `${count} delicious new cake${count > 1 ? 's' : ''} just added to our collection. Explore them now!`,
        'product',
        '/cakes'
      );
    } catch (error) {
      console.error('Error notifying bulk products:', error);
    }
  }

  // Notify user about order status change
  async notifyOrderStatusChange(params: {
    orderId: string;
    userId: string;
    customerName: string;
    cakeName: string;
    oldStatus: string;
    newStatus: string;
  }): Promise<void> {
    try {
      let title = '';
      let message = '';
      let emoji = '';

      switch (params.newStatus) {
        case 'pending':
          emoji = '⏳';
          title = 'Order Received';
          message = `Your order for ${params.cakeName} has been received and is pending confirmation.`;
          break;
        case 'confirmed':
          emoji = '✅';
          title = 'Order Confirmed';
          message = `Great news! Your order for ${params.cakeName} has been confirmed.`;
          break;
        case 'processing':
          emoji = '🔄';
          title = 'Order Being Prepared';
          message = `We're now preparing your delicious ${params.cakeName}.`;
          break;
        case 'ready':
          emoji = '📦';
          title = 'Order Ready';
          message = `Your ${params.cakeName} is ready for pickup/delivery!`;
          break;
        case 'out_for_delivery':
          emoji = '🚚';
          title = 'Out for Delivery';
          message = `Your ${params.cakeName} is on its way to you!`;
          break;
        case 'delivered':
          emoji = '🎉';
          title = 'Order Delivered';
          message = `Your ${params.cakeName} has been delivered. Enjoy!`;
          break;
        case 'completed':
          emoji = '✅';
          title = 'Order Completed';
          message = `Your order for ${params.cakeName} has been completed. Thank you!`;
          break;
        case 'cancelled':
          emoji = '❌';
          title = 'Order Cancelled';
          message = `Your order for ${params.cakeName} has been cancelled.`;
          break;
        default:
          emoji = '📦';
          title = 'Order Status Updated';
          message = `Your order for ${params.cakeName} status: ${params.newStatus}`;
      }

      await this.sendNotification(
        params.userId,
        `${emoji} ${title}`,
        message,
        'order',
        `/orders/${params.orderId}`,
        {
          orderId: params.orderId,
          oldStatus: params.oldStatus,
          newStatus: params.newStatus,
        }
      );
    } catch (error) {
      console.error('Error notifying order status change:', error);
      // Don't throw to prevent blocking order updates
    }
  }

  // Notify about order confirmation
  async notifyOrderConfirmation(params: {
    userId: string;
    orderId: string;
    cakeName: string;
    totalPrice: number;
    deliveryDate: string;
  }): Promise<void> {
    try {
      await this.sendNotification(
        params.userId,
        '🎉 Order Confirmed!',
        `Your order for ${params.cakeName} has been confirmed. Total: ₹${params.totalPrice}. Delivery: ${new Date(
          params.deliveryDate
        ).toLocaleDateString()}`,
        'order',
        `/orders/${params.orderId}`,
        { orderId: params.orderId }
      );
    } catch (error) {
      console.error('Error notifying order confirmation:', error);
    }
  }

  // Notify admin about new order
  async notifyAdminNewOrder(params: {
    orderId: string;
    customerName: string;
    cakeName: string;
    totalPrice: number;
  }): Promise<void> {
    try {
      // Get all admin users
      const adminsQuery = query(
        collection(db, 'users'),
        where('role', '==', 'admin')
      );
      const adminsSnapshot = await getDocs(adminsQuery);

      const batch = writeBatch(db);
      adminsSnapshot.docs.forEach((adminDoc) => {
        const notifRef = doc(collection(db, 'notifications'));
        batch.set(notifRef, {
          userId: adminDoc.id,
          title: '🛒 New Order Received!',
          message: `${params.customerName} ordered ${params.cakeName} for ₹${params.totalPrice}`,
          type: 'order',
          read: false,
          createdAt: serverTimestamp(),
          link: `/admin/orders/${params.orderId}`,
          metadata: { orderId: params.orderId },
        });
      });

      await batch.commit();
    } catch (error) {
      console.error('Error notifying admin:', error);
    }
  }

  // Notify about low stock
  async notifyAdminLowStock(params: {
    productId: string;
    productName: string;
    currentStock: number;
  }): Promise<void> {
    try {
      const adminsQuery = query(
        collection(db, 'users'),
        where('role', '==', 'admin')
      );
      const adminsSnapshot = await getDocs(adminsQuery);

      const batch = writeBatch(db);
      adminsSnapshot.docs.forEach((adminDoc) => {
        const notifRef = doc(collection(db, 'notifications'));
        batch.set(notifRef, {
          userId: adminDoc.id,
          title: '⚠️ Low Stock Alert',
          message: `${params.productName} is running low! Only ${params.currentStock} left in stock.`,
          type: 'system',
          read: false,
          createdAt: serverTimestamp(),
          link: `/admin/products`,
          metadata: { productId: params.productId, stock: params.currentStock },
        });
      });

      await batch.commit();
    } catch (error) {
      console.error('Error notifying low stock:', error);
    }
  }

  // Notify about out of stock
  async notifyAdminOutOfStock(params: {
    productId: string;
    productName: string;
  }): Promise<void> {
    try {
      const adminsQuery = query(
        collection(db, 'users'),
        where('role', '==', 'admin')
      );
      const adminsSnapshot = await getDocs(adminsQuery);

      const batch = writeBatch(db);
      adminsSnapshot.docs.forEach((adminDoc) => {
        const notifRef = doc(collection(db, 'notifications'));
        batch.set(notifRef, {
          userId: adminDoc.id,
          title: '❌ Out of Stock',
          message: `${params.productName} is now out of stock! Please restock immediately.`,
          type: 'system',
          read: false,
          createdAt: serverTimestamp(),
          link: `/admin/products`,
          metadata: { productId: params.productId },
        });
      });

      await batch.commit();
    } catch (error) {
      console.error('Error notifying out of stock:', error);
    }
  }

  // Notify about custom request status
  async notifyCustomRequestStatus(params: {
    userId: string;
    requestId: string;
    occasion: string;
    status: string;
    estimatedPrice?: number;
  }): Promise<void> {
    try {
      let title = '';
      let message = '';
      let emoji = '';

      switch (params.status) {
        case 'pending':
          emoji = '⏳';
          title = 'Custom Request Received';
          message = `Your custom ${params.occasion} cake request has been received. We'll review it shortly!`;
          break;
        case 'approved':
          emoji = '✅';
          title = 'Custom Request Approved';
          message = params.estimatedPrice
            ? `Your custom ${params.occasion} cake request has been approved! Estimated price: ₹${params.estimatedPrice}`
            : `Your custom ${params.occasion} cake request has been approved!`;
          break;
        case 'rejected':
          emoji = '❌';
          title = 'Custom Request Update';
          message = `Unfortunately, we cannot fulfill your ${params.occasion} cake request at this time.`;
          break;
        case 'in_progress':
          emoji = '🔄';
          title = 'Custom Cake in Progress';
          message = `We're working on your custom ${params.occasion} cake!`;
          break;
        case 'completed':
          emoji = '🎉';
          title = 'Custom Cake Ready';
          message = `Your custom ${params.occasion} cake is ready!`;
          break;
        default:
          emoji = '📝';
          title = 'Custom Request Update';
          message = `Your ${params.occasion} cake request status: ${params.status}`;
      }

      await this.sendNotification(
        params.userId,
        `${emoji} ${title}`,
        message,
        'order',
        `/custom-requests/${params.requestId}`,
        { requestId: params.requestId, status: params.status }
      );
    } catch (error) {
      console.error('Error notifying custom request status:', error);
    }
  }

  // Promotional notification to specific users
  async sendPromoNotification(params: {
    userIds: string[];
    title: string;
    message: string;
    link?: string;
    code?: string;
  }): Promise<void> {
    try {
      const batch = writeBatch(db);

      params.userIds.forEach((userId) => {
        const notifRef = doc(collection(db, 'notifications'));
        batch.set(notifRef, {
          userId,
          title: params.title,
          message: params.message,
          type: 'promo',
          read: false,
          createdAt: serverTimestamp(),
          link: params.link || '/cakes',
          metadata: { promoCode: params.code },
        });
      });

      await batch.commit();
    } catch (error) {
      console.error('Error sending promo notification:', error);
    }
  }

  // Get user notifications with pagination
  async getUserNotifications(
    userId: string,
    limitCount = 20,
    unreadOnly = false
  ): Promise<Notification[]> {
    try {
      let q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      if (unreadOnly) {
        q = query(
          collection(db, 'notifications'),
          where('userId', '==', userId),
          where('read', '==', false),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        );
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(
        (docSnap) =>
          ({
            id: docSnap.id,
            ...docSnap.data(),
          } as Notification)
      );
    } catch (error) {
      console.error('Error getting user notifications:', error);
      return [];
    }
  }

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true,
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Mark all user notifications as read
  async markAllAsRead(userId: string): Promise<void> {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('read', '==', false)
      );

      const snapshot = await getDocs(q);
      const batch = writeBatch(db);

      snapshot.docs.forEach((docSnap) => {
        batch.update(doc(db, 'notifications', docSnap.id), { read: true });
      });

      await batch.commit();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  // Get unread count
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('read', '==', false)
      );

      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  // "Delete" notification (soft delete by marking read)
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true,
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  // Delete all notifications for a user (hard delete)
  async deleteAllUserNotifications(userId: string): Promise<void> {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId)
      );

      const snapshot = await getDocs(q);
      const batch = writeBatch(db);

      snapshot.docs.forEach((docSnap) => {
        batch.delete(doc(db, 'notifications', docSnap.id));
      });

      await batch.commit();
    } catch (error) {
      console.error('Error deleting all notifications:', error);
      throw error;
    }
  }
}

export const notificationService = new NotificationService();

// Helper: notify all users when a new product (cake) is added.
// Uses `read` + `actionUrl` so it works perfectly with NotificationsPage.
export async function notifyNewProduct(
  productId: string,
  productName: string,
  productImage?: string
) {
  const usersSnapshot = await getDocs(collection(db, 'users'));

  const promises = usersSnapshot.docs.map((userDoc) =>
    addDoc(collection(db, 'notifications'), {
      userId: userDoc.id,
      type: 'product',
      title: '🎉 New Cake Added!',
      message: `Check out our new ${productName}! Fresh and delicious, available now.`,
      productId,
      imageUrl: productImage,
      actionUrl: productId ? `/cakes/${productId}` : '/cakes',
      read: false,
      createdAt: serverTimestamp(),
    })
  );

  await Promise.all(promises);
}
