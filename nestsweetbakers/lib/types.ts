export interface Cake {
  id?: string;
  name: string;
  description: string;
  basePrice: number;
  category: string;
  imageUrl: string;
  orderCount?: number;
  createdAt?: string;
}

export interface Order {
  id?: string;
  cakeName: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deliveryAddress: string;
  deliveryDate: string;
  weight: string;
  flavor: string;
  message?: string;
  totalPrice: number;
  status: string;
  createdAt: string;
  updatedAt?: string;
}
