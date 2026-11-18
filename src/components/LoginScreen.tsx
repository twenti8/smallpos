import React, { useState } from 'react';
import { Eye, EyeOff, Lock, LogIn, User } from 'lucide-react';
import type { ShopSettings } from '../types/pos';
import { normalizeDriveImageUrl } from '../utils/posLogic';

interface LoginScreenProps {
  settings: ShopSettings;
  hasRemoteBackend: boolean;
  onLogin: (username: string, password: string) => Promise<void>;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  settings,
  hasRemoteBackend,
  onLogin,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  const logoSrc = normalizeDriveImageUrl(settings.logoUrl);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('กรุณากรอกชื่อผู้ใช้และรหัสผ่านให้ครบถ้วน');
      return;
    }

    setSubmitting(true);
    try {
      await onLogin(username.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เข้าสู่ระบบไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10 pos-canvas">
      <div className="w-full max-w-md pos-card rounded-3xl border shadow-[0_14px_40px_rgba(15,23,42,0.12)] p-8">
        <div className="flex flex-col items-center text-center mb-7">
          <div className="w-20 h-20 rounded-2xl pos-surface-soft border overflow-hidden flex items-center justify-center mb-4">
            {logoSrc && !logoFailed ? (
              <img
                src={logoSrc}
                alt={settings.shopName}
                referrerPolicy="no-referrer"
                onError={() => setLogoFailed(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-2xl font-bold pos-accent-text">
                {settings.shopName.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>

          <h1 className="text-2xl font-bold pos-ink tracking-tight">
            {settings.shopName}
          </h1>
          <p className="text-sm pos-muted mt-1">
            เข้าสู่ระบบขายหน้าร้าน (POS)
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label
              htmlFor="login-username"
              className="block text-sm font-semibold pos-ink mb-1.5"
            >
              ชื่อผู้ใช้ หรือ อีเมล
            </label>
            <div className="relative">
              <User className="w-4 h-4 pos-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="login-username"
                name="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="กรอกชื่อผู้ใช้"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border pos-input focus:outline-none focus:ring-2 focus:ring-[var(--pos-accent)]/40 transition-colors"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="block text-sm font-semibold pos-ink mb-1.5"
            >
              รหัสผ่าน
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 pos-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="กรอกรหัสผ่าน"
                className="w-full pl-10 pr-11 py-2.5 rounded-xl border pos-input focus:outline-none focus:ring-2 focus:ring-[var(--pos-accent)]/40 transition-colors"
              />
              <button
                type="button"
                aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 pos-muted hover:opacity-80 p-1 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl bg-[#fff1f2] border border-[#fecdd3] px-3.5 py-2.5 text-sm text-[#be123c]"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl pos-btn-primary disabled:opacity-60 font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>{submitting ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}</span>
          </button>
        </form>

        {!hasRemoteBackend && (
          <p className="mt-5 pt-4 border-t pos-border text-xs text-center pos-muted">
            บัญชีเริ่มต้น: <span className="font-mono-tabular font-semibold pos-accent-text">admin / admin123</span>
            {' · '}
            <span className="font-mono-tabular font-semibold pos-accent-text">staff / staff123</span>
          </p>
        )}
      </div>
    </main>
  );
};
