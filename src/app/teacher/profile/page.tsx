// src/app/teacher/profile/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import TeacherBottomNav from '@/components/TeacherBottomNav';
import '@/style/admin-theme.css';

export default function TeacherProfilePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [showFullProfile, setShowFullProfile] = useState(false); // State untuk show/hide info profile
    
    const [teacher, setTeacher] = useState<any>({
        full_name: 'Memuat...',
        email: '',
        nip: '',
        role: '',
        phone: '',
        address: '',
        education: '',
        avatar_url: ''
    });

    // --- STATE WIDGET ---
    const [schedules, setSchedules] = useState<any[]>([]);
    const [allSchedules, setAllSchedules] = useState<any[]>([]);
    const [scheduleTab, setScheduleTab] = useState<'today' | 'all'>('today');
    
    const [homeroom, setHomeroom] = useState<{
        isHomeroom: boolean;
        className: string;
        attendanceFilled: boolean;
        birthdays: string[];
    }>({ isHomeroom: false, className: '', attendanceFilled: false, birthdays: [] });

    useEffect(() => {
        const savedTheme = (localStorage.getItem('admin_active_theme') as 'light' | 'dark') || 'light';
        setTheme(savedTheme);

        async function fetchTeacherProfile() {
            try {
                setLoading(true);
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                if (sessionError || !session || !session.user.email) {
                    router.replace('/login');
                    return;
                }

                const { data: userData, error: userError } = await supabase
                    .from('users')
                    .select('*')
                    .eq('email', session.user.email)
                    .single();

                if (userError || !userData) {
                    console.error('Gagal memuat profil guru:', userError);
                    return;
                }

                setTeacher(userData);

                // --- LOGIKA WIDGET DASHBOARD ---
                const today = new Date();
                const daysMap = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];
                const currentDayStr = daysMap[today.getDay()];
                const todayString = today.toISOString().split('T')[0];
                const currentMonthDate = todayString.substring(5);

                // 1. Tarik Data Jadwal Mengajar Hari Ini
                const { data: scheduleData } = await supabase
                    .from('class_schedules')
                    .select(`
                        *,
                        classes(class_name),
                        subjects(subject_name)
                    `)
                    .eq('teacher_id', userData.user_id)
                    .eq('day_of_week', currentDayStr)
                    .order('start_time');
                
                if (scheduleData) setSchedules(scheduleData);

                // 1b. Tarik Seluruh Daftar Jadwal Mengajar Guru Tersebut
                const { data: allScheduleData } = await supabase
                    .from('class_schedules')
                    .select(`
                        *,
                        classes(class_name),
                        subjects(subject_name)
                    `)
                    .eq('teacher_id', userData.user_id)
                    .order('day_of_week')
                    .order('start_time');
                
                if (allScheduleData) setAllSchedules(allScheduleData);

                // 2. Tarik Data Radar Wali Kelas (Homeroom)
                const { data: hrClass } = await supabase
                    .from('classes')
                    .select('class_id, class_name')
                    .eq('homeroom_teacher_id', userData.user_id)
                    .maybeSingle();

                if (hrClass) {
                    const { data: students } = await supabase
                        .from('students')
                        .select('student_id, full_name, dob')
                        .eq('class_id', hrClass.class_id);
                    
                    let bdays: string[] = [];
                    let hasAtt = false;

                    if (students && students.length > 0) {
                        bdays = students
                            .filter(s => s.dob && s.dob.substring(5) === currentMonthDate)
                            .map(s => s.full_name);
                        
                        const studentIds = students.map(s => s.student_id);
                        
                        const { data: att } = await supabase
                            .from('attendance')
                            .select('attendance_id')
                            .in('student_id', studentIds)
                            .eq('date', todayString)
                            .limit(1);
                        
                        hasAtt = (att && att.length > 0) || false;
                    }

                    setHomeroom({
                        isHomeroom: true,
                        className: hrClass.class_name,
                        attendanceFilled: hasAtt,
                        birthdays: bdays
                    });
                }
            } catch (err) {
                console.error('Terjadi kesalahan:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchTeacherProfile();
    }, [router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center font-sans text-white" style={{ backgroundColor: 'var(--bg-main)' }}>
                <p className="text-xs font-bold animate-pulse" style={{ color: 'var(--text-main)' }}>Memuat Beranda & Insight...</p>
            </div>
        );
    }

    const displayedSchedules = scheduleTab === 'today' ? schedules : allSchedules;

    return (
        <div
            className="admin-theme-root min-h-screen font-sans flex flex-col justify-between transition-colors duration-300"
            data-theme={theme}
            style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}
        >
            <div className="max-w-md w-full mx-auto p-4 space-y-5 pb-28">
                
                {/* HEADER JUDUL DENGAN ICON LOGOUT DI KANAN */}
                <div
                    className="backdrop-blur-md rounded-2xl p-4 shadow-lg border flex items-center justify-between transition-colors duration-300"
                    style={{ backgroundColor: 'var(--bg-header)', borderColor: 'var(--border-theme)' }}
                >
                    <div className="w-8" /> {/* Spacer penyeimbang */}
                    <div className="text-center">
                        <h1 className="font-extrabold text-white text-base tracking-wider uppercase">BERANDA GURU</h1>
                        <p className="text-[11px] text-blue-100 mt-0.5">Ringkasan aktivitas & profil Anda</p>
                    </div>
                    <button
                        onClick={async () => {
                            await supabase.auth.signOut();
                            router.replace('/login');
                        }}
                        className="w-10 h-10 rounded-xl bg-black/20 hover:bg-black/40 border border-white/10 flex items-center justify-center transition cursor-pointer shrink-0 shadow-sm"
                        title="Keluar / Logout"
                    >
                        <img 
                            src="/icon/logout.png" 
                            alt="Logout" 
                            className="w-8 h-8 object-contain filter invert" 
                            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                        />
                    </button>
                </div>

                {/* KARTU PROFIL UTAMA (Default Nama & Foto + Tombol Show/Hide Detail) */}
                <div
                    className="backdrop-blur-md rounded-2xl p-4 shadow-lg border space-y-3 relative transition-colors duration-300"
                    style={{ backgroundColor: 'var(--bg-header)', borderColor: 'var(--border-theme)' }}
                >
                    <div className="absolute top-3 right-3 z-10">
                        <span className="bg-emerald-400 text-emerald-950 text-[9px] font-extrabold px-2 py-0.5 rounded shadow-md uppercase tracking-wider border border-emerald-500">
                            Active Session
                        </span>
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                        <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-white/85 shadow-md bg-white shrink-0">
                            <img
                                src={teacher.avatar_url || '/icon/photo_id.png'}
                                alt="Avatar"
                                className="w-full h-full object-cover"
                                onError={(e) => { (e.target as HTMLImageElement).src = '/icon/teacher.png' }}
                            />
                        </div>
                        <div className="space-y-0.5 text-white flex-1 min-w-0 pr-16">
                            <h1 className="font-extrabold text-sm tracking-tight leading-tight truncate">{teacher.full_name}</h1>
                            <p className="text-[11px] opacity-90 truncate">{teacher.email}</p>
                        </div>
                    </div>

                    {/* Tombol Show/Hide Detail Info Profile */}
                    <button
                        onClick={() => setShowFullProfile(!showFullProfile)}
                        className="w-full text-left text-[11px] font-bold text-blue-200 hover:text-white transition flex items-center justify-between pt-2 cursor-pointer border-t border-white/10 mt-2"
                    >
                        <span>{showFullProfile ? 'Sembunyikan Info Detail' : 'Tampilkan Info Detail (NIP, Alamat, dll)'}</span>
                        <span>{showFullProfile ? '▲' : '▼'}</span>
                    </button>

                    {/* Detail Profil (Tampil/Sembunyikan) */}
                    {showFullProfile && (
                        <div className="bg-black/20 p-3 rounded-xl border border-white/10 space-y-1.5 text-[10px] text-white/90 font-mono transition-all">
                            <div className="flex justify-between border-b border-white/10 pb-1"><span className="opacity-60">NIP:</span> <span className="font-bold">{teacher.nip || '-'}</span></div>
                            <div className="flex justify-between border-b border-white/10 pb-1"><span className="opacity-60">Role:</span> <span className="uppercase font-bold">{teacher.role || '-'}</span></div>
                            <div className="flex justify-between border-b border-white/10 pb-1"><span className="opacity-60">Telepon:</span> <span className="font-bold">{teacher.phone || '-'}</span></div>
                            <div className="flex justify-between border-b border-white/10 pb-1"><span className="opacity-60">Alamat:</span> <span className="text-right max-w-[65%] leading-tight font-bold">{teacher.address || '-'}</span></div>
                            <div className="flex justify-between"><span className="opacity-60">Pendidikan:</span> <span className="font-bold">{teacher.education || '-'}</span></div>
                        </div>
                    )}
                </div>

                {/* --- WIDGET 1: RADAR WALI KELAS --- */}
                {homeroom.isHomeroom && (
                    <div className="space-y-2">
                        <h2 className="text-xs font-bold uppercase tracking-wider opacity-70 px-1">Radar Wali Kelas ({homeroom.className})</h2>
                        
                        {/* Alert Absensi */}
                        <div className={`p-3 rounded-2xl border shadow-sm flex items-center justify-between transition-all ${
                            homeroom.attendanceFilled 
                                ? 'bg-emerald-500/10 border-emerald-500/30' 
                                : 'bg-amber-500/10 border-amber-500/30'
                        }`}>
                            <div className="flex items-center gap-2.5">
                                <span className="text-xl">{homeroom.attendanceFilled ? '✅' : '⚠️'}</span>
                                <div>
                                    <p className={`text-[11px] font-black ${homeroom.attendanceFilled ? 'text-emerald-600' : 'text-amber-600'}`}>
                                        Status Absensi Hari Ini
                                    </p>
                                    <p className="text-[10px] opacity-75 mt-0.5" style={{ color: 'var(--text-main)' }}>
                                        {homeroom.attendanceFilled ? 'Sudah diisi, terima kasih!' : 'Belum diisi, yuk isi sekarang.'}
                                    </p>
                                </div>
                            </div>
                            {!homeroom.attendanceFilled && (
                                <button 
                                    onClick={() => router.push('/admin/classes/manage')} 
                                    className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition shadow-sm cursor-pointer"
                                >
                                    Isi Absen
                                </button>
                            )}
                        </div>

                        {/* Alert Ulang Tahun */}
                        {homeroom.birthdays.length > 0 && (
                            <div className="p-3 rounded-2xl border border-sky-500/30 bg-sky-500/10 shadow-sm flex items-center gap-2.5 transition-all">
                                <span className="text-xl animate-bounce">🎂</span>
                                <div>
                                    <p className="text-[11px] font-black text-sky-600">Ada yang Ulang Tahun!</p>
                                    <p className="text-[10px] opacity-75 mt-0.5" style={{ color: 'var(--text-main)' }}>
                                        Selamat untuk: <span className="font-extrabold">{homeroom.birthdays.join(', ')}</span>
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* --- WIDGET 2: JADWAL MENGAJAR & RELASI KELAS --- */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                        <h2 className="text-xs font-bold uppercase tracking-wider opacity-70">Jadwal & Penugasan Mengajar</h2>
                        <div className="flex bg-slate-500/10 p-1 rounded-xl border border-slate-500/20 text-[10px] font-bold">
                            <button
                                onClick={() => setScheduleTab('today')}
                                className={`px-2.5 py-1 rounded-lg transition ${scheduleTab === 'today' ? 'bg-blue-600 text-white shadow-sm' : 'opacity-70'}`}
                            >
                                Hari Ini
                            </button>
                            <button
                                onClick={() => setScheduleTab('all')}
                                className={`px-2.5 py-1 rounded-lg transition ${scheduleTab === 'all' ? 'bg-blue-600 text-white shadow-sm' : 'opacity-70'}`}
                            >
                                Semua Jadwal
                            </button>
                        </div>
                    </div>

                    {displayedSchedules.length > 0 ? (
                        <div className="space-y-2">
                            {displayedSchedules.map((sch, idx) => {
                                const now = new Date();
                                const daysMap = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];
                                const currentDayStr = daysMap[now.getDay()];
                                const currentTimeStr = now.toTimeString().substring(0, 5);
                                const isToday = sch.day_of_week?.toLowerCase() === currentDayStr;
                                const isNow = isToday && sch.start_time && sch.end_time && currentTimeStr >= sch.start_time && currentTimeStr <= sch.end_time;
                                
                                return (
                                    <div 
                                        key={idx} 
                                        className={`p-3 rounded-2xl border shadow-sm flex items-center justify-between gap-3 transition-all ${isNow ? 'ring-2 ring-blue-500 bg-blue-500/5' : ''}`} 
                                        style={{ backgroundColor: isNow ? undefined : 'var(--bg-card)', borderColor: isNow ? 'var(--border-theme)' : 'var(--border-theme)' }}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="flex flex-col items-center justify-center shrink-0 w-12 border-r pr-3" style={{ borderColor: 'var(--border-theme)' }}>
                                                <span className={`text-[11px] font-black ${isNow ? 'text-blue-600' : ''}`} style={{ color: isNow ? undefined : 'var(--text-main)' }}>
                                                    {sch.start_time?.substring(0,5) || '-'}
                                                </span>
                                                <span className="text-[9px] opacity-50">
                                                    {sch.end_time?.substring(0,5) || '-'}
                                                </span>
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h3 className={`text-xs font-bold truncate ${isNow ? 'text-blue-600' : 'text-blue-500'}`}>
                                                        {sch.subjects?.subject_name || sch.activity_name || 'Kegiatan'}
                                                    </h3>
                                                    {isNow && <span className="bg-blue-600 text-white text-[8px] px-1.5 py-0.5 rounded font-bold animate-pulse">NOW</span>}
                                                </div>
                                                <p className="text-[10px] opacity-75 mt-0.5" style={{ color: 'var(--text-main)' }}>
                                                    Kelas: <span className="font-semibold">{sch.classes?.class_name || '-'}</span>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="shrink-0 text-right">
                                            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg bg-slate-500/10 opacity-80">
                                                {sch.day_of_week}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div 
                            className="p-5 rounded-2xl border text-center border-dashed shadow-sm transition-all" 
                            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)' }}
                        >
                            <span className="text-2xl">☕</span>
                            <p className="text-[11px] font-bold mt-2 opacity-75" style={{ color: 'var(--text-main)' }}>
                                {scheduleTab === 'today' ? 'Tidak ada jadwal mengajar hari ini.' : 'Belum ada data jadwal mengajar.'}
                            </p>
                        </div>
                    )}
                </div>

            </div>

            <TeacherBottomNav />
        </div>
    );
}