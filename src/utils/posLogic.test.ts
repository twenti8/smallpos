import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCheckoutPayload,
  buildSheetsRowArray,
  calculateCartTotal,
  canAccessTab,
  computePaymentAmounts,
  formatItemsSummary,
  formatThailandTimestamp,
  generatePromptPayPayload,
  normalizeDriveImageUrl,
  normalizeUserAccount,
  removeUserFromList,
  upsertUserInList,
} from './posLogic';
import { buildThemeTokens, PRESET_THEMES } from './themes';
import type { CartItem } from '../types/pos';

const sampleCart: CartItem[] = [
  {
    item: {
      id: 'm1',
      name: 'Iced Caramel Latte',
      category: 'เครื่องดื่ม',
      price: 85,
      image: '/src/assets/images/menu_iced_latte_1794968608247.jpg',
      inStock: true,
    },
    qty: 2,
  },
  {
    item: {
      id: 'm4',
      name: 'Butter Croissant',
      category: 'เบเกอรี่',
      price: 75,
      image: '/src/assets/images/menu_butter_croissant_1794968610141.jpg',
      inStock: true,
    },
    qty: 1,
  },
];

test('role access blocks staff from summary and settings, allows admin everywhere', () => {
  assert.equal(canAccessTab('staff', 'pos'), true);
  assert.equal(canAccessTab('staff', 'summary'), false);
  assert.equal(canAccessTab('staff', 'settings'), false);

  assert.equal(canAccessTab('admin', 'pos'), true);
  assert.equal(canAccessTab('admin', 'summary'), true);
  assert.equal(canAccessTab('admin', 'settings'), true);

  assert.equal(canAccessTab(null, 'pos'), false);
});

test('cart total and payment calculation handles PromptPay and Cash accurately', () => {
  const total = calculateCartTotal(sampleCart);
  assert.equal(total, 245);

  const qrPayment = computePaymentAmounts(total, 'PromptPay', 0);
  assert.equal(qrPayment.received, 245);
  assert.equal(qrPayment.change, 0);
  assert.equal(qrPayment.isValid, true);

  const cashExact = computePaymentAmounts(total, 'Cash', 300);
  assert.equal(cashExact.received, 300);
  assert.equal(cashExact.change, 55);
  assert.equal(cashExact.isValid, true);

  const cashShort = computePaymentAmounts(total, 'Cash', 200);
  assert.equal(cashShort.change, 0);
  assert.equal(cashShort.isValid, false);
});

test('checkout payload and 9-column Google Sheets row match exact schema A-I', () => {
  const payload = buildCheckoutPayload({
    receiptNo: 'RC261118-1001',
    cart: sampleCart,
    total: 245,
    received: 500,
    change: 255,
    paymentMethod: 'Cash',
    staffName: 'โมจิ (Staff)',
    receiptImage: 'data:image/png;base64,AAA',
  });

  assert.deepEqual(Object.keys(payload), [
    'action',
    'receiptNo',
    'items',
    'total',
    'received',
    'change',
    'paymentMethod',
    'staffName',
    'receiptImage',
  ]);
  assert.equal(payload.items, 'Iced Caramel Latte x2, Butter Croissant x1');
  assert.equal(typeof payload.total, 'number');
  assert.equal(typeof payload.received, 'number');
  assert.equal(typeof payload.change, 'number');

  const qrPayload = buildCheckoutPayload({
    receiptNo: 'RC261118-1002',
    cart: sampleCart,
    total: 245,
    received: 0,
    change: 99,
    paymentMethod: 'PromptPay',
    staffName: 'แพรว (Admin)',
    receiptImage: 'data:image/png;base64,BBB',
  });
  assert.equal(qrPayload.received, 245);
  assert.equal(qrPayload.change, 0);

  const row = buildSheetsRowArray(
    qrPayload,
    '18/11/2026 09:22:30',
    'https://drive.google.com/file/d/xyz/view'
  );
  assert.equal(row.length, 9);
  assert.deepEqual(row, [
    '18/11/2026 09:22:30',
    'RC261118-1002',
    'Iced Caramel Latte x2, Butter Croissant x1',
    245,
    245,
    0,
    'PromptPay',
    'แพรว (Admin)',
    'https://drive.google.com/file/d/xyz/view',
  ]);
});

test('Thailand timestamp formats dd/MM/yyyy HH:mm:ss in GMT+7', () => {
  const utcDate = new Date('2026-11-18T02:05:09.000Z');
  assert.equal(formatThailandTimestamp(utcDate), '18/11/2026 09:05:09');
});

test('Google Drive URL normalizer extracts file ID into direct view URL', () => {
  assert.equal(
    normalizeDriveImageUrl('https://drive.google.com/file/d/1AbCdEfG_123/view?usp=sharing'),
    'https://drive.google.com/uc?export=view&id=1AbCdEfG_123'
  );
  assert.equal(
    normalizeDriveImageUrl('https://drive.google.com/open?id=9ZyXwV_456'),
    'https://drive.google.com/uc?export=view&id=9ZyXwV_456'
  );
  assert.equal(
    normalizeDriveImageUrl('/src/assets/images/shop_logo.jpg'),
    '/src/assets/images/shop_logo.jpg'
  );
});

test('PromptPay EMVCo payload includes merchant tag, THB currency, amount, and 4-char CRC', () => {
  const payload = generatePromptPayPayload('0812345678', 120.5);
  assert.ok(payload.startsWith('000201010212'));
  assert.ok(payload.includes('0066812345678'));
  assert.ok(payload.includes('5303764'));
  assert.ok(payload.includes('5406120.50'));
  assert.match(payload, /6304[0-9A-F]{4}$/);
  assert.equal(formatItemsSummary(sampleCart), 'Iced Caramel Latte x2, Butter Croissant x1');
});

test('user account normalization, upsert, and removal helpers work consistently', () => {
  const normalized = normalizeUserAccount({
    username: '  Mint  ',
    password: 'pw1',
    name: '  มินท์  ',
    role: 'ADMIN',
    status: 'INACTIVE',
  });
  assert.equal(normalized.username, 'Mint');
  assert.equal(normalized.role, 'admin');
  assert.equal(normalized.status, 'inactive');

  const initial = [
    normalizeUserAccount({
      username: 'admin',
      password: '123',
      name: 'Admin',
      role: 'admin',
      status: 'active',
    }),
  ];
  const added = upsertUserInList(
    initial,
    normalizeUserAccount({
      username: 'staff1',
      password: 'abc',
      name: 'Staff 1',
      role: 'staff',
      status: 'active',
    })
  );
  assert.equal(added.length, 2);

  const updated = upsertUserInList(
    added,
    normalizeUserAccount({
      username: 'STAFF1',
      password: 'xyz',
      name: 'Staff One',
      role: 'admin',
      status: 'inactive',
    })
  );
  assert.equal(updated.length, 2);
  assert.equal(updated[1].password, 'xyz');
  assert.equal(updated[1].role, 'admin');

  const removed = removeUserFromList(updated, 'staff1');
  assert.equal(removed.length, 1);
  assert.equal(removed[0].username, 'admin');
});

test('theme builder resolves 12 presets and computes custom color contrast', () => {
  assert.equal(PRESET_THEMES.length, 12);
  const pink = buildThemeTokens('pastel-pink');
  assert.equal(pink.label, 'ชมพูพาสเทล');
  assert.equal(pink.isDark, false);

  const darkNavy = buildThemeTokens('dark-navy');
  assert.equal(darkNavy.isDark, true);

  const customLight = buildThemeTokens('custom', '#f9d423');
  assert.equal(customLight.id, 'custom');
  assert.equal(customLight.accent, '#f9d423');
  assert.equal(customLight.accentOn, '#182436');

  const customDark = buildThemeTokens('custom', '#5e2b97');
  assert.equal(customDark.accentOn, '#ffffff');
});


