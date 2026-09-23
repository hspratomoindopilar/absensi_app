'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNav() {
  const pathname = usePathname();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const mainNavs = [
    { href: '/dashboard', label: 'Home', icon: '🏠' },
    { href: '/admin/settings/schoolsetting', label: 'Settings', icon: '⚙️' },
    { href: '/teacher/rekap', label: 'Rekap', icon: '📈' },
    { href: '/teacher/game-builder', label: 'Builder', icon: '🛠️' },
  ];

  const extendedNavs = [
    { href: '/teacher/settings', label: 'Hari Sekolah & Libur', icon: '🏫', desc: 'Atur 5/6 hari & kalender libur' },
  ];

  return (
    <>
      {/* Backdrop hitam transparan */}
      {isMoreOpen && (
        <div 
          onClick={() => setIsMoreOpen(false)}
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-40 max-w-md mx-auto transition-opacity"
        />
      )}

      {/* Bottom Sheet untuk Menu Tambahan */}
      <div 
        className={`fixed bottom-0 left-0 right-0 backdrop-blur-md rounded-t-3xl border-t shadow-2xl z-50 max-w-md mx-auto transition-transform duration-300 ease-in-out ${
          isMoreOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ 
          backgroundColor: 'var(--bg-card)', 
          borderColor: 'var(--border-theme)',
          color: 'var(--text-main)'
        }}
      >
        <div className="p-4 space-y-3">
          <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: 'var(--border-theme)' }}>
            <div className="flex items-center gap-2">
              <span className="text-base">✨</span>
              <h3 className="font-bold text-xs uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>Menu Tambahan & Pengaturan</h3>
            </div>
            <button 
              onClick={() => setIsMoreOpen(false)}
              className="font-bold text-xs px-2.5 py-1 rounded-xl transition cursor-pointer"
              style={{ backgroundColor: 'var(--bg-card-hover)', color: 'var(--text-main)' }}
            >
              Tutup ✕
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pb-2">
            {extendedNavs.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMoreOpen(false)}
                  className={`p-2.5 rounded-2xl border text-left transition flex items-start gap-2.5 ${
                    isActive ? 'shadow-inner' : ''
                  }`}
                  style={{
                    backgroundColor: isActive ? 'var(--accent-btn)' : 'var(--bg-card-hover)',
                    borderColor: 'var(--border-theme)',
                    color: isActive ? '#ffffff' : 'var(--text-main)'
                  }}
                >
                  <span className="text-xl">{item.icon}</span>
                  <div>
                    <p className="font-bold text-xs leading-tight">{item.label}</p>
                    <p className="text-[10px] leading-tight mt-0.5" style={{ color: isActive ? '#f1f5f9' : 'var(--text-muted)' }}>{item.desc}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Nav Utama (Menyatu dengan Tema Halaman) */}
      <div className="fixed bottom-0 left-3 right-3 max-w-md mx-auto z-30">
        <nav 
          className="backdrop-blur-md border rounded-2xl flex justify-around py-1 px-2 shadow-xl transition-colors duration-300"
          style={{ 
            backgroundColor: 'var(--bg-header)', 
            borderColor: 'var(--border-theme)' 
          }}
        >
          {mainNavs.map((nav) => {
            const isActive = pathname === nav.href;
            return (
              <Link
                key={nav.href}
                href={nav.href}
                className={`flex flex-col items-center text-[10px] transition-all px-3 py-1 rounded-xl ${
                  isActive ? 'scale-105 shadow-inner border' : 'hover:opacity-100 opacity-80'
                }`}
                style={{
                  backgroundColor: isActive ? 'var(--accent-btn)' : 'transparent',
                  borderColor: isActive ? 'var(--border-theme)' : 'transparent',
                  color: isActive ? '#ffffff' : '#ffffff'
                }}
              >
                <span className="text-base">{nav.icon}</span>
                <span>{nav.label}</span>
              </Link>
            );
          })}

          <button
            onClick={() => setIsMoreOpen(!isMoreOpen)}
            className={`flex flex-col items-center text-[10px] transition-all px-3 py-1 rounded-xl cursor-pointer ${
              isMoreOpen ? 'scale-105 shadow-inner border' : 'hover:opacity-100 opacity-80'
            }`}
            style={{
              backgroundColor: isMoreOpen ? 'var(--accent-btn)' : 'transparent',
              borderColor: isMoreOpen ? 'var(--border-theme)' : 'transparent',
              color: '#ffffff'
            }}
          >
            <span className="text-base">📂</span>
            <span>More</span>
          </button>
        </nav>
      </div>
    </>
  );
}