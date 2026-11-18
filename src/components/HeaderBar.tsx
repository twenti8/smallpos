import React, { useState } from 'react';
import { BarChart3, LogOut, Settings, Store } from 'lucide-react';
import type { AppTab, AuthUser, ShopSettings } from '../types/pos';
import { canAccessTab, normalizeDriveImageUrl } from '../utils/posLogic';

interface HeaderBarProps {
  user: AuthUser;
  settings: ShopSettings;
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  onLogout: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  user,
  settings,
  activeTab,
  onSelectTab,
  onLogout,
}) => {
  const [logoFailed, setLogoFailed] = useState(false);
  const logoSrc = normalizeDriveImageUrl(settings.logoUrl);

  const navItems: { id: AppTab; label: string; icon: React.ReactNode }[] = [
    { id: 'pos', label: 'ขายสินค้า', icon: <Store className="w-4 h-4" /> },
    { id: 'summary', label: 'สรุปยอดขาย', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'settings', label: 'ตั้งค่าร้าน', icon: <Settings className="w-4 h-4" /> },
  ];

  const visibleNavItems = navItems.filter((item) => canAccessTab(user.role, item.id));

  return (
    <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 pt-5 pb-2">
      <div className="pos-card rounded-3xl border shadow-[0_8px_28px_rgba(15,23,42,0.08)] px-5 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl pos-surface-soft border overflow-hidden shrink-0 flex items-center justify-center">
            {logoSrc && !logoFailed ? (
              <img
                src={logoSrc}
                alt={settings.shopName}
                referrerPolicy="no-referrer"
                onError={() => setLogoFailed(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-sm font-bold pos-accent-text">
                {settings.shopName.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <span className="text-lg font-bold pos-ink whitespace-nowrap shrink-0">
            {settings.shopName}
          </span>
        </div>

        <nav
          aria-label="เมนูหลัก"
          className="flex items-center gap-1 pos-nav-shell p-1 rounded-2xl border max-w-full overflow-x-auto"
        >
          {visibleNavItems.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  active
                    ? 'pos-card pos-accent-text shadow-sm border'
                    : 'pos-muted hover:opacity-85'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-semibold pos-ink leading-tight">
              {user.name}
            </div>
            <div className="text-xs pos-muted">
              {user.role === 'admin' ? 'ผู้ดูแลระบบ' : 'พนักงานขาย'}
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border pos-btn-secondary text-sm font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </div>
    </header>
  );
};
