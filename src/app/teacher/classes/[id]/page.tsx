// src/app/teacher/classes/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';
import TeacherBottomNav from '@/components/TeacherBottomNav'; // Import Bottom Nav khusus Teacher
import '@/style/admin-theme.css';

const DAYS_ORDER = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];

export default function ClassDashboardPage() {
  const params = useParams();
  const classId = params.id as string;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isUserTeacher, setIsUserTeacher] = useState(false); // State untuk mendeteksi role teacher

  // State Data
  const [classData, setClassData] = useState<any>(null);
  const [homeroomTeacher, setHomeroomTeacher] = useState<string>('Belum Diatur');
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  
  // State Hari
  const [actualTodayStr, setActualTodayStr] = useState(''); // Menyimpan hari ini secara real-time
  const [selectedDay, setSelectedDay] = useState(''); // Hari yang sedang dipilih untuk dilihat jadwalnya

  // State Modal
  const [activeModal, setActiveModal] = useState<'students' | 'teachers' | null>(null);

  useEffect(() => {
    const savedTheme = (localStorage.getItem('admin_active_theme') as 'light' | 'dark') || 'light';
    setTheme(savedTheme);

    // Dapatkan string hari ini
    const currentDay = DAYS_ORDER[new Date().getDay()];
    setActualTodayStr(currentDay);
    setSelectedDay(currentDay);

    async function loadClassDashboard() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user.email) {
          const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('email', session.user.email)
            .single();

          if (userData) {
            const roleLower = (userData.role || '').toLowerCase();
            const teacherCheck = roleLower.includes('teacher') || roleLower.includes('guru') || (!roleLower.includes('admin') && !roleLower.includes('general'));
            setIsUserTeacher(teacherCheck);
          }
        }

        const { data: clsData } = await supabase
          .from('classes')
          .select('*')
          .eq('class_id', classId)
          .single();

        setClassData(clsData);

        if (clsData?.homeroom_teacher_id) {
          const { data: hrData } = await supabase
            .from('users')
            .select('full_name')
            .eq('user_id', clsData.homeroom_teacher_id)
            .single();
          if (hrData) setHomeroomTeacher(hrData.full_name);
        }

        const { data: stdData } = await supabase
          .from('students')
          .select('student_id, full_name, nis')
          .eq('class_id', classId)
          .order('full_name');
        setStudents(stdData || []);

        const { data: tchData } = await supabase
          .from('teacher_classes')
          .select(`
                        id,
                        subject_name,
                        users ( full_name )
                    `)
          .eq('class_id', classId);
        setTeachers(tchData || []);

      } catch (error) {
        console.error("Gagal memuat dashboard kelas:", error);
      } finally {
        setLoading(false);
      }
    }

    if (classId) {
      loadClassDashboard();
    }
  }, [classId]);

  // Efek terpisah untuk memuat jadwal setiap kali selectedDay berubah
  useEffect(() => {
    async function loadScheduleForDay() {
      if (!selectedDay || !classId) return;
      try {
        const { data: schData } = await supabase
          .from('class_schedules')
          .select(`
                        schedule_id,
                        start_time,
                        end_time,
                        activity_name,
                        users ( full_name ),
                        subjects ( subject_name )
                    `)
          .eq('class_id', classId)
          .eq('day_of_week', selectedDay)
          .order('start_time');
        setSchedules(schData || []);
      } catch (err) {
        console.error("Gagal memuat jadwal:", err);
      }
    }
    
    loadScheduleForDay();
  }, [selectedDay, classId]);

  const handleSwitchTheme = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    localStorage.setItem('admin_active_theme', newTheme);
  };

  const getScheduleStatus = (startTime: string, endTime: string) => {
    // Jika yang dilihat BUKAN hari ini, tidak perlu menampilkan status
    if (selectedDay !== actualTodayStr) return null;

    const now = new Date();
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    const start = startTime.substring(0, 5);
    const end = endTime.substring(0, 5);

    if (currentTime < start) return { label: 'Akan Datang', color: 'bg-slate-100 text-slate-500' };
    if (currentTime >= start && currentTime <= end) return { label: 'Berlangsung', color: 'bg-blue-100 text-blue-700 animate-pulse' };
    return { label: 'Selesai', color: 'bg-emerald-100 text-emerald-700' };
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-blue-50 font-sans"><p className="text-xs font-bold text-blue-800 animate-pulse">Memuat Dashboard Kelas...</p></div>;
  }

  return (
    <div
      className="admin-theme-root min-h-screen font-sans flex flex-col justify-between select-none transition-colors duration-300 relative"
      data-theme={theme}
      style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}
    >
      <div className="max-w-md w-full mx-auto p-4 space-y-4 pb-28">

        {/* Switcher Theme & Back */}
        <div className="flex justify-between items-center">
          <button onClick={() => router.push('/admin/classes/manage')} className="text-xs font-bold px-3 py-1.5 rounded-xl shadow border transition cursor-pointer" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)', color: 'var(--text-main)' }}>
            ❮ Kembali
          </button>
          <button onClick={() => handleSwitchTheme(theme === 'light' ? 'dark' : 'light')} className="text-[11px] font-bold px-3 py-1.5 rounded-xl shadow border transition cursor-pointer" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)', color: 'var(--text-main)' }}>
            {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
          </button>
        </div>

        {/* HEADER KELAS */}
        <div className="rounded-2xl p-5 shadow-lg border text-center space-y-1 relative" style={{ backgroundColor: 'var(--bg-header)', borderColor: 'var(--border-theme)' }}>
          <h1 className="font-extrabold text-2xl tracking-widest text-white">{classData?.class_name || 'KELAS'}</h1>
          <p className="text-xs text-white/80 font-medium">Wali Kelas : <span className="font-bold text-emerald-300">{homeroomTeacher}</span></p>
        </div>

        {/* SHORTCUT MENU */}
        <div className="grid grid-cols-3 gap-3">
          <button onClick={() => setActiveModal('students')} className="flex flex-col items-center justify-center p-3 rounded-2xl shadow-md border hover:scale-95 transition-transform cursor-pointer" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)' }}>
            <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mb-2">
              <img src="/icon/students4.png" alt="Daftar Siswa" className="w-6 h-6 object-contain" />
            </div>
            <span className="text-[9px] font-extrabold uppercase tracking-wide">Daftar Siswa</span>
          </button>

          <button onClick={() => setActiveModal('teachers')} className="flex flex-col items-center justify-center p-3 rounded-2xl shadow-md border hover:scale-95 transition-transform cursor-pointer" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)' }}>
            <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mb-2">
              <img src="/icon/teacher2.png" alt="Daftar Guru" className="w-6 h-6 object-contain" />
            </div>
            <span className="text-[9px] font-extrabold uppercase tracking-wide">Daftar Guru</span>
          </button>

          <button onClick={() => router.push(`/teacher/classes/${classId}/attendance`)} className="flex flex-col items-center justify-center p-3 rounded-2xl shadow-md border hover:scale-95 transition-transform cursor-pointer" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)' }}>
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mb-2">
              <span className="text-xl">📋</span>
            </div>
            <span className="text-[9px] font-extrabold uppercase tracking-wide">Absensi</span>
          </button>
        </div>

        {/* REKAP ABSENSI */}
        <div className="rounded-2xl p-4 shadow-md border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)' }}>
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-extrabold text-[10px] uppercase tracking-wide text-slate-500">Rekap Absensi (Hari Ini)</h2>
            <span className="flex items-center gap-1 text-[8px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> Live Update
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center bg-black/5 dark:bg-white/5 rounded-xl p-2 border border-slate-200/20">
            <div className="space-y-1">
              <p className="text-[10px] font-bold px-1 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">HADIR</p>
              <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">0</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">SAKIT</p>
              <p className="text-sm font-extrabold text-amber-500 dark:text-amber-400">0</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold px-1 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">IZIN</p>
              <p className="text-sm font-extrabold text-blue-500 dark:text-blue-400">0</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold px-1 py-0.5 rounded bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300">ALPA</p>
              <p className="text-sm font-extrabold text-rose-500 dark:text-rose-400">0</p>
            </div>
          </div>
        </div>

        {/* JADWAL KELAS */}
        <div className="rounded-2xl shadow-md border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)' }}>
          <div className="p-3 border-b flex justify-between items-center bg-slate-50 dark:bg-slate-800/50" style={{ borderColor: 'var(--border-theme)' }}>
            <div>
              <h2 className="font-extrabold text-[10px] uppercase tracking-wide text-slate-500">Jadwal Kelas</h2>
              {selectedDay === actualTodayStr && (
                <span className="text-[8px] font-bold text-emerald-600">Hari Ini</span>
              )}
            </div>
            
            {/* Dropdown Pilihan Hari */}
            <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="text-xs p-1.5 rounded-lg border outline-none font-bold bg-white text-slate-700 shadow-sm cursor-pointer"
                style={{ borderColor: 'var(--border-theme)' }}
            >
                {DAYS_ORDER.map(day => (
                    <option key={day} value={day}>{day.charAt(0).toUpperCase() + day.slice(1)}</option>
                ))}
            </select>
          </div>
          
          <div className="p-3 space-y-2">
            {schedules.length === 0 ? (
              <p className="text-xs text-center opacity-50 italic py-4">Tidak ada jadwal hari {selectedDay}.</p>
            ) : (
              schedules.map((sched) => {
                const status = getScheduleStatus(sched.start_time, sched.end_time);
                const isRest = !!sched.activity_name;
                const userData = Array.isArray(sched.users) ? sched.users[0] : sched.users;
                const subjectData = Array.isArray(sched.subjects) ? sched.subjects[0] : sched.subjects;

                return (
                  <div key={sched.schedule_id} className={`p-3 rounded-xl border flex justify-between items-center ${isRest ? 'bg-orange-50/50 border-orange-100' : 'bg-slate-50/50 border-slate-100'}`}>
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-mono font-bold text-slate-500">
                        {sched.start_time.substring(0, 5)} - {sched.end_time.substring(0, 5)}
                      </p>
                      <p className="text-xs font-extrabold text-slate-800">
                        {isRest ? sched.activity_name : (subjectData?.subject_name || 'Mapel Umum')}
                      </p>
                      {!isRest && (
                        <p className="text-[10px] text-blue-600 font-bold">👤 {userData?.full_name || 'Tanpa Guru'}</p>
                      )}
                    </div>
                    {status && (
                      <div>
                        <span className={`text-[9px] font-bold px-2 py-1 rounded-lg ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Bottom Nav Kondisional */}
      {isUserTeacher ? <TeacherBottomNav /> : <BottomNav />}

      {/* MODAL DAFTAR SISWA */}
      {activeModal === 'students' && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[80vh]">
            <div className="p-4 bg-blue-600 flex justify-between items-center text-white shrink-0">
              <div>
                <h3 className="font-extrabold text-sm uppercase">Daftar Siswa</h3>
                <p className="text-[10px] opacity-80">Total: {students.length} Siswa</p>
              </div>
              <button onClick={() => setActiveModal(null)} className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full font-bold transition cursor-pointer">✕</button>
            </div>
            <div className="overflow-y-auto p-2 space-y-1">
              {students.length === 0 ? (
                <p className="text-center text-xs opacity-50 py-8">Belum ada siswa di kelas ini.</p>
              ) : (
                students.map((std, idx) => (
                  <div key={std.student_id} className="flex gap-3 items-center p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">{idx + 1}</div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{std.full_name}</p>
                      <p className="text-[10px] font-mono text-slate-500">NIS: {std.nis || '-'}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DAFTAR GURU */}
      {activeModal === 'teachers' && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[80vh]">
            <div className="p-4 bg-amber-500 flex justify-between items-center text-white shrink-0">
              <div>
                <h3 className="font-extrabold text-sm uppercase">Daftar Pengampu</h3>
                <p className="text-[10px] opacity-80">Total: {teachers.length} Relasi Mapel</p>
              </div>
              <button onClick={() => setActiveModal(null)} className="w-8 h-8 bg-black/20 hover:bg-black/30 rounded-full font-bold transition cursor-pointer">✕</button>
            </div>
            <div className="overflow-y-auto p-2 space-y-1">
              {teachers.length === 0 ? (
                <p className="text-center text-xs opacity-50 py-8">Belum ada penugasan guru.</p>
              ) : (
                teachers.map((tch) => {
                  const userData = Array.isArray(tch.users) ? tch.users[0] : tch.users;
                  return (
                    <div key={tch.id} className="flex gap-3 items-center p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center text-lg shrink-0">🎓</div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{userData?.full_name || 'Nama Guru Tidak Tersedia'}</p>
                        <p className="text-[10px] font-bold text-amber-600 uppercase mt-0.5">{tch.subject_name || 'MAPEL UMUM'}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}