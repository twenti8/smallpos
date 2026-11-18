import type {
  AppTab,
  CartItem,
  CheckoutPayload,
  PaymentMethod,
  UserRole,
} from '../types/pos';

export function calculateCartTotal(cart: CartItem[]): number {
  return cart.reduce((sum, entry) => sum + Number(entry.item.price) * entry.qty, 0);
}

export function computePaymentAmounts(
  total: number,
  paymentMethod: PaymentMethod,
  cashReceivedInput: number | string
): {
  total: number;
  received: number;
  change: number;
  isValid: boolean;
} {
  const safeTotal = Math.max(0, Number(total) || 0);
  if (paymentMethod === 'PromptPay') {
    return {
      total: safeTotal,
      received: safeTotal,
      change: 0,
      isValid: safeTotal > 0,
    };
  }

  const parsedCash = Number(cashReceivedInput);
  const received = Number.isFinite(parsedCash) && parsedCash >= 0 ? parsedCash : 0;
  const change = received >= safeTotal ? Number((received - safeTotal).toFixed(2)) : 0;

  return {
    total: safeTotal,
    received,
    change,
    isValid: safeTotal > 0 && received >= safeTotal,
  };
}

export function formatItemsSummary(cart: CartItem[]): string {
  return cart
    .map((entry) => `${entry.item.name} x${entry.qty}`)
    .join(', ');
}

export function buildCheckoutPayload(params: {
  receiptNo: string;
  cart: CartItem[];
  total: number;
  received: number;
  change: number;
  paymentMethod: PaymentMethod;
  staffName: string;
  receiptImage: string;
}): CheckoutPayload {
  const isPromptPay = params.paymentMethod === 'PromptPay';
  const totalNum = Number(params.total) || 0;
  const receivedNum = isPromptPay ? totalNum : Number(params.received) || 0;
  const changeNum = isPromptPay ? 0 : Math.max(0, Number(params.change) || 0);

  return {
    action: 'checkout',
    receiptNo: params.receiptNo,
    items: formatItemsSummary(params.cart),
    total: totalNum,
    received: receivedNum,
    change: changeNum,
    paymentMethod: params.paymentMethod,
    staffName: params.staffName,
    receiptImage: params.receiptImage,
  };
}

export function buildSheetsRowArray(
  payload: CheckoutPayload,
  thaiTimestamp: string,
  receiptDriveUrl: string
): [string, string, string, number, number, number, string, string, string] {
  return [
    thaiTimestamp,
    payload.receiptNo,
    payload.items,
    Number(payload.total),
    Number(payload.received),
    Number(payload.change),
    payload.paymentMethod,
    payload.staffName,
    receiptDriveUrl,
  ];
}

export function formatThailandTimestamp(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return `${get('day')}/${get('month')}/${get('year')} ${get('hour')}:${get('minute')}:${get('second')}`;
}

export function generateReceiptNo(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok',
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  const rand = Math.floor(10 + Math.random() * 90);
  return `RC${get('year')}${get('month')}${get('day')}-${get('hour')}${get('minute')}${rand}`;
}

export function canAccessTab(role: UserRole | undefined | null, tab: AppTab): boolean {
  if (!role) return false;
  if (role === 'admin') return true;
  return tab === 'pos';
}

export function normalizeDriveImageUrl(rawUrl: string): string {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('data:') || trimmed.startsWith('/')) {
    return trimmed;
  }

  const fileMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch?.[1]) {
    return `https://drive.google.com/uc?export=view&id=${fileMatch[1]}`;
  }

  const openMatch = trimmed.match(/drive\.google\.com\/(?:open|uc)\?[^#]*id=([a-zA-Z0-9_-]+)/);
  if (openMatch?.[1]) {
    return `https://drive.google.com/uc?export=view&id=${openMatch[1]}`;
  }

  return trimmed;
}

function formatTlv(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

function crc16Ccitt(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function generatePromptPayPayload(targetId: string, amount?: number): string {
  const sanitized = (targetId || '').replace(/[^0-9]/g, '');
  if (!sanitized) return '';

  let targetTag = '';
  if (sanitized.length >= 15) {
    targetTag = formatTlv('03', sanitized.slice(0, 15));
  } else if (sanitized.length === 13) {
    targetTag = formatTlv('02', sanitized);
  } else {
    let mobile = sanitized;
    if (mobile.startsWith('0')) {
      mobile = `0066${mobile.slice(1)}`;
    } else if (!mobile.startsWith('0066')) {
      mobile = `0066${mobile}`;
    }
    targetTag = formatTlv('01', mobile.padStart(13, '0'));
  }

  const merchantAccountInfo = formatTlv('00', 'A000000677010111') + targetTag;
  const hasAmount = typeof amount === 'number' && Number.isFinite(amount) && amount > 0;

  const segments = [
    formatTlv('00', '01'),
    formatTlv('01', hasAmount ? '12' : '11'),
    formatTlv('29', merchantAccountInfo),
    formatTlv('53', '764'),
    ...(hasAmount ? [formatTlv('54', amount.toFixed(2))] : []),
    formatTlv('58', 'TH'),
  ];

  const payloadWithoutCrc = `${segments.join('')}6304`;
  return `${payloadWithoutCrc}${crc16Ccitt(payloadWithoutCrc)}`;
}

export interface RawUserInput {
  id?: string;
  username: string;
  password: string;
  name: string;
  role: string;
  status: string;
}

export function normalizeUserAccount(raw: RawUserInput) {
  const username = String(raw.username || '').trim();
  const role: UserRole = String(raw.role || '').trim().toLowerCase() === 'admin' ? 'admin' : 'staff';
  const status: 'active' | 'inactive' =
    String(raw.status || '').trim().toLowerCase() === 'inactive' ? 'inactive' : 'active';
  return {
    id: raw.id || `user-${username.toLowerCase()}`,
    username,
    password: String(raw.password || ''),
    name: String(raw.name || username).trim(),
    role,
    status,
  };
}

export function upsertUserInList<
  T extends { id: string; username: string; password: string; name: string; role: UserRole; status: 'active' | 'inactive' }
>(users: T[], incoming: T): T[] {
  const target = incoming.username.trim().toLowerCase();
  const exists = users.some((u) => u.username.trim().toLowerCase() === target);
  if (exists) {
    return users.map((u) =>
      u.username.trim().toLowerCase() === target ? { ...u, ...incoming } : u
    );
  }
  return [...users, incoming];
}

export function removeUserFromList<T extends { username: string }>(
  users: T[],
  username: string
): T[] {
  const target = username.trim().toLowerCase();
  return users.filter((u) => u.username.trim().toLowerCase() !== target);
}

