export type UserRole = 'admin' | 'staff';

export interface AuthUser {
  username: string;
  name: string;
  role: UserRole;
}

export interface LocalUserAccount {
  id: string;
  username: string;
  password: string;
  name: string;
  role: UserRole;
  status: 'active' | 'inactive';
}

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string;
  inStock: boolean;
}

export interface CartItem {
  item: MenuItem;
  qty: number;
}

export type PaymentMethod = 'Cash' | 'PromptPay';

export type ThemeId =
  | 'pastel-pink'
  | 'peach'
  | 'butter'
  | 'mint'
  | 'sky'
  | 'lavender'
  | 'dark-pink'
  | 'dark-peach'
  | 'dark-butter'
  | 'dark-mint'
  | 'dark-navy'
  | 'dark-purple'
  | 'custom';

export interface ShopSettings {
  shopName: string;
  shopTagline: string;
  logoUrl: string;
  promptPayId: string;
  receiptNote: string;
  gasUrl: string;
  themeId: ThemeId;
  customThemeColor: string;
}

export interface OrderItemLine {
  name: string;
  qty: number;
  price: number;
}

export interface OrderRecord {
  receiptNo: string;
  timestamp: string;
  itemsSummary: string;
  itemsDetail: OrderItemLine[];
  total: number;
  received: number;
  change: number;
  paymentMethod: PaymentMethod;
  staffName: string;
  syncedToSheet: boolean;
  receiptDriveUrl?: string;
  receiptImage?: string;
}

export type AppTab = 'pos' | 'summary' | 'settings';

export interface CheckoutPayload {
  action: 'checkout';
  receiptNo: string;
  items: string;
  total: number;
  received: number;
  change: number;
  paymentMethod: PaymentMethod;
  staffName: string;
  receiptImage: string;
}
