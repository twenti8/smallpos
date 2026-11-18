import type { AuthUser, CheckoutPayload, LocalUserAccount, UserRole } from '../types/pos';
import { normalizeUserAccount } from '../utils/posLogic';

export const GAS_URL_STORAGE_KEY = 'pos_gas_url';

/**
 * Resolves the Google Apps Script Web App URL silently from localStorage or VITE_GAS_URL.
 * Never exposed on the login screen.
 */
export function resolveGasUrl(settingsGasUrl?: string): string {
  const fromArg = (settingsGasUrl || '').trim();
  if (fromArg) return fromArg;

  if (typeof window !== 'undefined') {
    const fromStorage = (window.localStorage.getItem(GAS_URL_STORAGE_KEY) || '').trim();
    if (fromStorage) return fromStorage;
  }

  const fromEnv = (import.meta.env?.VITE_GAS_URL || '').trim();
  return fromEnv;
}

async function postGasJson<T = Record<string, unknown>>(
  gasUrl: string,
  body: Record<string, unknown>
): Promise<T> {
  const response = await fetch(gasUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error('เกิดข้อผิดพลาดในการเชื่อมต่อ Google Apps Script');
  }

  return (await response.json()) as T;
}

export interface LoginResult {
  user: AuthUser;
  mode: 'gas' | 'local';
}

export async function authenticateUser(params: {
  username: string;
  password: string;
  localUsers: LocalUserAccount[];
  settingsGasUrl?: string;
}): Promise<LoginResult> {
  const cleanUser = params.username.trim();
  const cleanPass = params.password;

  if (!cleanUser || !cleanPass) {
    throw new Error('กรุณากรอกชื่อผู้ใช้และรหัสผ่านให้ครบถ้วน');
  }

  const gasUrl = resolveGasUrl(params.settingsGasUrl);

  if (gasUrl) {
    let data: { status?: string; message?: string; user?: Record<string, unknown> };
    try {
      data = await postGasJson(gasUrl, {
        action: 'login',
        username: cleanUser,
        password: cleanPass,
      });
    } catch {
      throw new Error('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เข้าสู่ระบบได้ กรุณาลองใหม่อีกครั้ง');
    }

    if (data?.status !== 'success' || !data?.user) {
      throw new Error(data?.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง หรือบัญชีถูกปิดใช้งาน');
    }

    const role: UserRole =
      String(data.user.role || '').toLowerCase() === 'admin' ? 'admin' : 'staff';
    return {
      mode: 'gas',
      user: {
        username: String(data.user.username || cleanUser),
        name: String(data.user.name || data.user.username || cleanUser),
        role,
      },
    };
  }

  const matched = params.localUsers.find(
    (u) =>
      u.username.toLowerCase() === cleanUser.toLowerCase() &&
      u.password === cleanPass &&
      u.status === 'active'
  );

  if (!matched) {
    throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง หรือบัญชีถูกปิดใช้งาน');
  }

  return {
    mode: 'local',
    user: {
      username: matched.username,
      name: matched.name,
      role: matched.role,
    },
  };
}

export async function fetchUsersFromGas(
  settingsGasUrl?: string
): Promise<LocalUserAccount[]> {
  const gasUrl = resolveGasUrl(settingsGasUrl);
  if (!gasUrl) {
    throw new Error('ยังไม่ได้ตั้งค่า GAS URL');
  }

  const data = await postGasJson<{
    status?: string;
    message?: string;
    users?: Array<{
      username: string;
      password: string;
      name: string;
      role: string;
      status: string;
    }>;
  }>(gasUrl, { action: 'getUsers' });

  if (data?.status !== 'success') {
    throw new Error(data?.message || 'ไม่สามารถดึงรายชื่อผู้ใช้งานจาก Google Sheets ได้');
  }

  const rows = Array.isArray(data.users) ? data.users : [];
  return rows.map((row) => normalizeUserAccount(row));
}

export async function saveUserToGas(
  user: {
    username: string;
    password: string;
    name: string;
    role: UserRole;
    status: 'active' | 'inactive';
  },
  settingsGasUrl?: string
): Promise<LocalUserAccount> {
  const gasUrl = resolveGasUrl(settingsGasUrl);
  if (!gasUrl) {
    return normalizeUserAccount(user);
  }

  const data = await postGasJson<{
    status?: string;
    message?: string;
    user?: {
      username: string;
      password: string;
      name: string;
      role: string;
      status: string;
    };
  }>(gasUrl, {
    action: 'saveUser',
    username: user.username.trim(),
    password: user.password,
    name: user.name.trim(),
    role: user.role,
    status: user.status,
  });

  if (data?.status !== 'success') {
    throw new Error(data?.message || 'บันทึกผู้ใช้งานไปยัง Google Sheets ไม่สำเร็จ');
  }

  return normalizeUserAccount(data.user || user);
}

export async function deleteUserFromGas(
  username: string,
  settingsGasUrl?: string
): Promise<void> {
  const gasUrl = resolveGasUrl(settingsGasUrl);
  if (!gasUrl) return;

  const data = await postGasJson<{ status?: string; message?: string }>(gasUrl, {
    action: 'deleteUser',
    username: username.trim(),
  });

  if (data?.status !== 'success') {
    throw new Error(data?.message || 'ลบผู้ใช้งานใน Google Sheets ไม่สำเร็จ');
  }
}

export async function syncUsersToGasIfSheetEmpty(
  seedUsers: LocalUserAccount[],
  settingsGasUrl?: string
): Promise<LocalUserAccount[]> {
  const remoteUsers = await fetchUsersFromGas(settingsGasUrl);
  if (remoteUsers.length > 0) {
    return remoteUsers;
  }

  const created: LocalUserAccount[] = [];
  for (const user of seedUsers) {
    const saved = await saveUserToGas(user, settingsGasUrl);
    created.push(saved);
  }
  return created;
}

export interface CheckoutSyncResult {
  synced: boolean;
  receiptDriveUrl?: string;
  message?: string;
}

export async function submitCheckoutPayload(
  payload: CheckoutPayload,
  settingsGasUrl?: string
): Promise<CheckoutSyncResult> {
  const gasUrl = resolveGasUrl(settingsGasUrl);
  if (!gasUrl) {
    return {
      synced: false,
      message: 'บันทึกในเครื่องเรียบร้อย (ยังไม่ได้ตั้งค่าการเชื่อมต่อ Google Sheets)',
    };
  }

  try {
    const data = await postGasJson<{
      status?: string;
      receiptDriveUrl?: string;
      message?: string;
    }>(gasUrl, payload as unknown as Record<string, unknown>);

    if (data?.status === 'success') {
      return {
        synced: true,
        receiptDriveUrl: data.receiptDriveUrl || '',
        message: 'บันทึกลง Google Sheets และ Google Drive เรียบร้อยแล้ว',
      };
    }

    return {
      synced: false,
      message: data?.message || 'ส่งข้อมูลไปยัง Google Sheets ไม่สำเร็จ',
    };
  } catch {
    return {
      synced: false,
      message: 'บันทึกรายการในเครื่องแล้ว (การเชื่อมต่อเครือข่ายขัดข้อง)',
    };
  }
}
