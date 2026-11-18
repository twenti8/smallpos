import React, { useCallback, useEffect, useState } from 'react';
import {
  Check,
  Eye,
  EyeOff,
  Link2,
  Palette,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Store,
  Trash2,
  Upload,
  UserPlus,
  X,
} from 'lucide-react';
import {
  deleteUserFromGas,
  resolveGasUrl,
  saveUserToGas,
  syncUsersToGasIfSheetEmpty,
} from '../services/gasApi';
import type {
  AuthUser,
  LocalUserAccount,
  MenuItem,
  ShopSettings,
  ThemeId,
  UserRole,
} from '../types/pos';
import {
  normalizeDriveImageUrl,
  normalizeUserAccount,
  removeUserFromList,
  upsertUserInList,
} from '../utils/posLogic';
import { applyThemeCssVars, buildThemeTokens, PRESET_THEMES } from '../utils/themes';

interface SettingsViewProps {
  currentUser: AuthUser;
  settings: ShopSettings;
  menuItems: MenuItem[];
  localUsers: LocalUserAccount[];
  onSaveSettings: (next: ShopSettings) => void;
  onUpdateMenu: (next: MenuItem[]) => void;
  onUpdateUsers: (next: LocalUserAccount[]) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  settings,
  menuItems,
  localUsers,
  onSaveSettings,
  onUpdateMenu,
  onUpdateUsers,
}) => {
  const [form, setForm] = useState<ShopSettings>(settings);
  const [savedNotice, setSavedNotice] = useState(false);
  const [themeSavedNotice, setThemeSavedNotice] = useState(false);

  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('เครื่องดื่ม');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemImage, setNewItemImage] = useState('');

  // Manage Users state
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('staff');
  const [newStatus, setNewStatus] = useState<'active' | 'inactive'>('active');

  const [editingUsername, setEditingUsername] = useState<string | null>(null);
  const [editPassword, setEditPassword] = useState('');
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('staff');
  const [editStatus, setEditStatus] = useState<'active' | 'inactive'>('active');

  const [usersLoading, setUsersLoading] = useState(false);
  const [userActionBusy, setUserActionBusy] = useState(false);
  const [userSyncMessage, setUserSyncMessage] = useState('');
  const [userSyncError, setUserSyncError] = useState('');
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});

  const activeGasUrl = resolveGasUrl(form.gasUrl || settings.gasUrl);

  const loadRemoteUsers = useCallback(
    async (targetGasUrl: string, seedFallback: LocalUserAccount[]) => {
      if (!targetGasUrl) return;
      setUsersLoading(true);
      setUserSyncError('');
      try {
        const synced = await syncUsersToGasIfSheetEmpty(seedFallback, targetGasUrl);
        onUpdateUsers(synced);
        setUserSyncMessage(`ซิงค์รายชื่อผู้ใช้จากชีต Users สำเร็จ (${synced.length} บัญชี)`);
      } catch (err) {
        setUserSyncError(
          err instanceof Error
            ? err.message
            : 'ไม่สามารถโหลดข้อมูลจากชีต Users ได้'
        );
      } finally {
        setUsersLoading(false);
      }
    },
    [onUpdateUsers]
  );

  useEffect(() => {
    const initialGas = resolveGasUrl(settings.gasUrl);
    if (initialGas) {
      loadRemoteUsers(initialGas, localUsers);
    }
    // Load once when entering Admin Settings if GAS URL is configured
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectTheme = (themeId: ThemeId, customColor?: string) => {
    const nextColor = customColor ?? form.customThemeColor;
    setForm((prev) => ({
      ...prev,
      themeId,
      customThemeColor: nextColor,
    }));
    applyThemeCssVars(buildThemeTokens(themeId, nextColor));
  };

  const handleSaveTheme = () => {
    const nextSettings: ShopSettings = {
      ...settings,
      ...form,
      shopName: form.shopName.trim() || settings.shopName,
      gasUrl: form.gasUrl.trim(),
      logoUrl: form.logoUrl.trim(),
      promptPayId: form.promptPayId.trim(),
    };
    onSaveSettings(nextSettings);
    setThemeSavedNotice(true);
    window.setTimeout(() => setThemeSavedNotice(false), 2500);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedGasUrl = form.gasUrl.trim();
    const nextSettings: ShopSettings = {
      ...form,
      shopName: form.shopName.trim() || 'finedaevibe.',
      gasUrl: cleanedGasUrl,
      logoUrl: form.logoUrl.trim(),
      promptPayId: form.promptPayId.trim(),
    };
    onSaveSettings(nextSettings);
    setSavedNotice(true);
    window.setTimeout(() => setSavedNotice(false), 2500);

    if (cleanedGasUrl) {
      await loadRemoteUsers(cleanedGasUrl, localUsers);
    }
  };

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setForm((prev) => ({ ...prev, logoUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddMenuItem = (e: React.FormEvent) => {
    e.preventDefault();
    const price = Number(newItemPrice);
    if (!newItemName.trim() || !Number.isFinite(price) || price <= 0) return;

    const item: MenuItem = {
      id: `item-${Date.now()}`,
      name: newItemName.trim(),
      category: newItemCategory.trim() || 'อื่นๆ',
      price,
      image: newItemImage.trim(),
      inStock: true,
    };
    onUpdateMenu([...menuItems, item]);
    setNewItemName('');
    setNewItemPrice('');
    setNewItemImage('');
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserSyncError('');
    setUserSyncMessage('');

    const cleanUsername = newUsername.trim();
    if (!cleanUsername || !newPassword || !newFullName.trim()) {
      setUserSyncError('กรุณากรอก Username, Password และชื่อที่แสดงให้ครบถ้วน');
      return;
    }

    const exists = localUsers.some(
      (u) => u.username.toLowerCase() === cleanUsername.toLowerCase()
    );
    if (exists) {
      setUserSyncError(`มีชื่อผู้ใช้ "${cleanUsername}" อยู่ในระบบแล้ว`);
      return;
    }

    const candidate = normalizeUserAccount({
      username: cleanUsername,
      password: newPassword,
      name: newFullName.trim(),
      role: newRole,
      status: newStatus,
    });

    setUserActionBusy(true);
    try {
      const saved = activeGasUrl
        ? await saveUserToGas(candidate, activeGasUrl)
        : candidate;
      onUpdateUsers(upsertUserInList(localUsers, saved));
      setNewUsername('');
      setNewPassword('');
      setNewFullName('');
      setNewRole('staff');
      setNewStatus('active');
      setUserSyncMessage(
        activeGasUrl
          ? `เพิ่มบัญชี "${saved.username}" ลงในชีต Users เรียบร้อยแล้ว`
          : `เพิ่มบัญชี "${saved.username}" ในเครื่องเรียบร้อยแล้ว`
      );
    } catch (err) {
      setUserSyncError(
        err instanceof Error ? err.message : 'เพิ่มผู้ใช้งานไม่สำเร็จ'
      );
    } finally {
      setUserActionBusy(false);
    }
  };

  const startEditUser = (u: LocalUserAccount) => {
    setUserSyncError('');
    setEditingUsername(u.username);
    setEditPassword(u.password);
    setEditName(u.name);
    setEditRole(u.role);
    setEditStatus(u.status);
  };

  const handleSaveEditedUser = async (targetUsername: string) => {
    setUserSyncError('');
    setUserSyncMessage('');
    if (!editPassword || !editName.trim()) {
      setUserSyncError('กรุณากรอกรหัสผ่านและชื่อที่แสดง');
      return;
    }

    const payload = normalizeUserAccount({
      username: targetUsername,
      password: editPassword,
      name: editName.trim(),
      role: editRole,
      status: editStatus,
    });

    setUserActionBusy(true);
    try {
      const saved = activeGasUrl
        ? await saveUserToGas(payload, activeGasUrl)
        : payload;
      onUpdateUsers(upsertUserInList(localUsers, saved));
      setEditingUsername(null);
      setUserSyncMessage(
        activeGasUrl
          ? `อัปเดตบัญชี "${saved.username}" ในชีต Users เรียบร้อยแล้ว`
          : `อัปเดตบัญชี "${saved.username}" เรียบร้อยแล้ว`
      );
    } catch (err) {
      setUserSyncError(
        err instanceof Error ? err.message : 'อัปเดตข้อมูลผู้ใช้ไม่สำเร็จ'
      );
    } finally {
      setUserActionBusy(false);
    }
  };

  const handleToggleUserStatus = async (u: LocalUserAccount) => {
    setUserSyncError('');
    setUserSyncMessage('');
    const nextStatus: 'active' | 'inactive' =
      u.status === 'active' ? 'inactive' : 'active';
    const updated = { ...u, status: nextStatus };

    setUserActionBusy(true);
    try {
      const saved = activeGasUrl
        ? await saveUserToGas(updated, activeGasUrl)
        : updated;
      onUpdateUsers(upsertUserInList(localUsers, saved));
      setUserSyncMessage(
        activeGasUrl
          ? `เปลี่ยนสถานะ "${saved.username}" เป็น ${saved.status} ในชีต Users แล้ว`
          : `เปลี่ยนสถานะ "${saved.username}" เป็น ${saved.status} แล้ว`
      );
    } catch (err) {
      setUserSyncError(
        err instanceof Error ? err.message : 'เปลี่ยนสถานะผู้ใช้ไม่สำเร็จ'
      );
    } finally {
      setUserActionBusy(false);
    }
  };

  const handleDeleteUser = async (u: LocalUserAccount) => {
    setUserSyncError('');
    setUserSyncMessage('');

    if (u.username.toLowerCase() === currentUser.username.toLowerCase()) {
      setUserSyncError('ไม่สามารถลบบัญชีที่กำลังใช้งานอยู่ได้');
      return;
    }

    setUserActionBusy(true);
    try {
      if (activeGasUrl) {
        await deleteUserFromGas(u.username, activeGasUrl);
      }
      onUpdateUsers(removeUserFromList(localUsers, u.username));
      if (editingUsername === u.username) {
        setEditingUsername(null);
      }
      setUserSyncMessage(
        activeGasUrl
          ? `ลบบัญชี "${u.username}" ออกจากชีต Users เรียบร้อยแล้ว`
          : `ลบบัญชี "${u.username}" เรียบร้อยแล้ว`
      );
    } catch (err) {
      setUserSyncError(
        err instanceof Error ? err.message : 'ลบผู้ใช้งานไม่สำเร็จ'
      );
    } finally {
      setUserActionBusy(false);
    }
  };

  const previewLogo = normalizeDriveImageUrl(form.logoUrl);
  const customThemeTokens = buildThemeTokens('custom', form.customThemeColor);

  return (
    <main className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-4 space-y-6">
      {/* Store Info & GAS URL Configuration (Admin Only) */}
      <form
        onSubmit={handleSave}
        className="pos-card rounded-3xl border shadow-[0_8px_28px_rgba(15,23,42,0.06)] p-6 space-y-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b pos-border">
          <div className="flex items-center gap-2.5">
            <Store className="w-5 h-5 pos-accent-text" />
            <div>
              <h1 className="text-xl font-bold pos-ink">ตั้งค่าร้านค้าและการเชื่อมต่อ</h1>
              <p className="text-xs pos-muted">
                ปรับแต่งข้อมูลหัวใบเสร็จ พร้อมเพย์ และลิงก์ Google Apps Script (เฉพาะผู้ดูแลระบบ)
              </p>
            </div>
          </div>

          <button
            type="submit"
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl pos-btn-primary text-sm font-semibold shadow-sm cursor-pointer transition-colors"
          >
            {savedNotice ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>{savedNotice ? 'บันทึกเรียบร้อย' : 'บันทึกการตั้งค่า'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label htmlFor="set-shop-name" className="block text-xs font-semibold pos-ink mb-1.5">
              ชื่อร้าน
            </label>
            <input
              id="set-shop-name"
              type="text"
              value={form.shopName}
              onChange={(e) => setForm({ ...form, shopName: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border pos-input text-sm"
            />
          </div>

          <div>
            <label htmlFor="set-promptpay" className="block text-xs font-semibold pos-ink mb-1.5">
              หมายเลขพร้อมเพย์ (เบอร์มือถือ / เลขบัตรประชาชน)
            </label>
            <input
              id="set-promptpay"
              type="text"
              value={form.promptPayId}
              onChange={(e) => setForm({ ...form, promptPayId: e.target.value })}
              placeholder="0812345678"
              className="w-full px-3.5 py-2.5 rounded-xl border pos-input text-sm font-mono-tabular"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="set-tagline" className="block text-xs font-semibold pos-ink mb-1.5">
              คำโปรยใต้ชื่อร้าน (หัวใบเสร็จ)
            </label>
            <input
              id="set-tagline"
              type="text"
              value={form.shopTagline}
              onChange={(e) => setForm({ ...form, shopTagline: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border pos-input text-sm"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="set-note" className="block text-xs font-semibold pos-ink mb-1.5">
              ข้อความท้ายใบเสร็จ
            </label>
            <input
              id="set-note"
              type="text"
              value={form.receiptNote}
              onChange={(e) => setForm({ ...form, receiptNote: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border pos-input text-sm"
            />
          </div>

          {/* Logo URL + File Upload */}
          <div className="md:col-span-2 flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-2xl pos-surface-soft border">
            <div className="w-16 h-16 rounded-2xl bg-white border pos-border overflow-hidden shrink-0 flex items-center justify-center">
              {previewLogo ? (
                <img
                  src={previewLogo}
                  alt="ตัวอย่างโลโก้"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-xs pos-muted">ไม่มีรูป</span>
              )}
            </div>

            <div className="flex-1 w-full space-y-2">
              <label htmlFor="set-logo-url" className="block text-xs font-semibold pos-ink">
                โลโก้ร้านบนใบเสร็จ (รองรับ URL, Google Drive หรืออัปโหลดไฟล์)
              </label>
              <div className="flex flex-wrap gap-2">
                <input
                  id="set-logo-url"
                  type="text"
                  value={form.logoUrl}
                  onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                  placeholder="https://... หรืออัปโหลดรูป"
                  className="flex-1 min-w-[200px] px-3 py-2 rounded-xl border pos-input text-xs"
                />
                <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl pos-btn-secondary border text-xs font-semibold cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>อัปโหลดรูป</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoFileUpload}
                    className="sr-only"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Admin-only GAS URL Config */}
          <div className="md:col-span-2 p-4 rounded-2xl pos-surface-soft border">
            <div className="flex items-center gap-2 mb-1.5">
              <Link2 className="w-4 h-4 pos-accent-text" />
              <label htmlFor="set-gas-url" className="text-xs font-bold pos-ink">
                Google Apps Script Web App URL (GAS URL)
              </label>
            </div>
            <input
              id="set-gas-url"
              type="url"
              value={form.gasUrl}
              onChange={(e) => setForm({ ...form, gasUrl: e.target.value })}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full px-3.5 py-2.5 rounded-xl border pos-input text-xs font-mono-tabular"
            />
            <p className="text-[11px] pos-muted mt-1.5">
              ใช้สำหรับซิงค์บัญชีผู้ใช้กับชีต Users และบันทึกยอดขาย 9 คอลัมน์ (A–I) พร้อมรูปใบเสร็จลง Google Drive อัตโนมัติ
            </p>
          </div>
        </div>
      </form>

      {/* Theme Color Switcher & Custom Color (Matching Reference Screenshot) */}
      <section className="pos-card rounded-3xl border shadow-[0_8px_28px_rgba(15,23,42,0.06)] p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Palette className="w-5 h-5 pos-accent-text" />
            <div>
              <h2 className="text-lg font-bold pos-ink">ธีมสีของร้าน</h2>
              <p className="text-xs pos-muted">
                สีของหน้าเข้าสู่ระบบทั้งหน้า · ปุ่ม การ์ด ตัวหนังสือ และไอคอนเปลี่ยนตามกัน
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSaveTheme}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl pos-btn-primary text-xs font-semibold shadow-sm cursor-pointer transition-colors"
          >
            {themeSavedNotice ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>{themeSavedNotice ? 'บันทึกธีมสีแล้ว' : 'บันทึกธีมสี'}</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {PRESET_THEMES.map((theme) => {
            const selected = form.themeId === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                aria-pressed={selected}
                onClick={() => handleSelectTheme(theme.id)}
                className={`rounded-2xl border p-2.5 text-center transition-all cursor-pointer ${
                  selected
                    ? 'pos-accent-soft ring-2 ring-[var(--pos-accent)]/35'
                    : 'pos-surface-soft hover:opacity-90'
                }`}
              >
                <div
                  className="w-full h-7 rounded-xl mb-2 border pos-border"
                  style={{
                    background: `linear-gradient(90deg, ${theme.swatchStart}, ${theme.swatchEnd})`,
                  }}
                />
                <div className="text-xs font-semibold pos-ink truncate">{theme.label}</div>
              </button>
            );
          })}

          {/* Custom Color Card */}
          <div
            className={`rounded-2xl border p-2.5 text-center transition-all ${
              form.themeId === 'custom'
                ? 'pos-accent-soft ring-2 ring-[var(--pos-accent)]/35'
                : 'pos-surface-soft'
            }`}
          >
            <button
              type="button"
              aria-pressed={form.themeId === 'custom'}
              onClick={() => handleSelectTheme('custom', form.customThemeColor)}
              className="w-full cursor-pointer"
            >
              <div
                className="w-full h-7 rounded-xl mb-2 border pos-border"
                style={{
                  background: `linear-gradient(90deg, ${customThemeTokens.swatchStart}, ${customThemeTokens.swatchEnd})`,
                }}
              />
              <div className="text-xs font-semibold pos-ink">สีของร้านเอง</div>
            </button>
            <div className="mt-1.5 flex items-center justify-center gap-1.5">
              <input
                type="color"
                aria-label="เลือกสีของร้านเอง"
                value={form.customThemeColor}
                onChange={(e) => handleSelectTheme('custom', e.target.value)}
                className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer p-0"
              />
              <span className="text-[11px] font-mono-tabular pos-muted">
                {form.customThemeColor.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Menu Catalog Management */}
      <section className="pos-card rounded-3xl border shadow-[0_8px_28px_rgba(15,23,42,0.06)] p-6 space-y-4">
        <h2 className="text-lg font-bold pos-ink">จัดการเมนูสินค้า ({menuItems.length})</h2>

        <form onSubmit={handleAddMenuItem} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          <input
            type="text"
            aria-label="ชื่อสินค้าใหม่"
            placeholder="ชื่อเมนูใหม่"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            className="sm:col-span-3 px-3 py-2 rounded-xl border pos-input text-xs"
          />
          <input
            type="text"
            aria-label="หมวดหมู่สินค้าใหม่"
            placeholder="หมวดหมู่"
            value={newItemCategory}
            onChange={(e) => setNewItemCategory(e.target.value)}
            className="sm:col-span-2 px-3 py-2 rounded-xl border pos-input text-xs"
          />
          <input
            type="number"
            aria-label="ราคาสินค้าใหม่"
            placeholder="ราคา (฿)"
            min={1}
            value={newItemPrice}
            onChange={(e) => setNewItemPrice(e.target.value)}
            className="sm:col-span-2 px-3 py-2 rounded-xl border pos-input text-xs font-mono-tabular"
          />
          <input
            type="text"
            aria-label="ลิงก์รูปสินค้าใหม่"
            placeholder="URL รูปภาพ (ถ้ามี)"
            value={newItemImage}
            onChange={(e) => setNewItemImage(e.target.value)}
            className="sm:col-span-3 px-3 py-2 rounded-xl border pos-input text-xs"
          />
          <button
            type="submit"
            className="sm:col-span-2 flex items-center justify-center gap-1 py-2 px-3 rounded-xl pos-btn-primary text-xs font-semibold cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มเมนู</span>
          </button>
        </form>

        <div className="divide-y pos-border">
          {menuItems.map((item) => (
            <div key={item.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
              <div className="min-w-0 flex-1">
                <span className="font-semibold pos-ink">{item.name}</span>
                <span className="pos-muted ml-2">· {item.category}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="font-mono-tabular font-bold pos-accent-text">
                  ฿{item.price.toLocaleString('th-TH')}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateMenu(
                      menuItems.map((m) =>
                        m.id === item.id ? { ...m, inStock: !m.inStock } : m
                      )
                    )
                  }
                  className={`px-2.5 py-1 rounded-lg font-semibold cursor-pointer ${
                    item.inStock
                      ? 'bg-[#eafaf2] text-[#1c8a5b]'
                      : 'bg-[#fff1f2] text-[#be123c]'
                  }`}
                >
                  {item.inStock ? 'พร้อมขาย' : 'หมดชั่วคราว'}
                </button>
                <button
                  type="button"
                  aria-label={`ลบเมนู ${item.name}`}
                  onClick={() => onUpdateMenu(menuItems.filter((m) => m.id !== item.id))}
                  className="p-1.5 rounded-lg text-[#e14b6a] hover:bg-[#fff1f2]/20 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Manage Users (Synced with Google Sheets "Users" Tab) */}
      <section className="pos-card rounded-3xl border shadow-[0_8px_28px_rgba(15,23,42,0.06)] p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <UserPlus className="w-5 h-5 pos-accent-text" />
            <div>
              <h2 className="text-lg font-bold pos-ink">
                จัดการผู้ใช้งาน (Manage Users · Google Sheets)
              </h2>
              <p className="text-xs pos-muted">
                {activeGasUrl
                  ? 'เชื่อมต่อกับชีต Users โดยตรง · เพิ่ม แก้ไขรหัสผ่าน และลบผู้ใช้ได้ทันที'
                  : 'โหมดในเครื่อง · เมื่อกรอก GAS URL ด้านบน ระบบจะซิงค์บัญชีทั้งหมดขึ้นชีต Users อัตโนมัติ'}
              </p>
            </div>
          </div>

          {activeGasUrl && (
            <button
              type="button"
              disabled={usersLoading}
              onClick={() => loadRemoteUsers(activeGasUrl, localUsers)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl pos-btn-secondary border text-xs font-semibold cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${usersLoading ? 'animate-spin' : ''}`} />
              <span>{usersLoading ? 'กำลังซิงค์...' : 'รีเฟรชจากชีต Users'}</span>
            </button>
          )}
        </div>

        {userSyncMessage && (
          <div className="rounded-xl bg-[#eafaf2] border border-[#bcead5] px-3.5 py-2 text-xs text-[#1c8a5b]">
            {userSyncMessage}
          </div>
        )}

        {userSyncError && (
          <div role="alert" className="rounded-xl bg-[#fff1f2] border border-[#fecdd3] px-3.5 py-2 text-xs text-[#be123c]">
            {userSyncError}
          </div>
        )}

        {/* Add New User Form */}
        <form onSubmit={handleAddUser} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          <input
            type="text"
            aria-label="Username ใหม่"
            placeholder="Username"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            className="sm:col-span-2 px-3 py-2 rounded-xl border pos-input text-xs"
          />
          <input
            type="text"
            aria-label="Password ใหม่"
            placeholder="Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="sm:col-span-2 px-3 py-2 rounded-xl border pos-input text-xs font-mono-tabular"
          />
          <input
            type="text"
            aria-label="ชื่อแสดงพนักงาน"
            placeholder="ชื่อที่แสดง"
            value={newFullName}
            onChange={(e) => setNewFullName(e.target.value)}
            className="sm:col-span-2 px-3 py-2 rounded-xl border pos-input text-xs"
          />
          <select
            aria-label="บทบาท"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as UserRole)}
            className="sm:col-span-2 px-2.5 py-2 rounded-xl border pos-input text-xs"
          >
            <option value="staff">staff</option>
            <option value="admin">admin</option>
          </select>
          <select
            aria-label="สถานะ"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value as 'active' | 'inactive')}
            className="sm:col-span-2 px-2.5 py-2 rounded-xl border pos-input text-xs"
          >
            <option value="active">active</option>
            <option value="inactive">inactive</option>
          </select>
          <button
            type="submit"
            disabled={userActionBusy}
            className="sm:col-span-2 py-2 px-3 rounded-xl pos-btn-primary disabled:opacity-60 text-xs font-semibold cursor-pointer"
          >
            เพิ่มผู้ใช้
          </button>
        </form>

        {/* Users List */}
        {localUsers.length === 0 ? (
          <div className="py-8 text-center text-xs pos-muted pos-surface-soft rounded-2xl border border-dashed">
            ยังไม่มีบัญชีผู้ใช้งาน
          </div>
        ) : (
          <div className="divide-y pos-border">
            {localUsers.map((u) => {
              const isEditing = editingUsername === u.username;
              const isRevealed = Boolean(revealedPasswords[u.username]);

              if (isEditing) {
                return (
                  <div
                    key={u.username}
                    className="py-3 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center pos-surface-soft px-3 rounded-2xl my-1"
                  >
                    <div className="sm:col-span-2 text-xs font-mono-tabular font-bold pos-ink">
                      {u.username}
                    </div>
                    <input
                      type="text"
                      aria-label={`แก้ไขรหัสผ่าน ${u.username}`}
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      placeholder="รหัสผ่านใหม่"
                      className="sm:col-span-2 px-2.5 py-1.5 rounded-lg border pos-input text-xs font-mono-tabular"
                    />
                    <input
                      type="text"
                      aria-label={`แก้ไขชื่อ ${u.username}`}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="ชื่อที่แสดง"
                      className="sm:col-span-2 px-2.5 py-1.5 rounded-lg border pos-input text-xs"
                    />
                    <select
                      aria-label={`แก้ไขบทบาท ${u.username}`}
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value as UserRole)}
                      className="sm:col-span-2 px-2 py-1.5 rounded-lg border pos-input text-xs"
                    >
                      <option value="staff">staff</option>
                      <option value="admin">admin</option>
                    </select>
                    <select
                      aria-label={`แก้ไขสถานะ ${u.username}`}
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as 'active' | 'inactive')}
                      className="sm:col-span-2 px-2 py-1.5 rounded-lg border pos-input text-xs"
                    >
                      <option value="active">active</option>
                      <option value="inactive">inactive</option>
                    </select>
                    <div className="sm:col-span-2 flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        disabled={userActionBusy}
                        onClick={() => handleSaveEditedUser(u.username)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg pos-btn-primary text-xs font-semibold cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>บันทึก</span>
                      </button>
                      <button
                        type="button"
                        aria-label={`ยกเลิกแก้ไข ${u.username}`}
                        onClick={() => setEditingUsername(null)}
                        className="p-1.5 rounded-lg border pos-surface-soft pos-muted hover:opacity-80 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={u.username}
                  className="py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold pos-ink">{u.name}</span>
                    <span className="pos-muted font-mono-tabular ml-2">
                      ({u.username} · {u.role})
                    </span>
                    <span className="pos-muted font-mono-tabular ml-3 inline-flex items-center gap-1">
                      <span>รหัส: {isRevealed ? u.password : '••••••'}</span>
                      <button
                        type="button"
                        aria-label={
                          isRevealed ? `ซ่อนรหัสผ่าน ${u.username}` : `ดูรหัสผ่าน ${u.username}`
                        }
                        onClick={() =>
                          setRevealedPasswords((prev) => ({
                            ...prev,
                            [u.username]: !prev[u.username],
                          }))
                        }
                        className="pos-muted hover:opacity-80 p-0.5 cursor-pointer"
                      >
                        {isRevealed ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={userActionBusy}
                      onClick={() => handleToggleUserStatus(u)}
                      className={`px-2.5 py-1 rounded-lg font-semibold cursor-pointer ${
                        u.status === 'active'
                          ? 'bg-[#eafaf2] text-[#1c8a5b]'
                          : 'bg-[#f1f5f9] text-[#64748b]'
                      }`}
                    >
                      {u.status}
                    </button>

                    <button
                      type="button"
                      aria-label={`แก้ไขผู้ใช้ ${u.username}`}
                      onClick={() => startEditUser(u)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg pos-btn-secondary border font-semibold cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>แก้ไข</span>
                    </button>

                    <button
                      type="button"
                      aria-label={`ลบผู้ใช้ ${u.username}`}
                      disabled={
                        userActionBusy ||
                        u.username.toLowerCase() === currentUser.username.toLowerCase()
                      }
                      onClick={() => handleDeleteUser(u)}
                      className="p-1.5 rounded-lg text-[#e14b6a] hover:bg-[#fff1f2]/20 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
};
