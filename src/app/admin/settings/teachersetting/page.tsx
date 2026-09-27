// src/app/admin/settings/teachersetting/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { teacherService } from '@/services/teacherService';
import { supabase } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';
import '@/style/admin-theme.css'; // Wajib menggunakan tema admin

export default function TeacherSettingListPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Load theme & data guru
  useEffect(() => {
    const savedTheme = (localStorage.getItem('admin_active_theme') as 'light' | 'dark') || 'light';
    setTheme(savedTheme);

    async function loadData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || !session.user.email) {
          router.replace('/login');
          return;
        }

        // Ambil tenant_id user yang sedang login
        const { data: currentUser } = await supabase
          .from('users')
          .select('tenant_id')
          .eq('email', session.user.email)
          .single();

        if (currentUser && currentUser.tenant_id) {
          const list = await teacherService.getTeachers(currentUser.tenant_id);
          setTeachers(list || []);
        }
      } catch (err) {
        console.error('Gagal memuat daftar guru:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  const handleSwitchTheme = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    localStorage.setItem('admin_active_theme', newTheme);
  };

  // Filter pencarian berdasarkan nama atau NIP
  const filteredTeachers = teachers.filter((t) => 
    t.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.nip?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-100 font-sans">
        <p className="text-xs font-bold text-blue-800 animate-pulse">Memuat Data Daftar Guru...</p>
      </div>
    );
  }

  return (
    <div 
      className="admin-theme-root min-h-screen font-sans flex flex-col justify-between select-none transition-colors duration-300"
      data-theme={theme}
      style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}
    >
      <div className="max-w-md w-full mx-auto p-4 space-y-4 pb-28">
        
        {/* HEADER & THEME SWITCHER */}
        <div className="flex justify-between items-center">
          <button 
            onClick={() => router.push('/dashboard')}
            className="text-xs font-bold px-3 py-1.5 rounded-xl shadow border transition flex items-center gap-1 cursor-pointer"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)', color: 'var(--text-main)' }}
          >
            <span>❮ Kembali</span>
          </button>

          <button
            onClick={() => handleSwitchTheme(theme === 'light' ? 'dark' : 'light')}
            className="text-[11px] font-bold px-3 py-1.5 rounded-xl shadow border transition flex items-center gap-1.5 cursor-pointer"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)', color: 'var(--text-main)' }}
          >
            <span>{theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}</span>
          </button>
        </div>

        {/* TITLE CARD */}
        <div 
          className="backdrop-blur-md rounded-2xl p-4 shadow-lg border space-y-2 relative transition-colors duration-300"
          style={{ backgroundColor: 'var(--bg-header)', borderColor: 'var(--border-theme)' }}
        >
          {/* 🏷️ STICKER PENANDA MOCK / FITUR TAMBAHAN */}
          <div className="absolute top-3 right-3 z-10">
            <span className="bg-amber-400 text-amber-950 text-[9px] font-extrabold px-2 py-0.5 rounded shadow-md uppercase tracking-wider border border-amber-500">
              Live DB Connected
            </span>
          </div>

          <h1 className="font-extrabold text-white text-base tracking-wide uppercase pt-1">Daftar Guru & Admin</h1>
          <p className="text-xs text-white/80">Pilih guru untuk mengelola penugasan mapel & wali kelas.</p>

          {/* INPUT PENCARIAN */}
          <div className="pt-2">
            <input 
              type="text"
              placeholder="Cari nama atau NIP guru..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-white/20 text-white placeholder-white/70 border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
            />
          </div>
        </div>

        {/* LIST GURU */}
        <div className="space-y-2.5">
          {filteredTeachers.length === 0 ? (
            <div className="text-center py-8 text-xs opacity-70">
              Tidak ada data guru ditemukan.
            </div>
          ) : (
            filteredTeachers.map((teacher) => (
              <button
                key={teacher.user_id}
                onClick={() => router.push(`/admin/settings/teachersetting/${teacher.user_id}`)}
                className="w-full active:scale-[0.99] transition-all p-3 rounded-2xl shadow-md border flex items-center justify-between group cursor-pointer text-left"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl border-2 border-white/80 bg-blue-600/20 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                    <img 
                      src={teacher.avatar_url || '/icon/photo_id.png'} 
                      alt={teacher.full_name} 
                      className="w-full h-full object-cover"
                      onError={(e)=>{(e.target as HTMLImageElement).src = '/icon/teacher.png'}}
                    />
                  </div>
                  <div>
                    <h2 className="font-extrabold text-xs tracking-wide uppercase" style={{ color: 'var(--text-main)' }}>
                      {teacher.full_name}
                    </h2>
                    <p className="text-[10px] opacity-80 truncate max-w-[180px]" style={{ color: 'var(--text-muted)' }}>
                      {teacher.email || 'Tidak ada email'}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[9px] px-1.5 py-0.2 rounded font-mono bg-blue-500/10 text-blue-600 font-bold border border-blue-500/20">
                        NIP: {teacher.nip || '-'}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase bg-purple-500/10 text-purple-600 border border-purple-500/20">
                        {teacher.role}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="w-8 h-8 rounded-full flex items-center justify-center group-hover:translate-x-0.5 transition-transform" style={{ color: 'var(--text-muted)' }}>
                  <span className="text-sm font-bold">❯</span>
                </div>
              </button>
            ))
          )}
        </div>

      </div>
      {/* BOTTOM NAV */}
      <BottomNav />
      
    </div>
  );
}