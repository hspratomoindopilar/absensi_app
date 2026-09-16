'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getStudentReportProfile, getStudentAttendance, getSchoolHolidays } from '@/services/studentRaportService';
import NavBottomStudent from '@/components/NavBottomStudent';

export default function StudentReportPage() {
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<any>(null);
    const [attendanceList, setAttendanceList] = useState<any[]>([]);
    const [holidaysList, setHolidaysList] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'attendance' | 'reportcard'>('attendance');
    const [currentTheme, setCurrentTheme] = useState('default');
    
    // Filter Bulan & Tahun (Default: Current Month & Year)
    const currentDate = new Date();
    const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);

    const router = useRouter();

    // Load Profil & Data Berdasarkan Bulan yang Dipilih
    useEffect(() => {
        async function loadInitialData() {
            try {
                setLoading(true);
                // Muat tema aktif dari localStorage
                const savedTheme = localStorage.getItem('student_active_theme') || 'default';
                setCurrentTheme(savedTheme);

                const rawSession = localStorage.getItem('kelasyik_student_session') || localStorage.getItem('current_student');
                if (!rawSession) {
                    router.replace('/login');
                    return;
                }

                const session = JSON.parse(rawSession!);
                const studentId = session.studentId || session.student_id;
                if (!studentId) {
                    router.replace('/login');
                    return;
                }

                // Ambil profil dulu untuk mendapatkan tenant_id
                const dataProfile = await getStudentReportProfile(String(studentId));
                setProfile(dataProfile);

                if (dataProfile) {
                    // Hitung rentang tanggal awal dan akhir bulan yang dipilih
                    const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
                    const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
                    const endDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${lastDay}`;

                    const [dataAttendance, dataHolidays] = await Promise.all([
                        getStudentAttendance(String(studentId), startDate, endDate),
                        getSchoolHolidays(dataProfile.tenant_id, startDate, endDate)
                    ]);

                    setAttendanceList(dataAttendance);
                    setHolidaysList(dataHolidays);
                }
            } catch (err) {
                console.error('Gagal memuat data raport & absensi:', err);
            } finally {
                setLoading(false);
            }
        }

        loadInitialData();
    }, [selectedYear, selectedMonth, router]);

    // Hitung ringkasan statistik berdasarkan data bulan ini
    const summary = useMemo(() => {
        return {
            hadir: attendanceList.filter(item => item.status === 'Hadir' || item.status === 'H').length,
            sakit: attendanceList.filter(item => item.status === 'Sakit' || item.status === 'S').length,
            izin: attendanceList.filter(item => item.status === 'Izin' || item.status === 'I').length,
            alpa: attendanceList.filter(item => item.status === 'Alpa' || item.status === 'A' || !item.status).length,
        };
    }, [attendanceList]);

    // Generator Kalender Bulanan
    const calendarDays = useMemo(() => {
        const firstDayIndex = new Date(selectedYear, selectedMonth - 1, 1).getDay();
        // Sesuaikan indeks agar Senin menjadi awal minggu (0 = Senin, ..., 6 = Minggu)
        const adjustedFirstDay = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
        const totalDays = new Date(selectedYear, selectedMonth, 0).getDate();

        const daysArray = [];

        // Padding hari kosong sebelum tanggal 1
        for (let i = 0; i < adjustedFirstDay; i++) {
            daysArray.push({ day: null, dateStr: null, status: 'empty', holidayInfo: null });
        }

        // Loop tanggal dalam bulan tersebut
        for (let d = 1; d <= totalDays; d++) {
            const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            
            // Cek apakah hari Minggu
            const dayOfWeek = new Date(selectedYear, selectedMonth - 1, d).getDay();
            const isSunday = dayOfWeek === 0;

            // Cek apakah masuk dalam rentang hari libur sekolah (tabel school_holidays)
            const holiday = holidaysList.find(h => dateStr >= h.start_date && dateStr <= h.end_date);

            // Cek status absensi siswa di tanggal ini
            const attendance = attendanceList.find(a => a.date === dateStr);

            let status = 'none'; // Default netral
            let remarks = '';

            if (isSunday || holiday) {
                status = 'holiday'; // Abu-abu untuk libur / minggu
                remarks = holiday ? holiday.description : 'Hari Minggu / Libur Akhir Pekan';
            } else if (attendance) {
                const st = attendance.status;
                if (st === 'Hadir' || st === 'H') status = 'hadir';
                else if (st === 'Sakit' || st === 'S') status = 'sakit';
                else if (st === 'Izin' || st === 'I') status = 'izin';
                else if (st === 'Alpa' || st === 'A') status = 'alpa';
                remarks = attendance.notes || '';
            }

            daysArray.push({ day: d, dateStr, status, remarks, isHoliday: isSunday || holiday });
        }

        return daysArray;
    }, [selectedYear, selectedMonth, attendanceList, holidaysList]);

    const months = [
        { value: 1, label: 'Januari' }, { value: 2, label: 'Februari' }, { value: 3, label: 'Maret' },
        { value: 4, label: 'April' }, { value: 5, label: 'Mei' }, { value: 6, label: 'Juni' },
        { value: 7, label: 'Juli' }, { value: 8, label: 'Agustus' }, { value: 9, label: 'September' },
        { value: 10, label: 'Oktober' }, { value: 11, label: 'November' }, { value: 12, label: 'Desember' },
    ];

    if (loading) {
        return (
            <div 
                className="student-theme-root min-h-screen flex items-center justify-center"
                data-theme={currentTheme}
                style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}
            >
                <p className="text-sm font-medium animate-pulse" style={{ color: 'var(--badge-text)' }}>Memuat Data Raport & Kehadiran...</p>
            </div>
        );
    }

    return (
        <div 
            className="student-theme-root min-h-screen font-sans flex flex-col pb-28 transition-colors duration-300"
            data-theme={currentTheme}
            style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}
        >
            {/* Header */}
            <div 
                className="px-6 pt-6 pb-6 rounded-b-3xl border-b relative shadow-xl"
                style={{ backgroundColor: 'var(--bg-header)', borderColor: 'var(--border-light)' }}
            >
                <div 
                    className="absolute top-0 left-0 right-0 h-1 shadow-[0_0_12px_var(--hover-shadow)]"
                    style={{ background: 'var(--accent-gradient)' }}
                ></div>
                <div className="max-w-2xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link 
                            href="/student/dashboard" 
                            className="w-9 h-9 rounded-xl border flex items-center justify-center text-xs transition"
                            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)', color: 'var(--text-main)' }}
                        >
                            ←
                        </Link>
                        <div>
                            <h1 className="text-base font-black" style={{ color: 'var(--text-main)' }}>Rekap Akademik & Kehadiran</h1>
                            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{profile?.full_name} • {profile?.classes?.class_name || 'Kelas'}</p>
                        </div>
                    </div>
                </div>

                {/* Tab Navigasi Utama */}
                <div className="max-w-2xl mx-auto grid grid-cols-2 gap-2 mt-5">
                    <button 
                        onClick={() => setActiveTab('attendance')}
                        className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                            activeTab === 'attendance' 
                                ? 'shadow-[0_0_10px_var(--hover-shadow)]' 
                                : 'hover:opacity-80'
                        }`}
                        style={{
                            backgroundColor: activeTab === 'attendance' ? 'var(--badge-bg)' : 'var(--bg-card)',
                            color: activeTab === 'attendance' ? 'var(--badge-text)' : 'var(--text-muted)',
                            borderColor: activeTab === 'attendance' ? 'var(--badge-border)' : 'var(--border-light)'
                        }}
                    >
                        📅 Riwayat Absensi
                    </button>
                    <button 
                        onClick={() => setActiveTab('reportcard')}
                        className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                            activeTab === 'reportcard' 
                                ? 'shadow-[0_0_10px_var(--hover-shadow)]' 
                                : 'hover:opacity-80'
                        }`}
                        style={{
                            backgroundColor: activeTab === 'reportcard' ? 'var(--badge-bg)' : 'var(--bg-card)',
                            color: activeTab === 'reportcard' ? 'var(--badge-text)' : 'var(--text-muted)',
                            borderColor: activeTab === 'reportcard' ? 'var(--badge-border)' : 'var(--border-light)'
                        }}
                    >
                        📚 Buku Raport Digital
                    </button>
                </div>
            </div>

            {/* Konten Utama */}
            <div className="max-w-2xl mx-auto w-full px-5 mt-5 space-y-4">
                {activeTab === 'attendance' ? (
                    <div className="space-y-4">
                        {/* Filter Bulan & Tahun */}
                        <div 
                            className="border p-3 rounded-2xl flex items-center justify-between shadow-lg"
                            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}
                        >
                            <span className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>Periode Bulan</span>
                            <div className="flex items-center gap-2">
                                <select
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                    className="text-xs font-semibold px-3 py-1.5 rounded-xl border focus:outline-none"
                                    style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', borderColor: 'var(--border-theme)' }}
                                >
                                    {months.map((m) => (
                                        <option key={m.value} value={m.value} style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}>{m.label}</option>
                                    ))}
                                </select>
                                <select
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                                    className="text-xs font-semibold px-3 py-1.5 rounded-xl border focus:outline-none"
                                    style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', borderColor: 'var(--border-theme)' }}
                                >
                                    {[2025, 2026, 2027].map((y) => (
                                        <option key={y} value={y} style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}>{y}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Kartu Statistik Kehadiran Bulan Ini (Ringkasan Total) */}
                        <div className="grid grid-cols-4 gap-2 text-center">
                            <div className="border border-emerald-500/40 p-3 rounded-2xl shadow-lg" style={{ backgroundColor: 'var(--bg-card)' }}>
                                <p className="text-[9px] text-emerald-300 uppercase font-bold">Hadir</p>
                                <p className="text-lg font-black text-emerald-400 mt-1">{summary.hadir}</p>
                            </div>
                            <div className="border border-blue-500/40 p-3 rounded-2xl shadow-lg" style={{ backgroundColor: 'var(--bg-card)' }}>
                                <p className="text-[9px] text-blue-300 uppercase font-bold">Sakit</p>
                                <p className="text-lg font-black text-blue-400 mt-1">{summary.sakit}</p>
                            </div>
                            <div className="border border-amber-500/40 p-3 rounded-2xl shadow-lg" style={{ backgroundColor: 'var(--bg-card)' }}>
                                <p className="text-[9px] text-amber-300 uppercase font-bold">Izin</p>
                                <p className="text-lg font-black text-amber-400 mt-1">{summary.izin}</p>
                            </div>
                            <div className="border border-rose-500/40 p-3 rounded-2xl shadow-lg" style={{ backgroundColor: 'var(--bg-card)' }}>
                                <p className="text-[9px] text-rose-300 uppercase font-bold">Alpa</p>
                                <p className="text-lg font-black text-rose-400 mt-1">{summary.alpa}</p>
                            </div>
                        </div>

                        {/* Judul Peta Kehadiran */}
                        <div className="flex items-center justify-between pt-1">
                            <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--badge-text)' }}>Peta Rekam Jejak Kehadiran</h3>
                        </div>

                        {/* TAMPILAN UTAMA: KALENDER ARCADE */}
                        <div 
                            className="border p-4 rounded-2xl space-y-3 shadow-xl"
                            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}
                        >
                            {/* Header Hari */}
                            <div 
                                className="grid grid-cols-7 gap-1 text-center font-bold text-[10px] pb-2 border-b"
                                style={{ color: 'var(--text-muted)', borderColor: 'var(--border-light)' }}
                            >
                                <span>Sen</span>
                                <span>Sel</span>
                                <span>Rab</span>
                                <span>Kam</span>
                                <span>Jum</span>
                                <span>Sab</span>
                                <span className="text-rose-400">Min</span>
                            </div>

                            {/* Grid Tanggal */}
                            <div className="grid grid-cols-7 gap-1.5">
                                {calendarDays.map((item, idx) => {
                                    if (!item.day) {
                                        return <div key={idx} className="aspect-square"></div>;
                                    }

                                    // Warna latar belakang sesuai status
                                    let bgStyle = 'border-[var(--border-light)] text-[var(--text-main)]';
                                    if (item.status === 'hadir') bgStyle = 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-[0_0_6px_rgba(16,185,129,0.3)]';
                                    if (item.status === 'sakit') bgStyle = 'bg-blue-500/20 border-blue-500/50 text-blue-300 shadow-[0_0_6px_rgba(59,130,246,0.3)]';
                                    if (item.status === 'izin') bgStyle = 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-[0_0_6px_rgba(245,158,11,0.3)]';
                                    if (item.status === 'alpa') bgStyle = 'bg-rose-500/20 border-rose-500/50 text-rose-300 shadow-[0_0_6px_rgba(244,63,94,0.3)]';
                                    if (item.status === 'holiday') bgStyle = 'bg-zinc-700/50 border-zinc-600/40 text-zinc-400';

                                    return (
                                        <div 
                                            key={idx} 
                                            title={`${item.dateStr}: ${item.status.toUpperCase()} ${item.remarks ? `(${item.remarks})` : ''}`}
                                            className={`aspect-square rounded-xl border flex flex-col items-center justify-center relative cursor-default transition hover:scale-105 ${bgStyle}`}
                                            style={item.status === 'none' ? { backgroundColor: 'var(--bg-main)' } : undefined}
                                        >
                                            <span className="text-xs font-black">{item.day}</span>
                                            <span className="text-[8px] font-bold uppercase mt-0.5">
                                                {item.status === 'hadir' && '🟢 H'}
                                                {item.status === 'sakit' && '🔵 S'}
                                                {item.status === 'izin' && '🟡 I'}
                                                {item.status === 'alpa' && '🔴 A'}
                                                {item.status === 'holiday' && '⚫ Libur'}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Keterangan Warna Legend */}
                            <div 
                                className="pt-3 border-t flex flex-wrap gap-3 justify-center text-[9px] font-bold"
                                style={{ color: 'var(--text-muted)', borderColor: 'var(--border-light)' }}
                            >
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400"></span> Hadir</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400"></span> Sakit</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400"></span> Izin</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400"></span> Alpa</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-zinc-500"></span> Libur</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* --- TAB BUKU RAPORT DIGITAL --- */
                    <div 
                        className="border p-6 rounded-2xl text-center space-y-4 shadow-xl"
                        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}
                    >
                        <div 
                            className="w-16 h-16 border rounded-2xl mx-auto flex items-center justify-center text-3xl"
                            style={{ backgroundColor: 'var(--badge-bg)', borderColor: 'var(--badge-border)' }}
                        >
                            📖
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-sm font-black uppercase tracking-wider" style={{ color: 'var(--badge-text)' }}>Buku Raport Digital</h3>
                            <p className="text-xs max-w-sm mx-auto" style={{ color: 'var(--text-muted)' }}>
                                Fitur buku raport digital dan rekap nilai per semester akan segera aktif di sini sesuai jadwal rilis akademik.
                            </p>
                        </div>
                        <div className="pt-2">
                            <span 
                                className="inline-block border px-3 py-1 rounded-full text-[10px] font-bold"
                                style={{ backgroundColor: 'var(--badge-bg)', color: 'var(--badge-text)', borderColor: 'var(--badge-border)' }}
                            >
                                Status: Menunggu Publikasi Guru / Wali Kelas 🔒
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Komponen Navigasi Bawah Global */}
            <NavBottomStudent />
        </div>
    );
}