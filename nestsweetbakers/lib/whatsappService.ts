/**
 * FREE WhatsApp Integration - No API Required
 * Opens WhatsApp with pre-filled message
 */

interface OrderData {
  orderRef: string;
  orderId: string;
  customerInfo: {
    name: string;
    phone: string;
    email?: string;
    address: string;
    city?: string;
    pincode: string;
  };
  items: any[];
  deliveryDate: string;
  deliveryTime: string;
  isGift?: boolean;
  recipientName?: string;
  giftMessage?: string;
  occasionType?: string;
  subtotal: number;
  deliveryFee: number;
  packagingFee: number;
  tax: number;
  discount: number;
  promoCode?: string;
  total: number;
  paymentMethod: string;
  specialInstructions?: string;
  orderNote?: string;
  // NEW: currency support
  currency?: 'INR' | 'CAD' | string;
}

/**
 * Get currency symbol + code from order
 */
function getCurrency(orderData: OrderData) {
  const code = orderData.currency || 'INR';
  const symbol = code === 'CAD' ? '$' : '₹';
  return { symbol, code };
}

/**
 * Format order message for WhatsApp
 */
export function formatOrderWhatsAppMessage(orderData: OrderData) {
  const { symbol: currencySymbol, code: currencyCode } = getCurrency(orderData);

  const itemsList = orderData.items
    .map(
      (item: any, idx: number) =>
        `${idx + 1}. *${item.cakeName}*\n` +
        `   Weight: ${item.weight}\n` +
        `   Price: ${currencySymbol}${item.totalPrice}` +
        `${item.customization ? `\n   Note: ${item.customization}` : ''}`,
    )
    .join('\n\n');

  const message =
    `*NEW ORDER - NestSweets*\n\n` +
    `*Order ID:* ${orderData.orderRef}\n` +
    `*Order Date:* ${new Date().toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })}\n\n` +
    `------------------------------\n` +
    `*CUSTOMER DETAILS*\n` +
    `Name: ${orderData.customerInfo.name}\n` +
    `Phone: ${orderData.customerInfo.phone}\n` +
    `Email: ${orderData.customerInfo.email || 'N/A'}\n\n` +
    `*DELIVERY ADDRESS*\n` +
    `${orderData.customerInfo.address}\n` +
    `${orderData.customerInfo.city ? `City: ${orderData.customerInfo.city}\n` : ''}` +
    `Pincode: ${orderData.customerInfo.pincode}\n\n` +
    `*DELIVERY DETAILS*\n` +
    `Date: ${new Date(orderData.deliveryDate).toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })}\n` +
    `Time: ${
      orderData.deliveryTime === 'morning'
        ? '9 AM - 12 PM'
        : orderData.deliveryTime === 'afternoon'
        ? '12 PM - 4 PM'
        : '4 PM - 8 PM'
    }\n\n` +
    `${
      orderData.isGift
        ? `*GIFT ORDER*\n` +
          `Recipient: ${orderData.recipientName}\n` +
          `Occasion: ${orderData.occasionType}\n` +
          `${orderData.giftMessage ? `Message: ${orderData.giftMessage}\n` : ''}\n`
        : ''
    }` +
    `*ORDER ITEMS (${orderData.items.length})*\n${itemsList}\n\n` +
    `------------------------------\n` +
    `*PRICE BREAKDOWN* (${currencyCode})\n` +
    `Subtotal: ${currencySymbol}${orderData.subtotal.toFixed(2)}\n` +
    `Delivery: ${
      orderData.deliveryFee === 0
        ? `FREE`
        : `${currencySymbol}${orderData.deliveryFee.toFixed(2)}`
    }\n` +
    `Packaging: ${currencySymbol}${orderData.packagingFee.toFixed(2)}\n` +
    `${orderData.tax > 0 ? `Tax: ${currencySymbol}${orderData.tax.toFixed(2)}\n` : ''}` +
    `${
      orderData.discount > 0
        ? `Discount${orderData.promoCode ? ` (${orderData.promoCode})` : ''}: -${currencySymbol}${orderData.discount.toFixed(2)}\n`
        : ''
    }` +
    `*TOTAL: ${currencySymbol}${orderData.total.toFixed(2)}*\n\n` +
    `*PAYMENT METHOD:* ${orderData.paymentMethod.toUpperCase()}\n\n` +
    `${
      orderData.specialInstructions
        ? `*Special Instructions:*\n${orderData.specialInstructions}\n\n`
        : ''
    }` +
    `${
      orderData.orderNote
        ? `*Order Note:*\n${orderData.orderNote}\n\n`
        : ''
    }` +
    `------------------------------\n` +
    `View Order:\n${process.env.NEXT_PUBLIC_SITE_URL}/admin/orders/${orderData.orderId}\n\n` +
    `Automated notification from NestSweets`;

  return message;
}

/**
 * Generate WhatsApp URL for admin notification
 */
export function getAdminWhatsAppUrl(orderData: OrderData): string {
  const message = formatOrderWhatsAppMessage(orderData);
  const adminPhone =
    process.env.NEXT_PUBLIC_ADMIN_WHATSAPP ||
    process.env.NEXT_PUBLIC_ADMIN_PHONE ||
    '';
  const cleanPhone = adminPhone.replace(/[^0-9]/g, '');

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Format customer confirmation message
 */
export function formatCustomerConfirmationMessage(
  orderData: OrderData,
): string {
  const { symbol: currencySymbol, code: currencyCode } = getCurrency(orderData);

  const itemsList = orderData.items
    .map(
      (item: any, idx: number) =>
        `${idx + 1}. ${item.cakeName} (${item.weight}) - ${currencySymbol}${item.totalPrice}`,
    )
    .join('\n');

  const message =
    `Order Confirmation - NestSweets\n\n` +
    `Hi ${orderData.customerInfo.name},\n\n` +
    `Your order has been received successfully.\n\n` +
    `*Order ID:* ${orderData.orderRef}\n` +
    `*Total Amount:* ${currencySymbol}${orderData.total.toFixed(
      2,
    )} (${currencyCode})\n\n` +
    `*Items:*\n${itemsList}\n\n` +
    `*Delivery Details:*\n` +
    `Date: ${new Date(orderData.deliveryDate).toLocaleDateString('en-IN')}\n` +
    `Time: ${
      orderData.deliveryTime === 'morning'
        ? '9 AM - 12 PM'
        : orderData.deliveryTime === 'afternoon'
        ? '12 PM - 4 PM'
        : '4 PM - 8 PM'
    }\n` +
    `Address: ${orderData.customerInfo.address}\n\n` +
    `You will be contacted shortly to confirm your order.\n\n` +
    `Track your order:\n${process.env.NEXT_PUBLIC_SITE_URL}/track-order?ref=${orderData.orderRef}\n\n` +
    `For any queries, contact us:\n${process.env.NEXT_PUBLIC_SITE_URL}\n\n` +
    `Thank you for choosing NestSweets.`;

  return message;
}

/**
 * Generate WhatsApp URL for customer confirmation
 */
export function getCustomerWhatsAppUrl(orderData: OrderData): string {
  const message = formatCustomerConfirmationMessage(orderData);
  const customerPhone = orderData.customerInfo.phone.replace(/[^0-9]/g, '');

  return `https://wa.me/${customerPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Format status update message
 */
export function formatStatusUpdateMessage(
  customerName: string,
  orderRef: string,
  status: string,
): string {
  const statusMessages: Record<string, string> = {
    confirmed:
      `Order Update\n\n` +
      `Hello ${customerName}, your order *${orderRef}* has been confirmed.\n\n` +
      `Your items are now queued for preparation.\n\n` +
      `You will receive further updates as we progress.`,
    preparing:
      `Order Update\n\n` +
      `Hello ${customerName}, your order *${orderRef}* is being prepared.\n\n` +
      `Our team is working to have everything ready on time.`,
    ready:
      `Order Update\n\n` +
      `Hello ${customerName}, your order *${orderRef}* is ready.\n\n` +
      `We are preparing it for dispatch.`,
    out_for_delivery:
      `Order Update\n\n` +
      `Hello ${customerName}, your order *${orderRef}* is out for delivery.\n\n` +
      `You can expect it within the scheduled time. Our delivery partner may contact you if needed.`,
    delivered:
      `Order Update\n\n` +
      `Hello ${customerName}, your order *${orderRef}* has been delivered.\n\n` +
      `Hope you enjoyed your order. Your feedback is appreciated.`,
    cancelled:
      `Order Update\n\n` +
      `Hello ${customerName}, your order *${orderRef}* has been cancelled.\n\n` +
      `If you have any questions, please contact support.`,
  };

  const message =
    statusMessages[status] ||
    `Order Update\n\nHello ${customerName}, your order *${orderRef}* status has been updated to: *${status.toUpperCase()}*`;

  const trackingUrl = `\n\nTrack your order:\n${process.env.NEXT_PUBLIC_SITE_URL}/track-order?ref=${orderRef}`;

  return message + trackingUrl;
}

/**
 * Get WhatsApp URL for status update
 */
export function getStatusUpdateWhatsAppUrl(
  customerPhone: string,
  customerName: string,
  orderRef: string,
  status: string,
): string {
  const message = formatStatusUpdateMessage(customerName, orderRef, status);
  const cleanPhone = customerPhone.replace(/[^0-9]/g, '');

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}
