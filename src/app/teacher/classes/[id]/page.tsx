// src/app/teacher/classes/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { fetchClassAttendanceSummary } from '@/services/attendanceService';
import { fetchTenantSettings, fetchSchoolHolidays } from '@/services/settingsService';
import BottomNav from '@/components/BottomNav';
import '@/style/admin-theme.css';

export default function DetailClassPage() {
  const params = useParams();
  const classId = params.id as string;
  const router = useRouter();

  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [loading, setLoading] = useState(true);
  
  // State untuk menyimpan nama kelas asli
  const [className, setClassName] = useState('...');

  // State untuk rekap absensi dinamis
  const [attendanceSummary, setAttendanceSummary] = useState({
    hadir: 0,
    sakit: 0,
    izin: 0,
    alpa: 0,
    total: 0,
  });

  // State untuk status hari libur
  const [dayStatus, setDayStatus] = useState<{
    isHoliday: boolean;
    holidayName: string;
  }>({
    isHoliday: false,
    holidayName: '',
  });

  // Ambil tema global dari localStorage saat pertama load
  useEffect(() => {
    const savedTheme = (localStorage.getItem('admin_active_theme') as 'light' | 'dark') || 'light';
    setTheme(savedTheme);
  }, []);

  // Ambil data kelas, rekap absensi, & status hari libur
  useEffect(() => {
    async function loadClassData() {
      try {
        setLoading(true);
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session || !session.user.email) {
          router.replace('/login');
          return;
        }

        // 1. Ambil tenant_id guru yang sedang login
        const { data: userData } = await supabase
          .from('users')
          .select('tenant_id')
          .eq('email', session.user.email)
          .single();

        if (!userData) return;

        // 2. Ambil nama kelas (class_name) dari tabel classes berdasarkan classId
        const { data: classData } = await supabase
          .from('classes')
          .select('class_name')
          .eq('class_id', classId)
          .single();

        if (classData) {
          setClassName(classData.class_name);
        }

        // 3. Ambil tanggal hari ini (Format: YYYY-MM-DD)
        const today = new Date().toISOString().split('T')[0];
        const dateObj = new Date(today);
        const dayOfWeek = dateObj.getDay();
        const isSunday = dayOfWeek === 0;

        // Ambil pengaturan sekolah (misal: apakah hari Sabtu libur)
        const settings = await fetchTenantSettings(userData.tenant_id);
        const isSaturdayOff = dayOfWeek === 6 && settings.school_days === 5;

        // Cek daftar hari libur dari database
        const holidays = await fetchSchoolHolidays(userData.tenant_id);
        const matchedHoliday = holidays.find(
          (h) => today >= h.start_date && today <= h.end_date
        );

        const isHoliday = !!matchedHoliday || isSunday || isSaturdayOff;
        let holidayName = matchedHoliday ? matchedHoliday.description : '';
        if (isSunday) holidayName = 'Hari Minggu (Libur)';
        if (isSaturdayOff) holidayName = 'Libur Akhir Pekan';

        setDayStatus({
          isHoliday,
          holidayName,
        });

        // 4. Jika bukan hari libur, tarik rekap absensi dari service
        if (!isHoliday) {
          const summary = await fetchClassAttendanceSummary(userData.tenant_id, classId, today);
          setAttendanceSummary(summary);
        }
      } catch (err) {
        console.error('Gagal memuat data kelas:', err);
      } finally {
        setLoading(false);
      }
    }

    if (classId) {
      loadClassData();
    }
  }, [classId, router]);

  const handleSwitchTheme = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    localStorage.setItem('admin_active_theme', newTheme);
  };

  return (
    <div 
      className="admin-theme-root min-h-screen font-sans flex flex-col justify-between pb-28 transition-colors duration-300"
      data-theme={theme}
      style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}
    >
      <div className="max-w-md w-full mx-auto p-4 space-y-4">
        
        {/* TOMBOL SWITCHER THEME */}
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

        {/* 1. HEADER KELAS */}
        <div 
          className="backdrop-blur-md rounded-2xl p-5 shadow-lg border text-center space-y-1.5 transition-colors duration-300 relative"
          style={{ backgroundColor: 'var(--bg-header)', borderColor: 'var(--border-theme)' }}
        >
          {/* Tanda Hardcode untuk Wali Kelas */}
          <span className="absolute top-2 right-2 text-[8px] bg-rose-500/80 text-white font-extrabold px-1.5 py-0.5 rounded shadow">
            ⚠️ HARDCODE: WALI KELAS
          </span>

          <h1 className="text-lg font-black tracking-wider text-white uppercase">
            {className}
          </h1>
          <p className="text-xs text-white/90 font-medium">
            Wali kelas : <span className="font-bold">Drs Budiono xaverius</span>
          </p>
        </div>

        {/* 2. QUICK MENU IKON (Daftar Siswa, Daftar Guru, Absensi) */}
        <div className="grid grid-cols-3 gap-3">
         {/* Menu: Daftar Siswa (Belum Ada Fiturnya) */}
          <button 
            onClick={() => alert('Fitur Daftar Siswa belum dibuat / dihubungkan')}
            className="p-3 rounded-2xl border shadow-md flex flex-col items-center text-center gap-2 transition hover:scale-[1.02] cursor-pointer relative overflow-hidden"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)' }}
          >
            <span className="absolute -right-6 top-2 bg-amber-500 text-black text-[7px] font-black px-6 py-0.5 rotate-45 shadow">
              BELUM ADA
            </span>
            <div className="w-12 h-12 rounded-xl bg-blue-600/10 flex items-center justify-center p-2 shadow-inner">
              <img src="/icon/students.png" alt="Daftar Siswa" className="w-full h-full object-contain" />
            </div>
            <span className="text-[11px] font-extrabold uppercase leading-tight" style={{ color: 'var(--text-main)' }}>Daftar siswa</span>
          </button>

          {/* Menu: Daftar Guru (Belum Ada Fiturnya) */}
          <button 
            onClick={() => alert('Fitur Daftar Guru Pengampu Kelas belum dibuat')}
            className="p-3 rounded-2xl border shadow-md flex flex-col items-center text-center gap-2 transition hover:scale-[1.02] cursor-pointer relative overflow-hidden"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)' }}
          >
            <span className="absolute -right-6 top-2 bg-amber-500 text-black text-[7px] font-black px-6 py-0.5 rotate-45 shadow">
              BELUM ADA
            </span>
            <div className="w-12 h-12 rounded-xl bg-blue-600/10 flex items-center justify-center p-2 shadow-inner">
              <img src="/icon/teacher.png" alt="Daftar Guru" className="w-full h-full object-contain" />
            </div>
            <span className="text-[11px] font-extrabold uppercase leading-tight" style={{ color: 'var(--text-main)' }}>Daftar Guru</span>
          </button>

          {/* Menu: Absensi (Sudah Terhubung) */}
          <button 
            onClick={() => router.push(`/teacher/classes/${classId}/attendance`)}
            className="p-3 rounded-2xl border shadow-md flex flex-col items-center text-center gap-2 transition hover:scale-[1.02] cursor-pointer"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)' }}
          >
            <div className="w-12 h-12 rounded-xl bg-blue-600/10 flex items-center justify-center p-2 shadow-inner">
              <img src="/icon/classroom.png" alt="Absensi" className="w-full h-full object-contain" />
            </div>
            <span className="text-[11px] font-extrabold uppercase leading-tight" style={{ color: 'var(--text-main)' }}>Absensi</span>
          </button>
        </div>

        {/* 3. BAGIAN HIGHLIGHT (Rekap Absensi & Jadwal Kelas) */}
        <div className="space-y-3 pt-2">
          
          {/* Card Highlight 1: Rekap Absensi / Status Hari Libur (Sudah Terhubung) */}
          <div 
            className="p-4 rounded-2xl border shadow-md space-y-2 transition-colors"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)' }}
          >
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Rekap Absensi (Hari Ini)</h3>
              <span className={`text-[10px] font-bold ${dayStatus.isHoliday ? 'text-amber-500' : 'text-emerald-500'}`}>
                {dayStatus.isHoliday ? '🏖️ Hari Libur' : '🟢 Live Update'}
              </span>
            </div>

            {dayStatus.isHoliday ? (
              <div className="p-3 rounded-xl border bg-amber-500/10 border-amber-500/20 text-center space-y-1">
                <p className="text-xs font-bold text-amber-500">Absensi Ditiadakan Hari Ini</p>
                <p className="text-[10px] opacity-80">{dayStatus.holidayName}</p>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100 flex justify-around text-center">
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Hadir</p>
                  <p className="text-sm font-black text-emerald-600">
                    {loading ? '...' : attendanceSummary.hadir}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Sakit</p>
                  <p className="text-sm font-black text-amber-500">
                    {loading ? '...' : attendanceSummary.sakit}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Izin</p>
                  <p className="text-sm font-black text-sky-500">
                    {loading ? '...' : attendanceSummary.izin}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Alpa</p>
                  <p className="text-sm font-black text-rose-500">
                    {loading ? '...' : attendanceSummary.alpa}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Card Highlight 2: Jadwal Kelas */}
          <div 
            className="p-4 rounded-2xl border shadow-md space-y-2 transition-colors relative"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)' }}
          >
            {/* Tanda Hardcode untuk Jadwal Kelas */}
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Jadwal Kelas Hari Ini</h3>
              <span className="text-[9px] bg-rose-500/20 text-rose-500 font-extrabold px-2 py-0.5 rounded">
                ⚠️ HARDCODE: JADWAL
              </span>
            </div>

            <div className="space-y-2">
              <div className="p-2.5 rounded-xl border border-slate-100 bg-slate-50 flex justify-between items-center text-xs">
                <div>
                  <p className="font-bold text-slate-700">07:30 - 09:00 | Matematika</p>
                  <p className="text-[10px] text-slate-400">Pengajar: Drs Budiono xaverius</p>
                </div>
                <span className="text-[9px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-bold">Selesai</span>
              </div>

              <div className="p-2.5 rounded-xl border border-blue-200 bg-blue-50/60 flex justify-between items-center text-xs shadow-sm">
                <div>
                  <p className="font-bold text-blue-900">09:15 - 10:45 | Bahasa Indonesia</p>
                  <p className="text-[10px] text-blue-600">Pengajar: Siti Maemunah, S.Pd</p>
                </div>
                <span className="text-[9px] bg-blue-600 text-white px-2 py-0.5 rounded font-bold animate-pulse">Berlangsung</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* BOTTOM NAV */}
      <BottomNav />
    </div>
  );
}