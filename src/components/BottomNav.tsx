'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNav() {
  const pathname = usePathname();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  // Daftar menu utama yang selalu nampak di bottom bar (maksimal 4 agar tidak sesak)
  const mainNavs = [
    { href: '/', label: 'Home', icon: '🏠' },
    { href: '/settings', label: 'Settings', icon: '⚙️' },
    { href: '/rekap', label: 'Rekap', icon: '📈' },
    { href: '/quest', label: 'Quest', icon: '🎮' },
    
  ];

  // Daftar menu tambahan / ekspansi (untuk menampung menu ke-5 sampai ke-8 atau seterusnya di masa depan)
  const extendedNavs = [
    { href: '/settings', label: 'Hari Sekolah & Libur', icon: '🏫', desc: 'Atur 5/6 hari & kalender libur' },
    // Contoh slot menu masa depan (bisa ditambah nanti)
    // { href: '/profile', label: 'Profil Guru', icon: '👩‍🏫', desc: 'Informasi akun & sekolah' },
    // { href: '/reports', label: 'Cetak Laporan', icon: '🖨️', desc: 'Export PDF / Excel rekap' },
    // { href: '/help', label: 'Bantuan', icon: '❓', desc: 'Panduan penggunaan aplikasi' },
  ];

  return (
    <>
      {/* Backdrop hitam transparan jika Bottom Sheet More terbuka */}
      {isMoreOpen && (
        <div 
          onClick={() => setIsMoreOpen(false)}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 max-w-md mx-auto transition-opacity"
        />
      )}

      {/* Bottom Sheet untuk Menu Tambahan (More Menu Pattern) */}
      <div className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl border-t border-slate-200 shadow-2xl z-50 max-w-md mx-auto transition-transform duration-300 ease-in-out ${
        isMoreOpen ? 'translate-y-0' : 'translate-y-full'
      }`}>
        <div className="p-4 space-y-3">
          {/* Header Bottom Sheet */}
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-base">✨</span>
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">Menu Tambahan & Pengaturan</h3>
            </div>
            <button 
              onClick={() => setIsMoreOpen(false)}
              className="text-slate-400 hover:text-slate-600 font-bold text-xs bg-slate-100 px-2 py-1 rounded-lg"
            >
              Tutup ✕
            </button>
          </div>

          {/* Grid Menu Ekstra (Bisa menampung banyak menu ke bawah / scrollable jika lebih dari 6) */}
          <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pb-2">
            {extendedNavs.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMoreOpen(false)}
                  className={`p-2.5 rounded-xl border text-left transition flex items-start gap-2.5 ${
                    isActive 
                      ? 'bg-blue-50 border-blue-200 text-blue-700' 
                      : 'bg-slate-50 border-slate-100 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <div>
                    <p className="font-bold text-xs leading-tight">{item.label}</p>
                    <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{item.desc}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Nav Utama */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around py-2 px-3 shadow-lg z-30 max-w-md mx-auto">
        {mainNavs.map((nav) => {
          const isActive = pathname === nav.href;
          return (
            <Link
              key={nav.href}
              href={nav.href}
              className={`flex flex-col items-center text-[10px] font-medium transition ${
                isActive ? 'text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <span className="text-base">{nav.icon}</span>
              <span>{nav.label}</span>
            </Link>
          );
        })}

        {/* Tombol More (Titik Tiga / Menu Ekstra) */}
        <button
          onClick={() => setIsMoreOpen(!isMoreOpen)}
          className={`flex flex-col items-center text-[10px] font-medium transition ${
            isMoreOpen ? 'text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <span className="text-base">📂</span>
          <span>More</span>
        </button>
      </nav>
    </>
  );
}