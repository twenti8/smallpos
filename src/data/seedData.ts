import type { LocalUserAccount, MenuItem, OrderRecord, ShopSettings } from '../types/pos';

export const DEFAULT_SHOP_SETTINGS: ShopSettings = {
  shopName: 'finedaevibe.',
  shopTagline: 'Cozy Cafe & Bakery · เปิดให้บริการทุกวัน',
  logoUrl: '/src/assets/images/shop_logo_mochi_1794968606195.jpg',
  promptPayId: '0812345678',
  receiptNote: 'ขอบคุณที่อุดหนุนนะคะ ♡ ไว้แวะมาอีกน้า',
  gasUrl: '',
  themeId: 'sky',
  customThemeColor: '#3a78cc',
};

export const DEFAULT_MENU_ITEMS: MenuItem[] = [
  {
    id: 'item-latte',
    name: 'Iced Caramel Latte',
    category: 'เครื่องดื่ม',
    price: 85,
    image: '/src/assets/images/menu_iced_latte_1794968608247.jpg',
    inStock: true,
  },
  {
    id: 'item-matcha',
    name: 'Matcha Cloud Latte',
    category: 'เครื่องดื่ม',
    price: 95,
    image: '/src/assets/images/menu_matcha_cloud_1794968609785.jpg',
    inStock: true,
  },
  {
    id: 'item-peach-soda',
    name: 'Peach Yuzu Soda',
    category: 'เครื่องดื่ม',
    price: 75,
    image: '/src/assets/images/menu_peach_soda_1794968610394.jpg',
    inStock: true,
  },
  {
    id: 'item-shortcake',
    name: 'Strawberry Shortcake',
    category: 'เบเกอรี่',
    price: 135,
    image: '/src/assets/images/menu_strawberry_shortcake_1794968608883.jpg',
    inStock: true,
  },
  {
    id: 'item-croissant',
    name: 'Butter Croissant',
    category: 'เบเกอรี่',
    price: 75,
    image: '/src/assets/images/menu_butter_croissant_1794968610141.jpg',
    inStock: true,
  },
  {
    id: 'item-mochi-sticker',
    name: 'สติกเกอร์น้องโมจิ',
    category: 'ของตกแต่ง',
    price: 49,
    image: '/src/assets/images/shop_logo_mochi_1794968606195.jpg',
    inStock: true,
  },
];

export const DEFAULT_LOCAL_USERS: LocalUserAccount[] = [
  {
    id: 'user-admin',
    username: 'admin',
    password: 'admin123',
    name: 'แพรว (Admin)',
    role: 'admin',
    status: 'active',
  },
  {
    id: 'user-staff',
    username: 'staff',
    password: 'staff123',
    name: 'โมจิ (Staff)',
    role: 'staff',
    status: 'active',
  },
];

export const INITIAL_ORDERS: OrderRecord[] = [
  {
    receiptNo: 'RC261118-0915',
    timestamp: '18/11/2026 09:15:20',
    itemsSummary: 'Iced Caramel Latte x1, Butter Croissant x1',
    itemsDetail: [
      { name: 'Iced Caramel Latte', qty: 1, price: 85 },
      { name: 'Butter Croissant', qty: 1, price: 75 },
    ],
    total: 160,
    received: 160,
    change: 0,
    paymentMethod: 'PromptPay',
    staffName: 'โมจิ (Staff)',
    syncedToSheet: false,
  },
  {
    receiptNo: 'RC261118-0942',
    timestamp: '18/11/2026 09:42:08',
    itemsSummary: 'Matcha Cloud Latte x1, Strawberry Shortcake x1',
    itemsDetail: [
      { name: 'Matcha Cloud Latte', qty: 1, price: 95 },
      { name: 'Strawberry Shortcake', qty: 1, price: 135 },
    ],
    total: 230,
    received: 500,
    change: 270,
    paymentMethod: 'Cash',
    staffName: 'แพรว (Admin)',
    syncedToSheet: false,
  },
];
