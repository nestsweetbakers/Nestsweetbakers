import { NextRequest, NextResponse } from 'next/server';
import { doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';


export async function POST(request: NextRequest) {
  try {
    const { orderId, status } = await request.json();

    if (!orderId || !status) {
      return NextResponse.json(
        { error: 'Order ID and status are required' },
        { status: 400 }
      );
    }

    // Get order document
    const orderRef = doc(db, 'orders', orderId);
    const orderSnap = await getDoc(orderRef);

    if (!orderSnap.exists()) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    const orderData = orderSnap.data();

    // Update order status
    await updateDoc(orderRef, {
      status,
      orderStatus: status,
      [`trackingSteps.${status}`]: true,
      updatedAt: serverTimestamp(),
    });

    // Send WhatsApp notification to customer
    if (orderData.customerInfo?.phone) {
      await sendOrderStatusUpdate(
        orderData.customerInfo.phone,
        orderData.orderRef,
        status,
        orderData.customerInfo.name
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Order status updated and customer notified',
    });

  } catch (error: any) {
    console.error('Status update error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update order status' },
      { status: 500 }
    );
  }
}
function sendOrderStatusUpdate(phone: any, orderRef: any, status: any, name: any) {
  throw new Error('Function not implemented.');
}

