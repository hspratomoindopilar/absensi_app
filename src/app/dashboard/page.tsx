//NEW DASHBOARD 17/9/26

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';
import '@/style/admin-theme.css'; // <-- Import CSS Tema Admin

export default function TeacherDashboard() {
  const [loading, setLoading] = useState(true);

  const [profile, setProfile] = useState({
    name: 'Loading...',
    email: 'Loading...',
    nip: 'Memuat NIP...',
    avatarUrl: '/icon/photo_id.png',
    tenantName: 'Memuat Sekolah...',
    role: 'Memuat Role...',
  });

  const [isRoleOpen, setIsRoleOpen] = useState(false);
  
  const router = useRouter();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const savedTheme = (localStorage.getItem('admin_active_theme') as 'light' | 'dark') || 'light';
    setTheme(savedTheme);
    async function loadUserData() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session || !session.user.email) {
          router.replace('/login');
          return;
        }

        // Ambil data user beserta nama sekolah (tenant) dari database
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select(`
            full_name,
            email,
            nip,
            avatar_url,
            role,
            tenants ( school_name )
          `)
          .eq('email', session.user.email)
          .single();

        if (userError || !userData) {
            console.error('Gagal memuat detail user:', userError);
            return;
        }

        const tenantData = Array.isArray(userData.tenants) ? userData.tenants[0] : userData.tenants;

        setProfile({
          name: userData.full_name || 'Tanpa Nama',
          email: userData.email,
          nip: userData.nip ? `NIP: ${userData.nip}` : 'NIP Tidak Tersedia',
          avatarUrl: userData.avatar_url || '/icon/photo_id.png',
          tenantName: tenantData?.school_name || 'Sekolah Tidak Diketahui',
          role: userData.role || 'Role Tidak Diketahui'
        });

      } catch (err) {
        console.error('Gagal memuat profil:', err);
      } finally {
        setLoading(false);
      }
    }

    loadUserData();
  }, [router]);

  const handleSwitchTheme = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    localStorage.setItem('admin_active_theme', newTheme);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-100 font-sans">
        <p className="text-xs font-bold text-blue-800 animate-pulse">Memuat Beranda Kelasyik...</p>
      </div>
    );
  }

  return (
    <div 
      className="admin-theme-root min-h-screen font-sans flex flex-col justify-between select-none transition-colors duration-300"
      data-theme={theme}
      style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}
    >
      
      {/* KONTEN UTAMA */}
      <div className="max-w-md w-full mx-auto p-4 space-y-4 pb-28">
        
       {/* TOMBOL SWITCHER THEME (LIGHT / DARK) */}
        <div className="flex justify-end">
          <button
            onClick={() => handleSwitchTheme(theme === 'light' ? 'dark' : 'light')}
            className="text-[11px] font-bold px-3 py-1.5 rounded-xl shadow border transition flex items-center gap-1.5 cursor-pointer"
            style={{ 
              backgroundColor: 'var(--bg-card)', 
              borderColor: 'var(--border-theme)',
              color: 'var(--text-main)'
            }}
          >
            <span>{theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}</span>
          </button>
        </div>

        {/* SECTION 1: HEADER PROFIL & MY ROLE */}
        <div 
          className="backdrop-blur-md rounded-2xl p-4 shadow-lg border space-y-3 relative transition-colors duration-300"
          style={{ backgroundColor: 'var(--bg-header)', borderColor: 'var(--border-theme)' }}
        >
          {/* Nama Sekolah (Tenant) di bagian paling atas */}
          <div className="absolute top-2 left-4 right-16 flex justify-start">
             <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-300 bg-emerald-900/30 px-2 py-0.5 rounded-md border border-emerald-500/20 truncate max-w-full">
                🏫 {profile.tenantName}
             </span>
          </div>

          <div className="flex items-center justify-between pt-5">
            <div className="flex items-center gap-3">
              <div className="relative w-16 h-16 rounded-xl overflow-hidden border-2 border-white/80 shadow-md bg-white shrink-0">
                <img 
                  src={profile.avatarUrl} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                  onError={(e)=>{(e.target as HTMLImageElement).src = '/icon/photo_id.png'}}
                />
              </div>

              <div className="space-y-0.5 text-white overflow-hidden">
                <div className="flex items-center gap-1.5">
                  <h1 className="font-bold text-sm tracking-tight leading-tight truncate">{profile.name}</h1>
                </div>
                <p className="text-[11px] opacity-90 truncate max-w-[160px]">{profile.email}</p>
                <div className="flex items-center gap-1.5 pt-0.5">
                  <span className="inline-block text-[10px] bg-black/20 px-2 py-0.5 rounded font-mono border border-white/20 truncate max-w-[150px]">
                    {profile.nip}
                  </span>
                </div>
              </div>
            </div>

            <button 
              onClick={handleLogout}
              title="Keluar Akun"
              className="w-12 h-12 rounded-2xl bg-cyan-400 hover:bg-cyan-300 flex items-center justify-center text-blue-950 shadow-md transition active:scale-95 cursor-pointer shrink-0 font-bold"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>

          {/* TOMBOL MY ROLE & DROPDOWN */}
          <div className="relative pt-2 border-t border-white/20 flex items-center justify-between">
            <div className="relative inline-block">
              <button
                onClick={() => setIsRoleOpen(!isRoleOpen)}
                className="bg-black/30 hover:bg-black/40 text-white text-[10px] font-bold px-3 py-1 rounded-lg shadow border border-white/20 flex items-center gap-1.5 transition cursor-pointer"
              >
                <span>My Role</span>
                <span className={`transition-transform duration-200 text-[9px] ${isRoleOpen ? 'rotate-90' : ''}`}>▶</span>
              </button>

              {isRoleOpen && (
                <div className="absolute left-full top-0 ml-2 w-48 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-50 text-slate-700 space-y-1">
                  <div className="px-3 py-1 border-b border-slate-100 text-[9px] uppercase font-bold text-slate-400 tracking-wider flex justify-between items-center">
                    <span>Daftar Peran Aktif:</span>
                  </div>
                    <div className="px-3 py-1.5 text-xs font-semibold flex items-center justify-between bg-blue-50/50 text-blue-900">
                      <span className="uppercase">{profile.role}</span>
                      <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">Aktif</span>
                    </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 2: MENU UTAMA */}
        <div className="space-y-3 pt-2">
          
          {/* Menu 1: Ruang Kelas */}
          <button
            onClick={() => router.push('/admin/classes/manage')}
            className="w-full active:scale-[0.99] transition-all p-1 rounded-2xl shadow-md border flex items-center justify-between group cursor-pointer"
            style={{ 
              backgroundColor: 'var(--bg-card)', 
              borderColor: 'var(--border-theme)' 
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full border-2 border-white/80 bg-blue-600/20 flex items-center justify-center p-2 shadow-inner overflow-hidden shrink-0">
                <img src="/icon/classroom.png" alt="Ruang Kelas" className="w-full h-full object-contain filter drop-shadow" />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm tracking-wide uppercase" style={{ color: 'var(--text-main)' }}>RUANG KELAS</span>
                <span className="bg-emerald-500/20 text-emerald-500 text-[9px] font-extrabold px-1.5 py-0.5 rounded border border-emerald-500/30">Connected</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full flex items-center justify-center mr-1 group-hover:translate-x-0.5 transition-transform" style={{ color: 'var(--text-muted)' }}>
              <span className="text-sm font-bold">❯</span>
            </div>
          </button>

          {/* Menu 2: User Management */}
          <button
            onClick={() => router.push('/admin/usermanagement')}
            className="w-full active:scale-[0.99] transition-all p-1 rounded-2xl shadow-md border flex items-center justify-between group cursor-pointer"
            style={{ 
              backgroundColor: 'var(--bg-card)', 
              borderColor: 'var(--border-theme)' 
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full border-2 border-white/80 bg-blue-600/20 flex items-center justify-center p-2 shadow-inner overflow-hidden shrink-0">
                <img src="/icon/user.png" alt="User Management" className="w-full h-full object-contain filter drop-shadow" />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm tracking-wide uppercase" style={{ color: 'var(--text-main)' }}>USER MANAGEMENT</span>
                <span className="bg-emerald-500/20 text-emerald-500 text-[9px] font-extrabold px-1.5 py-0.5 rounded border border-emerald-500/30">Connected</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full flex items-center justify-center mr-1 group-hover:translate-x-0.5 transition-transform" style={{ color: 'var(--text-muted)' }}>
              <span className="text-sm font-bold">❯</span>
            </div>
          </button>

          {/* Menu 3: Daftar Guru (Sudah Terhubung) */}
          <button
            onClick={() => router.push('/admin/settings/teachersetting')}
            className="w-full active:scale-[0.99] transition-all p-1 rounded-2xl shadow-md border flex items-center justify-between group cursor-pointer relative"
            style={{ 
              backgroundColor: 'var(--bg-card)', 
              borderColor: 'var(--border-theme)' 
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full border-2 border-white/80 bg-blue-600/20 flex items-center justify-center p-2 shadow-inner overflow-hidden shrink-0">
                <img src="/icon/teacher.png" alt="Daftar Guru" className="w-full h-full object-contain filter drop-shadow" />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm tracking-wide uppercase" style={{ color: 'var(--text-main)' }}>DAFTAR GURU</span>
                <span className="bg-emerald-500/20 text-emerald-500 text-[9px] font-extrabold px-1.5 py-0.5 rounded border border-emerald-500/30">Connected</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full flex items-center justify-center mr-1 group-hover:translate-x-0.5 transition-transform" style={{ color: 'var(--text-muted)' }}>
              <span className="text-sm font-bold">❯</span>
            </div>
          </button>

          {/* Menu 4: Daftar Siswa */}
          <button
            onClick={() => router.push('/admin/settings/studentsetting')}
            className="w-full active:scale-[0.99] transition-all p-1 rounded-2xl shadow-md border flex items-center justify-between group cursor-pointer"
            style={{ 
              backgroundColor: 'var(--bg-card)', 
              borderColor: 'var(--border-theme)' 
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full border-2 border-white/80 bg-blue-600/20 flex items-center justify-center p-2 shadow-inner overflow-hidden shrink-0">
                <img src="/icon/students.png" alt="Daftar Siswa" className="w-full h-full object-contain filter drop-shadow" />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm tracking-wide uppercase" style={{ color: 'var(--text-main)' }}>DAFTAR SISWA</span>
                <span className="bg-emerald-500/20 text-emerald-500 text-[9px] font-extrabold px-1.5 py-0.5 rounded border border-emerald-500/30">Connected</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full flex items-center justify-center mr-1 group-hover:translate-x-0.5 transition-transform" style={{ color: 'var(--text-muted)' }}>
              <span className="text-sm font-bold">❯</span>
            </div>
          </button>

          {/* Menu 5: [DLL ....] (Canvas) */}
          <button
            onClick={() => router.push('/teacher/canvas')}
            className="w-full active:scale-[0.99] transition-all p-1 rounded-2xl shadow-md border flex items-center justify-between group cursor-pointer"
            style={{ 
              backgroundColor: 'var(--bg-card)', 
              borderColor: 'var(--border-theme)' 
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full border-2 border-white/80 bg-blue-600/20 flex items-center justify-center p-2.5 shadow-inner overflow-hidden shrink-0">
                <img src="/icon/puzzleicon.png" alt="Canvas" className="w-full h-full object-contain filter drop-shadow" onError={(e)=>{(e.target as HTMLImageElement).src = '/icon/classroom.png'}} />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm tracking-wide uppercase" style={{ color: 'var(--text-main)' }}>[DLL ....] / Canvas</span>
                <span className="bg-amber-400 text-amber-950 text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow-sm">COMING SOON</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full flex items-center justify-center mr-1 group-hover:translate-x-0.5 transition-transform" style={{ color: 'var(--text-muted)' }}>
              <span className="text-sm font-bold">❯</span>
            </div>
          </button>

        </div>

      </div>

      {/* BOTTOM NAV */}
      <BottomNav />
    </div>
  );
}