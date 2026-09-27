// src/components/TeacherBottomNav.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function TeacherBottomNav() {
  const pathname = usePathname();

  const navs = [
    { href: '/teacher/profile', label: 'Home', icon: '🏠' }, // Mengarah ke Beranda Guru
    { href: '/admin/classes/manage', label: 'Kelas', icon: '🏫' }, // Mengarah ke Manajemen Kelas
    { href: '/teacher/game-builder', label: 'Builder', icon: '🛠️' },
    { href: '/teacher/rekap', label: 'Rekap', icon: '📈' },
  ];

  return (
    <div className="fixed bottom-0 left-3 right-3 max-w-md mx-auto z-30 pb-3">
      <nav 
        className="backdrop-blur-md border rounded-2xl flex justify-around py-1 px-2 shadow-xl transition-colors duration-300"
        style={{ 
          backgroundColor: 'var(--bg-header)', 
          borderColor: 'var(--border-theme)' 
        }}
      >
        {navs.map((nav) => {
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
                color: '#ffffff'
              }}
            >
              <span className="text-base">{nav.icon}</span>
              <span>{nav.label}</span>
            </Link>
          );
        })}

        {/* Menu Canvas (Coming Soon) */}
        <button
          onClick={() => alert('Fitur Canvas akan segera hadir (Coming Soon)!')}
          className="flex flex-col items-center text-[10px] transition-all px-2 py-1 rounded-xl opacity-60 hover:opacity-100 cursor-pointer"
          style={{ color: '#ffffff' }}
        >
          <span className="text-base">🎨</span>
          <span>Canvas ⏳</span>
        </button>

        {/* Menu Raport (Coming Soon) */}
        <button
          onClick={() => alert('Fitur Buku Raport Digital akan segera hadir (Coming Soon)!')}
          className="flex flex-col items-center text-[10px] transition-all px-2 py-1 rounded-xl opacity-60 hover:opacity-100 cursor-pointer"
          style={{ color: '#ffffff' }}
        >
          <span className="text-base">📖</span>
          <span>Raport ⏳</span>
        </button>
      </nav>
    </div>
  );
}