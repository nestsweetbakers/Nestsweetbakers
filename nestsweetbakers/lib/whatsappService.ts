// lib/whatsappService.ts
import { SiteSettings } from '@/hooks/useSettings';

// ==================== INTERFACES ====================

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
  cakeName?: string;
  quantity?: number;
  totalPrice?: number;
  total?: number;
  customerName?: string;
  userName?: string;
  customerPhone?: string;
  userPhone?: string;
  deliveryDate: string;
  deliveryTime?: string;
  deliveryAddress: string;
  city?: string;
  pincode?: string;
  status: string;
  paymentMethod?: string;
  specialInstructions?: string;
  orderNote?: string;
  isGift?: boolean;
  recipientName?: string;
  giftMessage?: string;
  subtotal?: number;
  deliveryCharges?: number;
  packagingCharges?: number;
}

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

function formatShortDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function getDeliveryTimeSlot(time?: string): string {
  const slots: { [key: string]: string } = {
    'morning': '9 AM - 12 PM',
    'afternoon': '12 PM - 4 PM',
    'evening': '4 PM - 8 PM'
  };
  return slots[time || 'morning'] || time || '9 AM - 12 PM';
}

function getCurrencySymbol(settings?: SiteSettings): string {
  return settings?.currency === 'CAD' ? 'CAD' : 'INR';
}

// ==================== ADMIN NOTIFICATIONS ====================

export function generateOrderAdminMessage(
  order: Order,
  settings: SiteSettings
): string {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://nestsweetbakers.com').replace(/\/$/, '');
  const orderRef = order.orderRef || order.id?.slice(0, 16).toUpperCase() || 'N/A';
  const customerName = order.userName || order.customerName || 'Customer';
  const customerPhone = order.userPhone || order.customerPhone || 'N/A';
  const currency = getCurrencySymbol(settings);
  const businessName = settings.businessName || 'Nest Sweet Bakers';
  
  let msg = '';
  
  // Header
  msg += '=== NEW ORDER ===\n';
  msg += businessName + '\n\n';
  
  msg += 'ORDER ID: ' + orderRef + '\n';
  msg += 'DATE: ' + formatShortDate(new Date().toISOString()) + '\n';
  msg += '==============================\n\n';
  
  // Customer
  msg += '[ CUSTOMER DETAILS ]\n';
  msg += 'Name: ' + customerName + '\n';
  msg += 'Phone: ' + customerPhone + '\n';
  
  const email = (order as any).userEmail || (order as any).customerEmail;
  if (email) {
    msg += 'Email: ' + email + '\n';
  }
  msg += '\n';
  
  // Delivery Address
  msg += '[ DELIVERY ADDRESS ]\n';
  msg += order.deliveryAddress + '\n';
  if (order.city) {
    msg += 'City: ' + order.city + '\n';
  }
  if (order.pincode) {
    msg += 'Pincode: ' + order.pincode + '\n';
  }
  msg += '\n';
  
  // Delivery Details
  msg += '[ DELIVERY SCHEDULE ]\n';
  msg += 'Date: ' + formatDate(order.deliveryDate) + '\n';
  msg += 'Time: ' + getDeliveryTimeSlot(order.deliveryTime) + '\n';
  msg += '\n';
  
  // Gift Order
  if (order.isGift) {
    msg += '[ GIFT ORDER ]\n';
    if (order.recipientName) {
      msg += 'For: ' + order.recipientName + '\n';
    }
    if (order.giftMessage) {
      msg += 'Message: ' + order.giftMessage + '\n';
    }
    msg += '\n';
  }
  
  // Order Items
  const itemCount = order.items?.length || 1;
  msg += '[ ORDER ITEMS: ' + itemCount + ' ]\n';
  
  if (order.items && order.items.length > 0) {
    order.items.forEach((item, idx) => {
      msg += '\n' + (idx + 1) + '. ' + item.cakeName + '\n';
      msg += '   Weight: ' + item.weight + '\n';
      if (item.flavor) {
        msg += '   Flavor: ' + item.flavor + '\n';
      }
      if (item.customization) {
        msg += '   Note: ' + item.customization + '\n';
      }
      msg += '   Price: ' + currency + ' ' + item.totalPrice + '\n';
    });
  } else {
    msg += '\n1. ' + (order.cakeName || 'Cake') + '\n';
    msg += '   Weight: ' + (order.quantity || 1) + 'kg\n';
    msg += '   Price: ' + currency + ' ' + (order.totalPrice || order.total || 0) + '\n';
  }
  msg += '\n';
  
  // Price Breakdown
  msg += '==============================\n';
  msg += '[ PRICE BREAKDOWN ]\n';
  
  if (order.subtotal) {
    msg += 'Subtotal: ' + currency + ' ' + order.subtotal + '\n';
  }
  if (order.deliveryCharges) {
    msg += 'Delivery: ' + currency + ' ' + order.deliveryCharges + '\n';
  }
  if (order.packagingCharges) {
    msg += 'Packaging: ' + currency + ' ' + order.packagingCharges + '\n';
  }
  
  const totalAmount = order.total || order.totalPrice || 0;
  msg += '\nTOTAL: ' + currency + ' ' + totalAmount.toFixed(2) + '\n';
  msg += '==============================\n\n';
  
  // Payment
  msg += 'PAYMENT: ' + (order.paymentMethod || 'COD').toUpperCase() + '\n\n';
  
  // Special Instructions
  if (order.specialInstructions) {
    msg += '[ SPECIAL INSTRUCTIONS ]\n';
    msg += order.specialInstructions + '\n\n';
  }
  
  // Order Note
  if (order.orderNote) {
    msg += '[ ORDER NOTE ]\n';
    msg += order.orderNote + '\n\n';
  }
  
  // Action Link
  msg += '==============================\n';
  msg += 'VIEW FULL ORDER:\n';
  msg += siteUrl + '/admin/orders/' + order.id + '\n';
  msg += '==============================\n\n';
  
  // Footer
  msg += '--- Automated Notification ---\n';
  msg += businessName;
  
  return msg;
}

export function generateCustomRequestAdminMessage(
  request: CustomCakeRequest,
  settings: SiteSettings
): string {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://nestsweetbakers.com').replace(/\/$/, '');
  const requestId = (request.requestId || 'PENDING').slice(0, 8).toUpperCase();
  const currency = getCurrencySymbol(settings);
  const businessName = settings.businessName || 'NestSweet Bakers';
  
  let msg = '';
  
  if (request.urgency === 'urgent') {
    msg += '!!! URGENT !!!\n';
  }
  msg += '=== CUSTOM CAKE REQUEST ===\n\n';
  
  msg += 'REQUEST ID: #' + requestId + '\n';
  msg += '==============================\n\n';
  
  // Customer
  msg += '[ CUSTOMER ]\n';
  msg += 'Name: ' + request.name + '\n';
  msg += 'Phone: ' + request.phone + '\n';
  if (request.email) {
    msg += 'Email: ' + request.email + '\n';
  }
  if (request.deliveryAddress) {
    msg += 'Address: ' + request.deliveryAddress + '\n';
  }
  msg += '\n';
  
  // Cake Details
  msg += '[ CAKE DETAILS ]\n';
  msg += 'Occasion: ' + request.occasion + '\n';
  msg += 'Flavor: ' + request.flavor + '\n';
  msg += 'Size: ' + request.size + '\n';
  
  if (request.servings) {
    msg += 'Servings: ' + request.servings + '\n';
  }
  if (request.tier) {
    msg += 'Tiers: ' + request.tier + '\n';
  }
  if (request.eggless) {
    msg += 'Type: Eggless\n';
  }
  
  msg += 'Budget: ' + currency + ' ' + request.budget + '\n';
  msg += 'Delivery: ' + formatDate(request.deliveryDate) + '\n\n';
  
  // Design
  msg += '[ DESIGN DESCRIPTION ]\n';
  msg += request.design + '\n\n';
  
  // Notes
  if (request.message) {
    msg += '[ SPECIAL NOTES ]\n';
    msg += request.message + '\n\n';
  }
  
  // Images
  if (request.referenceImages && request.referenceImages.length > 0) {
    msg += '[ REFERENCE IMAGES: ' + request.referenceImages.length + ' ]\n';
    request.referenceImages.forEach((img, idx) => {
      msg += (idx + 1) + '. ' + img + '\n';
    });
    msg += '\n';
  }
  
  // Actions
  msg += '==============================\n';
  msg += 'VIEW DETAILS:\n' + siteUrl + '/admin/custom-requests\n\n';
  msg += 'CONTACT CUSTOMER:\n' + 'https://wa.me/' + request.phone.replace(/[^0-9]/g, '') + '\n';
  msg += '==============================\n\n';
  
  msg += new Date().toLocaleString('en-IN') + '\n';
  msg += businessName;
  
  return msg;
}

// Customer messages (simplified versions)
export function generateCustomerOrderConfirmation(order: Order, settings: SiteSettings): string {
  const orderRef = order.orderRef || order.id?.slice(0, 8).toUpperCase() || 'N/A';
  const businessName = settings.businessName || 'NestSweet Bakers';
  const currency = getCurrencySymbol(settings);
  
  let msg = '=== ORDER CONFIRMED ===\n\n';
  msg += 'Thank you for your order!\n\n';
  msg += 'Order ID: #' + orderRef + '\n';
  msg += 'Status: ' + order.status.toUpperCase() + '\n\n';
  
  msg += '[ YOUR ORDER ]\n';
  if (order.items && order.items.length > 0) {
    order.items.forEach((item, idx) => {
      msg += (idx + 1) + '. ' + item.cakeName + ' - ' + item.weight + '\n';
    });
  } else {
    msg += order.cakeName + ' - ' + order.quantity + 'kg\n';
  }
  
  msg += '\nDelivery: ' + formatDate(order.deliveryDate) + '\n';
  msg += 'Time: ' + getDeliveryTimeSlot(order.deliveryTime) + '\n';
  msg += 'Address: ' + order.deliveryAddress + '\n\n';
  
  msg += 'Total: ' + currency + ' ' + (order.total || order.totalPrice || 0) + '\n';
  msg += 'Payment: ' + (order.paymentMethod || 'COD').toUpperCase() + '\n\n';
  
  msg += '[ WHAT\'S NEXT ]\n';
  msg += '1. We\'re preparing your order\n';
  msg += '2. You\'ll get updates via WhatsApp\n';
  msg += '3. Delivery on scheduled date\n\n';
  
  msg += 'Need help? Call: ' + settings.phone + '\n\n';
  msg += 'Thank you!\n' + businessName;
  
  return msg;
}

export function generateCustomerRequestConfirmation(request: CustomCakeRequest, settings: SiteSettings): string {
  const businessName = settings.businessName || 'NestSweet Bakers';
  const requestId = request.requestId?.slice(0, 8).toUpperCase() || 'PENDING';
  const currency = getCurrencySymbol(settings);
  
  let msg = '=== REQUEST RECEIVED ===\n\n';
  msg += 'Dear ' + request.name + ',\n\n';
  msg += 'Thank you for your custom cake request!\n\n';
  
  msg += 'Request ID: #' + requestId + '\n';
  msg += 'Occasion: ' + request.occasion + '\n';
  msg += 'Budget: ' + currency + ' ' + request.budget + '\n';
  msg += 'Delivery: ' + formatDate(request.deliveryDate) + '\n\n';
  
  msg += '[ WHAT HAPPENS NEXT ]\n';
  msg += '1. Our team will review your design\n';
  msg += '2. We\'ll contact you within 24 hours\n';
  msg += '3. Discuss details & provide quote\n';
  msg += '4. Confirm and start creating!\n\n';
  
  msg += 'Questions? Call: ' + settings.phone + '\n\n';
  msg += 'Best regards,\n' + businessName;
  
  return msg;
}

export function generateOrderStatusUpdateMessage(
  orderRef: string,
  oldStatus: string,
  newStatus: string,
  customerName: string,
  cakeName: string,
  settings: SiteSettings
): string {
  const businessName = settings.businessName || 'NestSweet Bakers';
  
  let msg = '=== ORDER UPDATE ===\n\n';
  msg += 'Hi ' + customerName + '!\n\n';
  msg += 'Order #' + orderRef + '\n';
  msg += cakeName + '\n\n';
  msg += 'Status: ' + oldStatus.toUpperCase() + ' > ' + newStatus.toUpperCase() + '\n\n';
  
  if (newStatus === 'processing') {
    msg += 'Your cake is being prepared!\n';
  } else if (newStatus === 'completed') {
    msg += 'Your order has been delivered!\n';
  }
  
  msg += '\nQuestions? Call: ' + settings.phone + '\n\n';
  msg += 'Thank you!\n' + businessName;
  
  return msg;
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
  const currency = getCurrencySymbol(settings);
  
  let msg = '=== REQUEST UPDATE ===\n\n';
  msg += 'Hi ' + customerName + '!\n\n';
  msg += 'Request #' + requestId.slice(0, 8).toUpperCase() + '\n';
  msg += 'Status: ' + status.toUpperCase() + '\n\n';
  
  if (quotedPrice) {
    msg += 'Quoted Price: ' + currency + ' ' + quotedPrice + '\n\n';
  }
  
  if (adminNotes) {
    msg += '[ FROM OUR TEAM ]\n';
    msg += adminNotes + '\n\n';
  }
  
  if (settings?.phone) {
    msg += 'Questions? Call: ' + settings.phone + '\n\n';
  }
  
  msg += 'Thank you!\n' + businessName;
  
  return msg;
}

// ==================== SEND FUNCTIONS ====================

export function sendWhatsAppNotification(request: CustomCakeRequest, settings: SiteSettings): void {
  const message = generateCustomRequestAdminMessage(request, settings);
  const whatsappNumber = settings.whatsapp?.replace(/[^0-9]/g, '') || '';
  if (whatsappNumber) {
    sendWhatsAppMessage(whatsappNumber, message);
  }
}

export function notifyAdminNewOrder(order: Order, settings: SiteSettings): void {
  const message = generateOrderAdminMessage(order, settings);
  const adminPhone = settings.whatsapp?.replace(/[^0-9]/g, '') || '';
  if (adminPhone) {
    sendWhatsAppMessage(adminPhone, message);
  }
}

export function notifyAdminViaWhatsApp(message: string, settings?: SiteSettings): void {
  const adminPhone = settings?.whatsapp || process.env.NEXT_PUBLIC_ADMIN_WHATSAPP || '';
  if (adminPhone) {
    sendWhatsAppMessage(adminPhone, message);
  }
}

export function notifyCustomerOrderConfirmation(order: Order, settings: SiteSettings): void {
  const message = generateCustomerOrderConfirmation(order, settings);
  const customerPhone = order.userPhone || order.customerPhone || '';
  if (customerPhone) {
    sendWhatsAppMessage(customerPhone, message);
  }
}

export function notifyCustomerRequestConfirmation(request: CustomCakeRequest, settings: SiteSettings): void {
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
  const message = generateOrderStatusUpdateMessage(orderRef, oldStatus, newStatus, customerName, cakeName, settings);
  if (customerPhone) {
    sendWhatsAppMessage(customerPhone, message);
  }
}
