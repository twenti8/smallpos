import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import {
  Banknote,
  CheckCircle2,
  Minus,
  Plus,
  QrCode,
  Search,
  ShoppingBag,
  Trash2,
} from 'lucide-react';
import type { CartItem, MenuItem, PaymentMethod, ShopSettings } from '../types/pos';
import {
  calculateCartTotal,
  computePaymentAmounts,
  generatePromptPayPayload,
  normalizeDriveImageUrl,
} from '../utils/posLogic';

interface PosViewProps {
  menuItems: MenuItem[];
  settings: ShopSettings;
  cart: CartItem[];
  onAddToCart: (item: MenuItem) => void;
  onUpdateQty: (itemId: string, delta: number) => void;
  onClearCart: () => void;
  onCheckout: (params: {
    paymentMethod: PaymentMethod;
    received: number;
    change: number;
    qrDataUrl: string;
  }) => Promise<void>;
  isCheckingOut: boolean;
}

export const PosView: React.FC<PosViewProps> = ({
  menuItems,
  settings,
  cart,
  onAddToCart,
  onUpdateQty,
  onClearCart,
  onCheckout,
  isCheckingOut,
}) => {
  const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด');
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [cashInput, setCashInput] = useState<string>('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  const categories = useMemo(() => {
    const unique = Array.from(new Set(menuItems.map((m) => m.category)));
    return ['ทั้งหมด', ...unique];
  }, [menuItems]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return menuItems.filter((item) => {
      const matchCat = selectedCategory === 'ทั้งหมด' || item.category === selectedCategory;
      const matchSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [menuItems, selectedCategory, searchQuery]);

  const total = useMemo(() => calculateCartTotal(cart), [cart]);

  const paymentCalc = useMemo(
    () => computePaymentAmounts(total, paymentMethod, cashInput),
    [total, paymentMethod, cashInput]
  );

  useEffect(() => {
    if (paymentMethod !== 'PromptPay' || total <= 0 || !settings.promptPayId.trim()) {
      setQrDataUrl('');
      return;
    }

    const payload = generatePromptPayPayload(settings.promptPayId, total);
    if (!payload) {
      setQrDataUrl('');
      return;
    }

    let cancelled = false;
    QRCode.toDataURL(payload, {
      width: 240,
      margin: 2,
      color: { dark: '#1e3554', light: '#ffffff' },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl('');
      });

    return () => {
      cancelled = true;
    };
  }, [paymentMethod, total, settings.promptPayId]);

  const cartQtyMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const entry of cart) {
      map[entry.item.id] = entry.qty;
    }
    return map;
  }, [cart]);

  const handleCheckoutSubmit = async () => {
    if (!paymentCalc.isValid || isCheckingOut) return;
    await onCheckout({
      paymentMethod,
      received: paymentCalc.received,
      change: paymentCalc.change,
      qrDataUrl,
    });
    setCashInput('');
  };

  return (
    <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Menu Catalog Section */}
      <section className="lg:col-span-7 xl:col-span-8 min-w-0 pos-card rounded-3xl border shadow-[0_8px_28px_rgba(15,23,42,0.06)] p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-xl font-bold pos-ink">รายการสินค้า</h1>
            <p className="text-xs pos-muted mt-0.5">
              แตะที่สินค้าเพื่อเพิ่มลงตะกร้าคิดเงิน
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 pos-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              aria-label="ค้นหาสินค้า"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อเมนู..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border pos-input text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pos-accent)]/40"
            />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-4">
          {categories.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  active
                    ? 'pos-btn-primary'
                    : 'pos-surface-soft border pos-muted hover:opacity-85'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Menu Grid */}
        {filteredItems.length === 0 ? (
          <div className="py-16 text-center text-sm pos-muted pos-surface-soft rounded-2xl border border-dashed">
            ไม่พบรายการสินค้าที่ตรงกับคำค้นหา
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {filteredItems.map((item) => {
              const qtyInCart = cartQtyMap[item.id] || 0;
              const imgSrc = normalizeDriveImageUrl(item.image);
              const isBroken = brokenImages[item.id];

              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={!item.inStock}
                  onClick={() => onAddToCart(item)}
                  className={`group text-left rounded-2xl border p-3 transition-all cursor-pointer flex flex-col ${
                    qtyInCart > 0
                      ? 'pos-accent-soft shadow-[0_6px_18px_rgba(15,23,42,0.10)]'
                      : 'pos-card hover:-translate-y-0.5'
                  } ${!item.inStock ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden pos-surface-soft mb-3">
                    {imgSrc && !isBroken ? (
                      <img
                        src={imgSrc}
                        alt={item.name}
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setBrokenImages((prev) => ({ ...prev, [item.id]: true }))
                        }
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center pos-muted p-2">
                        <ShoppingBag className="w-7 h-7 mb-1" />
                        <span className="text-[11px] font-medium truncate max-w-full">
                          {item.category}
                        </span>
                      </div>
                    )}

                    {qtyInCart > 0 && (
                      <span className="absolute top-2 right-2 min-w-6 h-6 px-1.5 rounded-lg pos-btn-primary text-xs font-bold font-mono-tabular flex items-center justify-center shadow">
                        {qtyInCart}
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] pos-muted mb-0.5">{item.category}</div>
                  <div className="text-sm font-bold pos-ink line-clamp-1">
                    {item.name}
                  </div>
                  <div className="mt-auto pt-2 flex items-center justify-between">
                    <span className="text-base font-bold pos-accent-text font-mono-tabular">
                      ฿{item.price.toLocaleString('th-TH')}
                    </span>
                    <span className="text-xs font-semibold pos-accent-text group-hover:opacity-80">
                      {item.inStock ? '+ เพิ่ม' : 'หมด'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Cart & Checkout Column */}
      <aside className="lg:col-span-5 xl:col-span-4 pos-card rounded-3xl border shadow-[0_8px_28px_rgba(15,23,42,0.08)] p-5 sm:p-6 lg:sticky lg:top-5">
        <div className="flex items-center justify-between pb-3 border-b pos-border">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 pos-accent-text" />
            <h2 className="text-lg font-bold pos-ink">ตะกร้าสินค้า</h2>
          </div>
          {cart.length > 0 && (
            <button
              type="button"
              onClick={onClearCart}
              className="flex items-center gap-1 text-xs font-semibold text-[#e14b6a] hover:opacity-80 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>ล้างตะกร้า</span>
            </button>
          )}
        </div>

        {/* Cart Items */}
        {cart.length === 0 ? (
          <div className="py-10 text-center text-sm pos-muted">
            ยังไม่มีสินค้าในตะกร้า
          </div>
        ) : (
          <ul className="divide-y pos-border max-h-64 overflow-y-auto my-2 pr-1">
            {cart.map(({ item, qty }) => (
              <li key={item.id} className="py-3 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold pos-ink truncate">
                    {item.name}
                  </div>
                  <div className="text-xs pos-muted font-mono-tabular">
                    ฿{item.price.toLocaleString('th-TH')} × {qty} = ฿
                    {(item.price * qty).toLocaleString('th-TH')}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    aria-label={`ลดจำนวน ${item.name}`}
                    onClick={() => onUpdateQty(item.id, -1)}
                    className="w-7 h-7 rounded-lg border pos-btn-secondary flex items-center justify-center cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-6 text-center text-sm font-bold font-mono-tabular pos-ink">
                    {qty}
                  </span>
                  <button
                    type="button"
                    aria-label={`เพิ่มจำนวน ${item.name}`}
                    onClick={() => onUpdateQty(item.id, 1)}
                    className="w-7 h-7 rounded-lg border pos-btn-secondary flex items-center justify-center cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Total Summary */}
        <div className="mt-3 pt-4 border-t pos-border">
          <div className="flex items-baseline justify-between mb-4">
            <span className="text-sm font-semibold pos-muted">ยอดรวมทั้งหมด</span>
            <span className="text-2xl font-bold pos-ink font-mono-tabular">
              ฿{total.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* Payment Method Selector */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl pos-nav-shell border mb-4">
            <button
              type="button"
              onClick={() => setPaymentMethod('Cash')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                paymentMethod === 'Cash'
                  ? 'pos-card pos-accent-text shadow-sm'
                  : 'pos-muted hover:opacity-85'
              }`}
            >
              <Banknote className="w-4 h-4" />
              <span>เงินสด</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('PromptPay')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                paymentMethod === 'PromptPay'
                  ? 'pos-card pos-accent-text shadow-sm'
                  : 'pos-muted hover:opacity-85'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>พร้อมเพย์</span>
            </button>
          </div>

          {/* Cash Input Panel */}
          {paymentMethod === 'Cash' ? (
            <div className="space-y-3 pos-surface-soft rounded-2xl border p-4 mb-4">
              <div>
                <label
                  htmlFor="cash-received"
                  className="block text-xs font-semibold pos-muted mb-1.5"
                >
                  รับเงินสด (บาท)
                </label>
                <input
                  id="cash-received"
                  type="number"
                  min={0}
                  step="any"
                  value={cashInput}
                  onChange={(e) => setCashInput(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2 rounded-xl border pos-card text-right text-lg font-bold font-mono-tabular focus:outline-none focus:ring-2 focus:ring-[var(--pos-accent)]/40"
                />
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                <button
                  type="button"
                  disabled={total <= 0}
                  onClick={() => setCashInput(String(total))}
                  className="py-1.5 rounded-lg pos-card border hover:opacity-85 disabled:opacity-50 text-xs font-semibold pos-accent-text cursor-pointer"
                >
                  พอดี
                </button>
                {[100, 500, 1000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setCashInput(String(amt))}
                    className="py-1.5 rounded-lg pos-card border hover:opacity-85 text-xs font-semibold font-mono-tabular pos-accent-text cursor-pointer"
                  >
                    {amt}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2 border-t pos-border text-sm">
                <span className="font-semibold pos-muted">เงินทอน</span>
                <span
                  className={`text-lg font-bold font-mono-tabular ${
                    total > 0 && paymentCalc.received < total
                      ? 'text-[#e14b6a]'
                      : 'text-[#22a06b]'
                  }`}
                >
                  {total > 0 && paymentCalc.received < total
                    ? `ขาดอีก ฿${(total - paymentCalc.received).toLocaleString('th-TH', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`
                    : `฿${paymentCalc.change.toLocaleString('th-TH', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`}
                </span>
              </div>
            </div>
          ) : (
            <div className="pos-surface-soft rounded-2xl border p-4 mb-4 flex flex-col items-center text-center">
              {total <= 0 ? (
                <p className="text-xs pos-muted py-4">
                  เพิ่มสินค้าลงตะกร้าเพื่อสร้างคิวอาร์โค้ดพร้อมเพย์
                </p>
              ) : !settings.promptPayId.trim() ? (
                <p className="text-xs text-[#e14b6a] py-4">
                  ยังไม่ได้ตั้งค่าหมายเลขพร้อมเพย์ในหน้าตั้งค่าร้าน
                </p>
              ) : (
                <>
                  <div className="text-xs font-semibold pos-accent-text mb-2">
                    สแกนจ่าย PromptPay · ยอดรับพอดี ฿{total.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </div>
                  {qrDataUrl && (
                    <div className="bg-white p-2.5 rounded-2xl border pos-border shadow-sm">
                      <img
                        src={qrDataUrl}
                        alt="PromptPay QR Code"
                        className="w-40 h-40 object-contain"
                      />
                    </div>
                  )}
                  <div className="text-[11px] pos-muted mt-2 font-mono-tabular">
                    PromptPay ID: {settings.promptPayId}
                  </div>
                </>
              )}
            </div>
          )}

          <button
            type="button"
            disabled={!paymentCalc.isValid || isCheckingOut}
            onClick={handleCheckoutSubmit}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl pos-btn-primary disabled:opacity-45 disabled:cursor-not-allowed font-bold shadow-sm transition-colors cursor-pointer"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>{isCheckingOut ? 'กำลังบันทึกใบเสร็จ...' : 'ชำระเงินและออกใบเสร็จ'}</span>
          </button>
        </div>
      </aside>
    </main>
  );
};
