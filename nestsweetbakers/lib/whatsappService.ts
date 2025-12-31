// lib/whatsappService.ts
import { SiteSettings } from '@/hooks/useSettings';

// ==================== INTERFACES ====================

interface CustomCakeRequest {
  name: string;
  phone: string;
  email?: string;
  occasion: string;
  flavor: string;
  size: string;
  design: string;
  budget: string;
  deliveryDate: string;
  message?: string;
  servings?: string;
  tier?: string;
  eggless?: boolean;
  deliveryAddress?: string;
  urgency?: string;
  referenceImages?: string[];
  requestId?: string;
}

interface OrderItem {
  cakeName: string;
  quantity: number;
  weight: string;
  totalPrice: number;
  customization?: string;
  flavor?: string;
}

interface Order {
  id?: string;
  orderRef?: string;
  items?: OrderItem[];
  cakeName?: string; // Legacy
  quantity?: number; // Legacy
  totalPrice?: number; // Legacy
  total?: number;
  customerName?: string;
  userName?: string;
  customerPhone?: string;
  userPhone?: string;
  deliveryDate: string;
  deliveryTime?: string;
  deliveryAddress: string;
  status: string;
  paymentMethod?: string;
  specialInstructions?: string;
  isGift?: boolean;
  recipientName?: string;
  occasionType?: string;
}

// ==================== UTILITY FUNCTIONS ====================

export function sendWhatsAppMessage(phoneNumber: string, message: string): void {
  const cleanNumber = phoneNumber.replace(/\D/g, '');
  const formattedNumber = cleanNumber.startsWith('91') ? cleanNumber : `91${cleanNumber}`;
  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${formattedNumber}?text=${encodedMessage}`;
  
  if (typeof window !== 'undefined') {
    window.open(whatsappUrl, '_blank');
  }
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

function getDeliveryTimeSlot(time?: string): string {
  if (!time) return 'Morning (9 AM - 12 PM)';
  
  const slots: { [key: string]: string } = {
    'morning': '🌅 Morning (9 AM - 12 PM)',
    'afternoon': '☀️ Afternoon (12 PM - 4 PM)',
    'evening': '🌆 Evening (4 PM - 8 PM)'
  };
  
  return slots[time] || time;
}

// ==================== ADMIN NOTIFICATIONS ====================

export function generateCustomRequestAdminMessage(
  request: CustomCakeRequest,
  settings: SiteSettings
): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://nestsweetbakers.com';
  const urgencyBadge = request.urgency === 'urgent' ? '🔴 *URGENT REQUEST*' : '🟢 *NEW REQUEST*';
  const egglessBadge = request.eggless ? '🥚 *Eggless*' : '';
  
  let message = `${urgencyBadge}\n`;
  message += `🎂 *CUSTOM CAKE REQUEST RECEIVED*\n\n`;
  
  message += `╔═══════════════════════╗\n`;
  message += `║  📋 REQUEST #${(request.requestId || 'PENDING').slice(0, 8).toUpperCase()}  ║\n`;
  message += `╚═══════════════════════╝\n\n`;
  
  // Customer Details
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `👤 *CUSTOMER INFORMATION*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `• Name: *${request.name}*\n`;
  message += `• Phone: ${request.phone}\n`;
  if (request.email) {
    message += `• Email: ${request.email}\n`;
  }
  if (request.deliveryAddress) {
    message += `• Address: ${request.deliveryAddress}\n`;
  }
  message += `\n`;
  
  // Cake Specifications
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `🎂 *CAKE SPECIFICATIONS*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `• Occasion: *${request.occasion}* 🎉\n`;
  message += `• Flavor: *${request.flavor}*\n`;
  message += `• Size: *${request.size}*\n`;
  
  if (request.servings) {
    message += `• Servings: ${request.servings} people 👥\n`;
  }
  
  if (request.tier) {
    message += `• Tiers: ${request.tier} tier${request.tier !== '1' ? 's' : ''} 🎂\n`;
  }
  
  if (egglessBadge) {
    message += `• Type: ${egglessBadge}\n`;
  }
  
  message += `• Budget: *₹${request.budget}* 💰\n`;
  message += `• Delivery: *${formatDate(request.deliveryDate)}* 📅\n`;
  message += `\n`;
  
  // Design Description
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `🎨 *DESIGN DESCRIPTION*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `${request.design}\n`;
  message += `\n`;
  
  // Additional Notes
  if (request.message) {
    message += `━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `💬 *SPECIAL NOTES*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `${request.message}\n`;
    message += `\n`;
  }
  
  // Reference Images
  if (request.referenceImages && request.referenceImages.length > 0) {
    message += `━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `📸 *REFERENCE IMAGES* (${request.referenceImages.length})\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━\n`;
    request.referenceImages.forEach((img, idx) => {
      message += `🖼️ Image ${idx + 1}:\n${img}\n\n`;
    });
  }
  
  // Action Links
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `⚡ *QUICK ACTIONS*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `🔗 View Full Details:\n${siteUrl}/admin/custom-requests\n\n`;
  message += `📞 Contact Customer:\nhttps://wa.me/${request.phone.replace(/[^0-9]/g, '')}\n\n`;
  
  // Footer
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `⏰ Received: ${new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}\n`;
  message += `🏪 ${settings.businessName || 'NestSweet Bakers'}\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  
  return message;
}

export function generateOrderAdminMessage(
  order: Order,
  settings: SiteSettings
): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://nestsweetbakers.com';
  const orderRef = order.orderRef || order.id?.slice(0, 8).toUpperCase() || 'N/A';
  const customerName = order.userName || order.customerName || 'Customer';
  const customerPhone = order.userPhone || order.customerPhone || 'N/A';
  
  let message = `🎉 *NEW ORDER RECEIVED!*\n\n`;
  
  message += `╔═══════════════════════╗\n`;
  message += `║   📦 ORDER #${orderRef}   ║\n`;
  message += `╚═══════════════════════╝\n\n`;
  
  // Customer Details
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `👤 *CUSTOMER*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `• Name: *${customerName}*\n`;
  message += `• Phone: ${customerPhone}\n`;
  message += `• Address: ${order.deliveryAddress}\n`;
  message += `\n`;
  
  // Order Items
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `🎂 *ORDER ITEMS*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  
  if (order.items && order.items.length > 0) {
    order.items.forEach((item, idx) => {
      message += `\n${idx + 1}. *${item.cakeName}*\n`;
      message += `   • Weight: ${item.weight}\n`;
      if (item.flavor) {
        message += `   • Flavor: ${item.flavor}\n`;
      }
      if (item.customization) {
        message += `   • Note: _${item.customization}_\n`;
      }
      message += `   • Price: *₹${item.totalPrice}*\n`;
    });
  } else {
    // Legacy format
    message += `\n• *${order.cakeName || 'Cake'}*\n`;
    message += `• Weight: ${order.quantity || 1} kg\n`;
    message += `• Price: *₹${order.totalPrice || order.total || 0}*\n`;
  }
  message += `\n`;
  
  // Delivery Details
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `📅 *DELIVERY DETAILS*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `• Date: *${formatDate(order.deliveryDate)}*\n`;
  message += `• Time: ${getDeliveryTimeSlot(order.deliveryTime)}\n`;
  
  if (order.isGift) {
    message += `• 🎁 *Gift Order*\n`;
    if (order.recipientName) {
      message += `• Recipient: ${order.recipientName}\n`;
    }
    if (order.occasionType) {
      message += `• Occasion: ${order.occasionType}\n`;
    }
  }
  message += `\n`;
  
  // Payment & Total
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `💰 *PAYMENT*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `• Method: *${(order.paymentMethod || 'COD').toUpperCase()}*\n`;
  message += `• Total: *₹${order.total || order.totalPrice || 0}*\n`;
  message += `\n`;
  
  // Special Instructions
  if (order.specialInstructions) {
    message += `━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `📝 *SPECIAL INSTRUCTIONS*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `${order.specialInstructions}\n`;
    message += `\n`;
  }
  
  // Action Links
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `⚡ *QUICK ACTIONS*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `🔗 View Order:\n${siteUrl}/admin/orders\n\n`;
  message += `📞 Contact Customer:\nhttps://wa.me/${customerPhone.replace(/[^0-9]/g, '')}\n\n`;
  
  // Footer
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `⏰ ${new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}\n`;
  message += `🏪 ${settings.businessName || 'NestSweet Bakers'}\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  
  return message;
}

// ==================== CUSTOMER NOTIFICATIONS ====================

export function generateCustomerOrderConfirmation(
  order: Order,
  settings: SiteSettings
): string {
  const orderRef = order.orderRef || order.id?.slice(0, 8).toUpperCase() || 'N/A';
  const businessName = settings.businessName || 'NestSweet Bakers';
  
  let message = `✨ *ORDER CONFIRMED!* ✨\n\n`;
  
  message += `Dear Customer,\n\n`;
  message += `Thank you for ordering from *${businessName}*! 🎂\n\n`;
  
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `📋 *ORDER DETAILS*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `Order ID: *#${orderRef}*\n`;
  message += `Status: 🟡 *${order.status.toUpperCase()}*\n\n`;
  
  // Items
  if (order.items && order.items.length > 0) {
    message += `🎂 *Your Cakes:*\n`;
    order.items.forEach((item, idx) => {
      message += `${idx + 1}. ${item.cakeName} - ${item.weight}\n`;
      if (item.customization) {
        message += `   _${item.customization}_\n`;
      }
    });
  } else {
    message += `🎂 ${order.cakeName} - ${order.quantity} kg\n`;
  }
  message += `\n`;
  
  // Delivery
  message += `📅 *Delivery:*\n`;
  message += `${formatDate(order.deliveryDate)}\n`;
  message += `${getDeliveryTimeSlot(order.deliveryTime)}\n`;
  message += `📍 ${order.deliveryAddress}\n\n`;
  
  // Total
  message += `💰 *Total Amount:* ₹${order.total || order.totalPrice || 0}\n`;
  message += `💳 *Payment:* ${(order.paymentMethod || 'COD').toUpperCase()}\n\n`;
  
  // Next Steps
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `✅ *WHAT'S NEXT?*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `1️⃣ We're preparing your order\n`;
  message += `2️⃣ You'll get updates via WhatsApp\n`;
  message += `3️⃣ Delivery on scheduled date\n\n`;
  
  // Contact
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `📞 *NEED HELP?*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `Call: ${settings.phone}\n`;
  message += `WhatsApp: Reply to this message\n`;
  message += `Hours: ${settings.businessHours}\n\n`;
  
  message += `Thank you for choosing ${businessName}! 🙏\n`;
  message += `We can't wait to make your celebration sweeter! 🎉\n`;
  
  return message;
}

export function generateCustomerRequestConfirmation(
  request: CustomCakeRequest,
  settings: SiteSettings
): string {
  const businessName = settings.businessName || 'NestSweet Bakers';
  const requestId = request.requestId?.slice(0, 8).toUpperCase() || 'PENDING';
  
  let message = `🎨 *CUSTOM CAKE REQUEST RECEIVED!*\n\n`;
  
  message += `Dear ${request.name},\n\n`;
  message += `Thank you for your custom cake request! We're excited to create your dream cake! ✨\n\n`;
  
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `📋 *REQUEST SUMMARY*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `Request ID: *#${requestId}*\n`;
  message += `Occasion: ${request.occasion} 🎉\n`;
  message += `Flavor: ${request.flavor}\n`;
  message += `Size: ${request.size}\n`;
  message += `Budget: ₹${request.budget}\n`;
  message += `Delivery: ${formatDate(request.deliveryDate)}\n\n`;
  
  // Next Steps
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `✨ *WHAT HAPPENS NEXT?*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `1️⃣ Our cake artists will review your design\n`;
  message += `2️⃣ We'll contact you within *24 hours*\n`;
  message += `3️⃣ Discuss details & provide quote\n`;
  message += `4️⃣ Confirm and start creating! 🎂\n\n`;
  
  if (request.referenceImages && request.referenceImages.length > 0) {
    message += `📸 We have your ${request.referenceImages.length} reference image${request.referenceImages.length > 1 ? 's' : ''}!\n\n`;
  }
  
  // Contact
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `📞 *QUESTIONS?*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `Call: ${settings.phone}\n`;
  message += `WhatsApp: Reply to this message\n`;
  message += `Hours: ${settings.businessHours}\n\n`;
  
  message += `We'll make your vision come to life! 🎨✨\n\n`;
  message += `Best regards,\n`;
  message += `${businessName} Team 🎂\n`;
  
  return message;
}

export function generateOrderStatusUpdateMessage(
  orderRef: string,
  oldStatus: string,
  newStatus: string,
  customerName: string,
  cakeName: string,
  settings: SiteSettings
): string {
  const statusEmoji: { [key: string]: string } = {
    'pending': '🟡',
    'processing': '🔵',
    'completed': '🟢',
    'cancelled': '🔴'
  };
  
  const statusMessages: { [key: string]: string } = {
    'pending': 'Your order has been received and is awaiting confirmation.',
    'processing': 'Great news! Your cake is being prepared by our expert bakers! 👨‍🍳',
    'completed': 'Your order has been delivered! Hope you loved it! 🎉',
    'cancelled': 'Your order has been cancelled. Please contact us if you have questions.'
  };
  
  const businessName = settings.businessName || 'NestSweet Bakers';
  
  let message = `${statusEmoji[newStatus]} *ORDER STATUS UPDATE*\n\n`;
  
  message += `Hi ${customerName}! 👋\n\n`;
  message += `Your order #${orderRef} has been updated:\n\n`;
  
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `🎂 *${cakeName}*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  message += `Status: ${statusEmoji[oldStatus]} ${oldStatus.toUpperCase()} → ${statusEmoji[newStatus]} *${newStatus.toUpperCase()}*\n\n`;
  
  message += `${statusMessages[newStatus] || 'Your order status has been updated.'}\n\n`;
  
  if (newStatus === 'processing') {
    message += `⏰ *Estimated Completion:* Your cake will be ready as scheduled!\n\n`;
  }
  
  if (newStatus === 'completed') {
    message += `━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `⭐ *RATE YOUR EXPERIENCE*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `We'd love to hear your feedback!\n`;
    message += `Share a review to help us improve 🙏\n\n`;
  }
  
  // Contact
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `📞 Need Help? Contact us:\n`;
  message += `${settings.phone}\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  message += `Thank you for choosing ${businessName}! 🎂\n`;
  
  return message;
}

export function generateCustomRequestStatusUpdate(
  requestId: string,
  status: string,
  customerName: string,
  adminNotes?: string,
  quotedPrice?: number,
  settings?: SiteSettings
): string {
  const businessName = settings?.businessName || 'NestSweet Bakers';
  
  const statusMessages: { [key: string]: { emoji: string; title: string; message: string } } = {
    'processing': {
      emoji: '🔵',
      title: 'REQUEST UNDER REVIEW',
      message: 'Our cake artists are reviewing your design requirements!'
    },
    'approved': {
      emoji: '✅',
      title: 'REQUEST APPROVED!',
      message: 'Great news! We can create your dream cake! 🎉'
    },
    'rejected': {
      emoji: '❌',
      title: 'REQUEST UPDATE',
      message: 'Unfortunately, we cannot proceed with this request as specified.'
    },
    'completed': {
      emoji: '🎂',
      title: 'ORDER COMPLETED!',
      message: 'Your custom cake has been delivered! Hope you loved it!'
    }
  };
  
  const statusInfo = statusMessages[status] || statusMessages['processing'];
  
  let message = `${statusInfo.emoji} *${statusInfo.title}*\n\n`;
  
  message += `Hi ${customerName}! 👋\n\n`;
  message += `Update on your custom cake request #${requestId.slice(0, 8).toUpperCase()}\n\n`;
  
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `${statusInfo.message}\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  if (quotedPrice) {
    message += `💰 *Quoted Price:* ₹${quotedPrice}\n\n`;
  }
  
  if (adminNotes) {
    message += `━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `📝 *From Our Team:*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `${adminNotes}\n\n`;
  }
  
  if (status === 'approved') {
    message += `━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `✨ *NEXT STEPS:*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `1️⃣ Review the quote\n`;
    message += `2️⃣ Reply to confirm\n`;
    message += `3️⃣ We'll start creating your cake!\n\n`;
  }
  
  // Contact
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `📞 *Questions? Contact Us:*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  if (settings?.phone) {
    message += `Call: ${settings.phone}\n`;
  }
  message += `WhatsApp: Reply to this message\n\n`;
  
  message += `Thank you for choosing ${businessName}! 🙏\n`;
  
  return message;
}

// ==================== SEND FUNCTIONS ====================

export function sendWhatsAppNotification(
  request: CustomCakeRequest,
  settings: SiteSettings
): void {
  const message = generateCustomRequestAdminMessage(request, settings);
  const whatsappNumber = settings.whatsapp?.replace(/[^0-9]/g, '') || '';
  
  if (whatsappNumber) {
    sendWhatsAppMessage(whatsappNumber, message);
  }
}

export function notifyAdminViaWhatsApp(message: string, settings?: SiteSettings): void {
  const adminPhone = settings?.whatsapp || process.env.NEXT_PUBLIC_ADMIN_WHATSAPP || '';
  if (adminPhone) {
    sendWhatsAppMessage(adminPhone, message);
  }
}

export function notifyCustomerOrderConfirmation(
  order: Order,
  settings: SiteSettings
): void {
  const message = generateCustomerOrderConfirmation(order, settings);
  const customerPhone = order.userPhone || order.customerPhone || '';
  
  if (customerPhone) {
    sendWhatsAppMessage(customerPhone, message);
  }
}

export function notifyCustomerRequestConfirmation(
  request: CustomCakeRequest,
  settings: SiteSettings
): void {
  const message = generateCustomerRequestConfirmation(request, settings);
  
  if (request.phone) {
    sendWhatsAppMessage(request.phone, message);
  }
}

export function notifyCustomerStatusUpdate(
  orderRef: string,
  oldStatus: string,
  newStatus: string,
  customerName: string,
  customerPhone: string,
  cakeName: string,
  settings: SiteSettings
): void {
  const message = generateOrderStatusUpdateMessage(
    orderRef,
    oldStatus,
    newStatus,
    customerName,
    cakeName,
    settings
  );
  
  if (customerPhone) {
    sendWhatsAppMessage(customerPhone, message);
  }
}

// ==================== FUTURE: WEBHOOK HANDLERS ====================
// These functions prepare for WhatsApp Business API integration
// where clicking buttons can trigger status updates

export interface WebhookPayload {
  orderId: string;
  action: 'approve' | 'reject' | 'status_update';
  newStatus?: string;
  phone: string;
}

export async function handleWhatsAppWebhook(payload: WebhookPayload): Promise<void> {
  // TODO: Implement webhook handler for interactive buttons
  // This will be called when admin clicks action buttons in WhatsApp
  console.log('WhatsApp webhook received:', payload);
  
  // Future implementation:
  // 1. Verify webhook signature
  // 2. Update order/request status in Firestore
  // 3. Send confirmation to customer
  // 4. Update admin dashboard in real-time
}

export function generateInteractiveButtons(orderId: string): string {
  // Future: Generate WhatsApp Business API interactive buttons
  // For now, this returns URLs that admins can click
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
  
  return `
━━━━━━━━━━━━━━━━━━━━━
⚡ *QUICK UPDATE LINKS:*
━━━━━━━━━━━━━━━━━━━━━

✅ Approve: ${siteUrl}/api/webhook/approve/${orderId}
❌ Reject: ${siteUrl}/api/webhook/reject/${orderId}
🔵 Processing: ${siteUrl}/api/webhook/processing/${orderId}
🟢 Complete: ${siteUrl}/api/webhook/complete/${orderId}

_Click links to update status instantly_
━━━━━━━━━━━━━━━━━━━━━
`;
}
