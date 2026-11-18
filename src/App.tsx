import { useEffect, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { HeaderBar } from './components/HeaderBar';
import { LoginScreen } from './components/LoginScreen';
import { PosView } from './components/PosView';
import { ReceiptModal } from './components/ReceiptModal';
import { SettingsView } from './components/SettingsView';
import { SummaryView } from './components/SummaryView';
import {
  DEFAULT_LOCAL_USERS,
  DEFAULT_MENU_ITEMS,
  DEFAULT_SHOP_SETTINGS,
  INITIAL_ORDERS,
} from './data/seedData';
import {
  authenticateUser,
  GAS_URL_STORAGE_KEY,
  resolveGasUrl,
  submitCheckoutPayload,
} from './services/gasApi';
import type {
  AppTab,
  AuthUser,
  CartItem,
  LocalUserAccount,
  MenuItem,
  OrderRecord,
  PaymentMethod,
  ShopSettings,
} from './types/pos';
import { applyThemeCssVars, buildThemeTokens } from './utils/themes';
import { toBase64DataUrl, waitForImagesReady } from './utils/imageLoader';
import {
  buildCheckoutPayload,
  canAccessTab,
  formatItemsSummary,
  formatThailandTimestamp,
  generateReceiptNo,
} from './utils/posLogic';

const AUTH_STORAGE_KEY = 'pos_auth_user';
const SETTINGS_STORAGE_KEY = 'pos_shop_settings';
const MENU_STORAGE_KEY = 'pos_menu_items';
const ORDERS_STORAGE_KEY = 'pos_orders_history';
const USERS_STORAGE_KEY = 'pos_local_users';

function loadJsonStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [settings, setSettings] = useState<ShopSettings>(() => {
    const stored = loadJsonStorage<ShopSettings>(SETTINGS_STORAGE_KEY, DEFAULT_SHOP_SETTINGS);
    const gasFromStorage =
      typeof window !== 'undefined'
        ? window.localStorage.getItem(GAS_URL_STORAGE_KEY) || ''
        : '';
    return {
      ...DEFAULT_SHOP_SETTINGS,
      ...stored,
      gasUrl: stored.gasUrl || gasFromStorage,
    };
  });

  const [user, setUser] = useState<AuthUser | null>(() =>
    loadJsonStorage<AuthUser | null>(AUTH_STORAGE_KEY, null)
  );
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() =>
    loadJsonStorage<MenuItem[]>(MENU_STORAGE_KEY, DEFAULT_MENU_ITEMS)
  );
  const [orders, setOrders] = useState<OrderRecord[]>(() =>
    loadJsonStorage<OrderRecord[]>(ORDERS_STORAGE_KEY, INITIAL_ORDERS)
  );
  const [localUsers, setLocalUsers] = useState<LocalUserAccount[]>(() =>
    loadJsonStorage<LocalUserAccount[]>(USERS_STORAGE_KEY, DEFAULT_LOCAL_USERS)
  );

  const [activeTab, setActiveTab] = useState<AppTab>('pos');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const [logoDataUrl, setLogoDataUrl] = useState<string>('');
  const [captureOrder, setCaptureOrder] = useState<OrderRecord | null>(null);
  const captureRef = useRef<HTMLDivElement | null>(null);

  const [modalOrder, setModalOrder] = useState<OrderRecord | null>(null);
  const [syncMessage, setSyncMessage] = useState('');

  // Apply active theme tokens globally (Login, POS, Summary, Settings)
  useEffect(() => {
    const tokens = buildThemeTokens(settings.themeId, settings.customThemeColor);
    applyThemeCssVars(tokens);
  }, [settings.themeId, settings.customThemeColor]);

  // Preload shop logo as Base64 Data URL whenever logoUrl changes
  useEffect(() => {
    let active = true;
    toBase64DataUrl(settings.logoUrl).then((dataUrl) => {
      if (active) setLogoDataUrl(dataUrl);
    });
    return () => {
      active = false;
    };
  }, [settings.logoUrl]);

  // Enforce strict role-based tab guard
  useEffect(() => {
    if (user && !canAccessTab(user.role, activeTab)) {
      setActiveTab('pos');
    }
  }, [user, activeTab]);

  const handleSelectTab = (tab: AppTab) => {
    if (!user || !canAccessTab(user.role, tab)) {
      setActiveTab('pos');
      return;
    }
    setActiveTab(tab);
  };

  const handleLogin = async (username: string, password: string) => {
    const result = await authenticateUser({
      username,
      password,
      localUsers,
      settingsGasUrl: settings.gasUrl,
    });
    setUser(result.user);
    setActiveTab('pos');
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(result.user));
  };

  const handleLogout = () => {
    setUser(null);
    setCart([]);
    setActiveTab('pos');
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  const handleSaveSettings = (next: ShopSettings) => {
    setSettings(next);
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
    if (next.gasUrl) {
      window.localStorage.setItem(GAS_URL_STORAGE_KEY, next.gasUrl);
    } else {
      window.localStorage.removeItem(GAS_URL_STORAGE_KEY);
    }
  };

  const handleUpdateMenu = (next: MenuItem[]) => {
    setMenuItems(next);
    window.localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(next));
  };

  const handleUpdateUsers = (next: LocalUserAccount[]) => {
    setLocalUsers(next);
    window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(next));
  };

  const handleAddToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((entry) => entry.item.id === item.id);
      if (existing) {
        return prev.map((entry) =>
          entry.item.id === item.id ? { ...entry, qty: entry.qty + 1 } : entry
        );
      }
      return [...prev, { item, qty: 1 }];
    });
  };

  const handleUpdateQty = (itemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((entry) =>
          entry.item.id === itemId ? { ...entry, qty: entry.qty + delta } : entry
        )
        .filter((entry) => entry.qty > 0)
    );
  };

  const captureOffscreenReceiptPng = async (draftOrder: OrderRecord): Promise<string> => {
    const resolvedLogo = logoDataUrl || (await toBase64DataUrl(settings.logoUrl));
    if (resolvedLogo && resolvedLogo !== logoDataUrl) {
      setLogoDataUrl(resolvedLogo);
    }
    setCaptureOrder(draftOrder);

    // Allow React to commit the hidden capture target DOM
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    if (!captureRef.current) return '';
    await waitForImagesReady(captureRef.current);

    try {
      const canvas = await html2canvas(captureRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
      });
      return canvas.toDataURL('image/png');
    } catch {
      return '';
    } finally {
      setCaptureOrder(null);
    }
  };

  const handleCheckout = async (params: {
    paymentMethod: PaymentMethod;
    received: number;
    change: number;
  }) => {
    if (!user || cart.length === 0) return;
    setIsCheckingOut(true);

    try {
      const now = new Date();
      const receiptNo = generateReceiptNo(now);
      const timestamp = formatThailandTimestamp(now);
      const total = cart.reduce((sum, e) => sum + e.item.price * e.qty, 0);
      const isPromptPay = params.paymentMethod === 'PromptPay';
      const received = isPromptPay ? total : params.received;
      const change = isPromptPay ? 0 : params.change;

      const draftOrder: OrderRecord = {
        receiptNo,
        timestamp,
        itemsSummary: formatItemsSummary(cart),
        itemsDetail: cart.map((e) => ({
          name: e.item.name,
          qty: e.qty,
          price: e.item.price,
        })),
        total,
        received,
        change,
        paymentMethod: params.paymentMethod,
        staffName: user.name,
        syncedToSheet: false,
      };

      const receiptImage = await captureOffscreenReceiptPng(draftOrder);

      const payload = buildCheckoutPayload({
        receiptNo,
        cart,
        total,
        received,
        change,
        paymentMethod: params.paymentMethod,
        staffName: user.name,
        receiptImage,
      });

      const syncResult = await submitCheckoutPayload(payload, settings.gasUrl);

      const finalizedOrder: OrderRecord = {
        ...draftOrder,
        syncedToSheet: syncResult.synced,
        receiptDriveUrl: syncResult.receiptDriveUrl,
        receiptImage,
      };

      const nextOrders = [finalizedOrder, ...orders];
      setOrders(nextOrders);
      window.localStorage.setItem(
        ORDERS_STORAGE_KEY,
        JSON.stringify(
          nextOrders.slice(0, 50).map(({ receiptImage: _img, ...rest }) => rest)
        )
      );

      setCart([]);
      setSyncMessage(syncResult.message || '');
      setModalOrder(finalizedOrder);
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (!user) {
    return (
      <LoginScreen
        settings={settings}
        hasRemoteBackend={Boolean(resolveGasUrl(settings.gasUrl))}
        onLogin={handleLogin}
      />
    );
  }

  return (
    <div className="min-h-screen pos-canvas pb-12">
      <HeaderBar
        user={user}
        settings={settings}
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        onLogout={handleLogout}
      />

      {activeTab === 'pos' && (
        <PosView
          menuItems={menuItems}
          settings={settings}
          cart={cart}
          onAddToCart={handleAddToCart}
          onUpdateQty={handleUpdateQty}
          onClearCart={() => setCart([])}
          onCheckout={handleCheckout}
          isCheckingOut={isCheckingOut}
        />
      )}

      {activeTab === 'summary' && canAccessTab(user.role, 'summary') && (
        <SummaryView
          orders={orders}
          onViewReceipt={(order) => {
            setSyncMessage('');
            setModalOrder(order);
          }}
        />
      )}

      {activeTab === 'settings' && canAccessTab(user.role, 'settings') && (
        <SettingsView
          currentUser={user}
          settings={settings}
          menuItems={menuItems}
          localUsers={localUsers}
          onSaveSettings={handleSaveSettings}
          onUpdateMenu={handleUpdateMenu}
          onUpdateUsers={handleUpdateUsers}
        />
      )}

      {/* Offscreen Receipt Target for PNG Capture on Checkout */}
      {captureOrder && (
        <div
          aria-hidden="true"
          className="fixed -left-[9999px] top-0 w-[340px] bg-white p-6 text-[#1e3554]"
          ref={captureRef}
        >
          <div className="flex flex-col items-center text-center pb-4 border-b border-dashed border-[#cbd9ec]">
            {logoDataUrl && (
              <div className="w-16 h-16 rounded-2xl overflow-hidden border border-[#e3ecf8] mb-2.5 bg-white flex items-center justify-center">
                <img
                  src={logoDataUrl}
                  alt={settings.shopName}
                  crossOrigin="anonymous"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            <div className="text-lg font-bold text-[#1e3554]">{settings.shopName}</div>
            {settings.shopTagline && (
              <div className="text-[11px] text-[#647b99] mt-0.5">{settings.shopTagline}</div>
            )}
          </div>

          <div className="py-3 text-xs space-y-1 border-b border-dashed border-[#cbd9ec]">
            <div className="flex justify-between">
              <span className="text-[#647b99]">เลขที่ใบเสร็จ</span>
              <span className="font-mono-tabular font-semibold">{captureOrder.receiptNo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#647b99]">วันที่/เวลา</span>
              <span className="font-mono-tabular">{captureOrder.timestamp}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#647b99]">พนักงานขาย</span>
              <span className="font-semibold">{captureOrder.staffName}</span>
            </div>
          </div>

          <div className="py-3 space-y-2 border-b border-dashed border-[#cbd9ec] text-xs">
            {captureOrder.itemsDetail.map((line, idx) => (
              <div key={`${line.name}-${idx}`} className="flex justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[#1e3554]">{line.name}</div>
                  <div className="text-[11px] text-[#647b99] font-mono-tabular">
                    {line.qty} × ฿{line.price.toLocaleString('th-TH')}
                  </div>
                </div>
                <div className="font-mono-tabular font-semibold shrink-0">
                  ฿{(line.qty * line.price).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 space-y-1.5 text-xs">
            <div className="flex justify-between text-base font-bold text-[#1e3554]">
              <span>ยอดสุทธิ</span>
              <span className="font-mono-tabular">
                ฿{captureOrder.total.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between text-[#647b99]">
              <span>วิธีชำระเงิน</span>
              <span className="font-semibold text-[#1e3554]">{captureOrder.paymentMethod}</span>
            </div>
            <div className="flex justify-between text-[#647b99]">
              <span>รับเงิน</span>
              <span className="font-mono-tabular">
                ฿{captureOrder.received.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between text-[#647b99]">
              <span>เงินทอน</span>
              <span className="font-mono-tabular">
                ฿{captureOrder.change.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {settings.receiptNote && (
            <div className="mt-4 pt-3 border-t border-dashed border-[#cbd9ec] text-center text-[11px] text-[#647b99]">
              {settings.receiptNote}
            </div>
          )}
        </div>
      )}

      <ReceiptModal
        order={modalOrder}
        settings={settings}
        logoDataUrl={logoDataUrl}
        syncMessage={syncMessage}
        onClose={() => setModalOrder(null)}
      />
    </div>
  );
}
