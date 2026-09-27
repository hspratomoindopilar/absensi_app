// src/app/teacher/rekap/page.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { fetchSchoolAndClassInfo } from '@/services/attendanceService';
import { fetchMonthlyAttendanceReport, MonthlyAttendanceSummary, fetchCustomRangeAttendanceReport } from '@/services/rekapService';
import { fetchSchoolHolidays, resolveClassEffectiveDays } from '@/services/settingsService';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import TeacherBottomNav from '@/components/TeacherBottomNav'; // Import Bottom Nav khusus Teacher
import '@/style/admin-theme.css';

export default function RekapPage() {
    const [loading, setLoading] = useState(true);
    const [reportData, setReportData] = useState<MonthlyAttendanceSummary[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [isUserTeacher, setIsUserTeacher] = useState(false); // State untuk mendeteksi role teacher

    // State Daftar Kelas & Kelas Terpilih
    const [classesList, setClassesList] = useState<any[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>('');

    // State untuk filter Bulan & Tahun (default ke bulan & tahun saat ini)
    const currentDate = new Date();
    const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);

    const [sessionData, setSessionData] = useState({
        tenantId: '',
        userId: '',
        schoolName: 'Memuat Sekolah...',
        className: 'Memuat Kelas...',
        teacherName: 'Guru / Admin',
    });

    const [filterMode, setFilterMode] = useState<'monthly' | 'custom'>('monthly');

    // State sementara untuk input date picker
    const [tempStartDate, setTempStartDate] = useState(
        new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0]
    );
    const [tempEndDate, setTempEndDate] = useState(
        new Date().toISOString().split('T')[0]
    );

    const [customStartDate, setCustomStartDate] = useState(tempStartDate);
    const [customEndDate, setCustomEndDate] = useState(tempEndDate);

    // State untuk Modal Kalender Detail Siswa
    const [selectedStudent, setSelectedStudent] = useState<MonthlyAttendanceSummary | null>(null);
    const [studentAttendanceLogs, setStudentAttendanceLogs] = useState<any[]>([]);
    const [schoolHolidaysList, setSchoolHolidaysList] = useState<any[]>([]);
    const [classEffectiveDaysData, setClassEffectiveDaysData] = useState<any>(null);
    const [modalLoading, setModalLoading] = useState(false);

    const router = useRouter();

    // 1. Load Session, User Role, & Daftar Kelas Berdasarkan Hak Akses
    useEffect(() => {
        const savedTheme = (localStorage.getItem('admin_active_theme') as 'light' | 'dark') || 'light';
        setTheme(savedTheme);

        async function initData() {
            try {
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();

                if (sessionError || !session || !session.user.email) {
                    router.replace('/login');
                    return;
                }

                // Ambil data user lengkap (termasuk role & tenant_id) dari tabel users
                const { data: userData, error: userError } = await supabase
                    .from('users')
                    .select('user_id, tenant_id, full_name, role')
                    .eq('email', session.user.email)
                    .single();

                if (userError || !userData) {
                    setLoading(false);
                    return;
                }

                // Deteksi apakah user adalah teacher
                const roleLower = (userData.role || '').toLowerCase();
                const teacherCheck = roleLower.includes('teacher') || roleLower.includes('guru') || (!roleLower.includes('admin') && !roleLower.includes('general'));
                setIsUserTeacher(teacherCheck);

                // Ambil nama sekolah dari tenants
                const { data: tenantData } = await supabase
                    .from('tenants')
                    .select('school_name')
                    .eq('tenant_id', userData.tenant_id)
                    .single();

                // Cek apakah user memiliki akses penuh (Admin / Co-Admin)
                const isAdmin = roleLower.includes('admin') || roleLower.includes('general');

                let allowedClasses: any[] = [];

                if (isAdmin) {
                    // Admin & Co-Admin: Ambil SEMUA kelas di tenant ini
                    const { data: allClasses } = await supabase
                        .from('classes')
                        .select('*')
                        .eq('tenant_id', userData.tenant_id)
                        .order('class_name');
                    
                    allowedClasses = allClasses || [];
                } else {
                    // Guru biasa: Ambil kelas berdasarkan penugasan (teacher_classes) ATAU wali kelas (homeroom_teacher_id)
                    const { data: assignedClasses } = await supabase
                        .from('teacher_classes')
                        .select('class_id, classes(*)')
                        .eq('teacher_id', userData.user_id);

                    const mapAssigned = (assignedClasses || []).map((tc: any) => tc.classes).filter(Boolean);

                    // Ambil juga kelas di mana guru ini menjadi wali kelas
                    const { data: homeroomClasses } = await supabase
                        .from('classes')
                        .select('*')
                        .eq('tenant_id', userData.tenant_id)
                        .eq('homeroom_teacher_id', userData.user_id);

                    // Gabungkan dan hilangkan duplikasi (unique by class_id)
                    const combinedMap = [...mapAssigned, ...(homeroomClasses || [])];
                    const uniqueClassesMap = new Map();
                    combinedMap.forEach(c => {
                        if (c && c.class_id) uniqueClassesMap.set(c.class_id, c);
                    });

                    allowedClasses = Array.from(uniqueClassesMap.values());
                }

                setClassesList(allowedClasses);

                // Auto-select kelas pertama dari daftar yang diizinkan (atau kelas wali kelas utama)
                const defaultClass = allowedClasses.find((c) => c.homeroom_teacher_id === userData.user_id) || allowedClasses[0];

                setSessionData({
                    tenantId: userData.tenant_id,
                    userId: userData.user_id,
                    schoolName: tenantData?.school_name || 'Sekolah',
                    className: defaultClass ? defaultClass.class_name : 'Kelas Tidak Ditemukan',
                    teacherName: userData.full_name || 'Guru / Admin',
                });

                if (defaultClass) {
                    setSelectedClassId(defaultClass.class_id);
                } else {
                    setLoading(false);
                }

            } catch (err) {
                console.error('Gagal inisialisasi rekap berbasis role:', err);
                setLoading(false);
            }
        }

        initData();
    }, [router]);

    // 2. Fetch Report Data ketika Class ID atau Filter berubah
    useEffect(() => {
        async function fetchReport() {
            if (!sessionData.tenantId || !selectedClassId) return;

            setLoading(true);
            try {
                let report: MonthlyAttendanceSummary[] = [];

                if (filterMode === 'monthly') {
                    report = await fetchMonthlyAttendanceReport(
                        sessionData.tenantId,
                        selectedClassId,
                        selectedYear,
                        selectedMonth
                    );
                } else {
                    report = await fetchCustomRangeAttendanceReport(
                        sessionData.tenantId,
                        selectedClassId,
                        customStartDate,
                        customEndDate
                    );
                }

                setReportData(report);

                const currentClass = classesList.find(c => c.class_id === selectedClassId);
                if (currentClass) {
                    setSessionData(prev => ({ ...prev, className: currentClass.class_name }));
                }

            } catch (err) {
                console.error('Gagal memuat data rekap kelas:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchReport();
    }, [selectedClassId, filterMode, selectedYear, selectedMonth, customStartDate, customEndDate, sessionData.tenantId, classesList]);

    // Fungsi untuk membuka modal kalender siswa & mengambil data detailnya
    const handleOpenStudentDetail = async (student: MonthlyAttendanceSummary) => {
        setSelectedStudent(student);
        setModalLoading(true);
        try {
            const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
            const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
            const endDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${lastDay}`;

            // Ambil data absensi spesifik siswa ini dalam bulan tersebut
            const { data: attLogs } = await supabase
                .from('attendance')
                .select('date, status, remarks')
                .eq('student_id', student.student_id)
                .gte('date', startDate)
                .lte('date', endDate);

            // Ambil data hari libur sekolah & aturan HES kelas untuk pemetaan kalender akurat
            const [holidays, hesData] = await Promise.all([
                fetchSchoolHolidays(sessionData.tenantId),
                resolveClassEffectiveDays(sessionData.tenantId, selectedClassId)
            ]);

            setStudentAttendanceLogs(attLogs || []);
            setSchoolHolidaysList(holidays || []);
            setClassEffectiveDaysData(hesData);
        } catch (err) {
            console.error('Gagal memuat detail absensi siswa:', err);
        } finally {
            setModalLoading(false);
        }
    };

    // Generator Kalender Bulanan untuk Modal Detail Siswa
    const studentCalendarDays = useMemo(() => {
        if (!selectedStudent) return [];

        const firstDayIndex = new Date(selectedYear, selectedMonth - 1, 1).getDay();
        const adjustedFirstDay = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
        const totalDays = new Date(selectedYear, selectedMonth, 0).getDate();

        const daysArray = [];
        const daysMap = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];
        
        const activeDaysMap = classEffectiveDaysData 
            ? new Set(classEffectiveDaysData.days.filter((d: any) => d.is_active).map((d: any) => d.day_of_week.toLowerCase()))
            : new Set(['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu']);

        for (let i = 0; i < adjustedFirstDay; i++) {
            daysArray.push({ day: null, dateStr: null, status: 'empty', label: '' });
        }

        for (let d = 1; d <= totalDays; d++) {
            const dateObj = new Date(selectedYear, selectedMonth - 1, d);
            const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const dayIdx = dateObj.getDay();
            const dayName = daysMap[dayIdx];

            const isSunday = dayIdx === 0;
            const matchedHoliday = schoolHolidaysList.find(h => dateStr >= h.start_date && dateStr <= h.end_date);
            const isClassActiveDay = activeDaysMap.has(dayName);

            // Cek apakah ada record absensi tercatat
            const attendanceRecord = studentAttendanceLogs.find(a => a.date === dateStr);

            let status = 'none'; // Default netral
            let label = '';

            if (isSunday || matchedHoliday) {
                status = 'holiday';
                label = matchedHoliday ? matchedHoliday.description : 'Libur Minggu';
            } else if (!isClassActiveDay) {
                status = 'holiday';
                label = 'Libur Efektif Kelas';
            } else if (attendanceRecord) {
                const st = attendanceRecord.status;
                if (st === 'H') { status = 'hadir'; label = 'Hadir'; }
                else if (st === 'S') { status = 'sakit'; label = 'Sakit'; }
                else if (st === 'I') { status = 'izin'; label = 'Izin'; }
                else if (st === 'A') { status = 'alpa'; label = 'Alpa'; }
            } else {
                // Hari Efektif, tapi belum ada record absen dari guru
                status = 'unrecorded';
                label = 'Belum Ada Record';
            }

            daysArray.push({ day: d, dateStr, status, label });
        }

        return daysArray;
    }, [selectedStudent, selectedYear, selectedMonth, studentAttendanceLogs, schoolHolidaysList, classEffectiveDaysData]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.replace('/login');
    };

    const handlePrint = () => {
        window.print();
    };

    const filteredReport = reportData.filter((item) =>
        item.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.nis.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const months = [
        { value: 1, label: 'Januari' }, { value: 2, label: 'Februari' },
        { value: 3, label: 'Maret' }, { value: 4, label: 'April' },
        { value: 5, label: 'Mei' }, { value: 6, label: 'Juni' },
        { value: 7, label: 'Juli' }, { value: 8, label: 'Agustus' },
        { value: 9, label: 'September' }, { value: 10, label: 'Oktober' },
        { value: 11, label: 'November' }, { value: 12, label: 'Desember' },
    ];

    if (loading && reportData.length === 0) {
        return (
            <div className="admin-theme-root min-h-screen flex items-center justify-center font-sans transition-colors duration-300" data-theme={theme} style={{ backgroundColor: 'var(--bg-main)' }}>
                <p className="text-sm font-bold animate-pulse" style={{ color: 'var(--accent-btn)' }}>Mensinkronkan Data Rekap...</p>
            </div>
        );
    }

    const handleExportCSV = () => {
        if (!filteredReport || filteredReport.length === 0) {
            alert('Tidak ada data rekap untuk diexport.');
            return;
        }

        let csvContent = 'data:text/csv;charset=utf-8,\uFEFF';
        csvContent += 'NIS,Nama Lengkap,Gender,Hadir (H),Sakit (S),Izin (I),Alpa (A),Total Data,Hadir (%),Sakit (%),Izin (%),Alpa (%)\n';

        filteredReport.forEach((row) => {
            const total = row.total_presence;
            const hPct = total > 0 ? Math.round((row.total_h / total) * 100) + '%' : '0%';
            const sPct = total > 0 ? Math.round((row.total_s / total) * 100) + '%' : '0%';
            const iPct = total > 0 ? Math.round((row.total_i / total) * 100) + '%' : '0%';
            const aPct = total > 0 ? Math.round((row.total_a / total) * 100) + '%' : '0%';

            const line = [
                `"${row.nis}"`, `"${row.full_name}"`, `"${row.gender || 'L'}"`,
                row.total_h, row.total_s, row.total_i, row.total_a, total,
                `"${hPct}"`, `"${sPct}"`, `"${iPct}"`, `"${aPct}"`
            ].join(',');
            csvContent += line + '\n';
        });

        const totalSiswa = filteredReport.length;
        const totalLaki = filteredReport.filter(s => (s.gender || 'L') === 'L').length;
        const totalPerempuan = filteredReport.filter(s => s.gender === 'P').length;

        csvContent += '\n';
        csvContent += `,"Total Siswa",${totalSiswa}\n`;
        csvContent += `,"Jumlah Siswa Laki-Laki",${totalLaki}\n`;
        csvContent += `,"Jumlah Siswa Perempuan",${totalPerempuan}\n`;

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `Rekap_${sessionData.className.replace(/\s+/g, '_')}_Bulan_${selectedMonth}_${selectedYear}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div 
            className="admin-theme-root min-h-screen font-sans flex flex-col transition-colors duration-300"
            data-theme={theme}
            style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}
        >
            <div className="sticky top-0 z-30 shadow-sm transition-colors duration-300" style={{ backgroundColor: 'var(--bg-main)' }}>
                <Header
                    schoolName={sessionData.schoolName}
                    className={sessionData.className}
                    teacherName={sessionData.teacherName}
                    onLogout={handleLogout}
                />

                <div className="px-4 pt-2.5 pb-2 max-w-md mx-auto space-y-2">
                    {/* Kotak Pengaturan Filter & Kelas */}
                    <div className="app-card p-3 shadow-sm border rounded-xl space-y-2 print:hidden transition-colors relative" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)' }}>
                        {loading && (
                           <div className="absolute top-2 right-2 flex gap-1">
                               <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"></span>
                               <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce delay-100"></span>
                           </div>
                        )}

                        {/* Dropdown Pilihan Kelas */}
                        <div className="flex items-center justify-between pb-2 border-b transition-colors" style={{ borderColor: 'var(--border-theme)' }}>
                            <span className="text-xs font-bold uppercase tracking-wider opacity-80">Pilih Kelas</span>
                            <select
                                value={selectedClassId}
                                onChange={(e) => setSelectedClassId(e.target.value)}
                                className="text-xs font-bold px-2 py-1.5 rounded-lg border focus:outline-none transition-colors outline-none cursor-pointer max-w-[150px] truncate"
                                style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', borderColor: 'var(--border-theme)' }}
                            >
                                {classesList.map(c => (
                                    <option key={c.class_id} value={c.class_id}>{c.class_name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                            <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold uppercase tracking-wider opacity-80">Periode</span>
                            </div>

                            {/* Tombol Toggle Mode */}
                            <div className="flex p-0.5 rounded-lg border transition-colors" style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-theme)' }}>
                                <button
                                    onClick={() => setFilterMode('monthly')}
                                    className={`px-2 py-1 text-[10px] font-bold rounded-md transition-colors ${filterMode === 'monthly' ? 'shadow-sm' : 'opacity-60 hover:opacity-100'}`}
                                    style={{ 
                                        backgroundColor: filterMode === 'monthly' ? 'var(--bg-card)' : 'transparent',
                                        color: filterMode === 'monthly' ? 'var(--accent-btn)' : 'var(--text-main)'
                                    }}
                                >
                                    Bulanan
                                </button>
                                <button
                                    onClick={() => setFilterMode('custom')}
                                    className={`px-2 py-1 text-[10px] font-bold rounded-md transition-colors ${filterMode === 'custom' ? 'shadow-sm' : 'opacity-60 hover:opacity-100'}`}
                                    style={{ 
                                        backgroundColor: filterMode === 'custom' ? 'var(--bg-card)' : 'transparent',
                                        color: filterMode === 'custom' ? 'var(--accent-btn)' : 'var(--text-main)'
                                    }}
                                >
                                    Kustom
                                </button>
                            </div>
                        </div>

                        {filterMode === 'monthly' ? (
                            <div className="flex items-center justify-between gap-2 pt-2 mt-1 border-t transition-colors" style={{ borderColor: 'var(--border-theme)' }}>
                                <span className="text-[11px] opacity-70">Bulan & Tahun</span>
                                <div className="flex items-center gap-1.5">
                                    <select
                                        value={selectedMonth}
                                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                        className="text-xs font-semibold px-2 py-1 rounded-lg border focus:outline-none transition-colors outline-none cursor-pointer"
                                        style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', borderColor: 'var(--border-theme)' }}
                                    >
                                        {months.map((m) => (
                                            <option key={m.value} value={m.value}>{m.label}</option>
                                        ))}
                                    </select>
                                    <select
                                        value={selectedYear}
                                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                                        className="text-xs font-semibold px-2 py-1 rounded-lg border focus:outline-none transition-colors outline-none cursor-pointer"
                                        style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', borderColor: 'var(--border-theme)' }}
                                    >
                                        {[2025, 2026, 2027].map((y) => (
                                            <option key={y} value={y}>{y}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2 pt-2 mt-1 border-t transition-colors" style={{ borderColor: 'var(--border-theme)' }}>
                                <div className="flex items-center justify-between gap-1">
                                    <input
                                        type="date"
                                        value={tempStartDate}
                                        onChange={(e) => setTempStartDate(e.target.value)}
                                        className="text-[10px] font-semibold px-2 py-1 rounded-lg border focus:outline-none flex-1 transition-colors outline-none cursor-pointer"
                                        style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', borderColor: 'var(--border-theme)' }}
                                    />
                                    <span className="text-xs opacity-60">s/d</span>
                                    <input
                                        type="date"
                                        value={tempEndDate}
                                        onChange={(e) => setTempEndDate(e.target.value)}
                                        className="text-[10px] font-semibold px-2 py-1 rounded-lg border focus:outline-none flex-1 transition-colors outline-none cursor-pointer"
                                        style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', borderColor: 'var(--border-theme)' }}
                                    />
                                </div>
                                <button
                                    onClick={() => {
                                        setCustomStartDate(tempStartDate);
                                        setCustomEndDate(tempEndDate);
                                    }}
                                    className="w-full font-bold py-1.5 px-3 rounded-lg text-xs transition shadow-sm cursor-pointer hover:opacity-90"
                                    style={{ backgroundColor: 'var(--accent-btn)', color: '#fff' }}
                                >
                                    Terapkan Rentang Tanggal
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={handleExportCSV}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-xl text-xs transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                            <span>📊</span> Export Excel
                        </button>
                        <button
                            onClick={handlePrint}
                            className="flex-1 bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 text-white font-bold py-2 px-3 rounded-xl text-xs transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                            <span>🖨️</span> Cetak / Print
                        </button>
                    </div>

                    {/* Search Bar */}
                    <div>
                        <input
                            type="text"
                            placeholder="🔍 Cari nama atau NIS siswa..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-colors outline-none"
                            style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', borderColor: 'var(--border-theme)' }}
                        />
                    </div>
                    
                    {/* Teks Informasi Periode - Hanya Muncul Saat Dicetak */}
                    <div className="hidden print:block mb-4 text-center border-b border-black pb-3 text-black">
                        <h1 className="text-base font-bold">REKAPITULASI KEHADIRAN SISWA</h1>
                        <p className="text-xs mt-0.5">
                            {sessionData.schoolName} - {sessionData.className}
                        </p>
                        <p className="text-xs font-semibold mt-1">
                            Periode: {filterMode === 'monthly'
                                ? `${months.find(m => m.value === selectedMonth)?.label} ${selectedYear}`
                                : `${customStartDate} s/d ${customEndDate}`
                            }
                        </p>
                    </div>
                    
                    <div className="flex justify-between items-center px-1 pt-1">
                        <h2 className="font-bold text-[11px] uppercase tracking-wider opacity-70">
                            Akumulasi Kehadiran Kelas (Klik Nama Siswa untuk Detail Kalender)
                        </h2>
                        <span className="text-[11px] opacity-60 font-bold">{filteredReport.length} Siswa</span>
                    </div>
                </div>
            </div>

            <main className="px-4 py-2 max-w-md mx-auto w-full space-y-2 flex-1 pb-28">
                {filteredReport.length === 0 ? (
                    <div className="app-card p-8 rounded-2xl border text-center space-y-2 mt-4 shadow-sm transition-colors" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)' }}>
                        <span className="text-3xl">📭</span>
                        <h3 className="font-bold text-xs">Belum Ada Data Rekap</h3>
                        <p className="text-[10px] opacity-60">
                            Belum ada catatan absensi yang tersimpan pada {filterMode === 'monthly' ? `bulan ${months.find(m => m.value === selectedMonth)?.label} ${selectedYear}` : 'rentang tanggal terpilih'}.
                        </p>
                    </div>
                ) : (
                    filteredReport.map((item, index) => {
                        const total = item.total_presence;
                        const percentage = total > 0 ? Math.round((item.total_h / total) * 100) : 0;

                        let barColor = 'bg-emerald-500';
                        let textColor = 'text-emerald-700 dark:text-emerald-400';
                        let badgeBg = 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800';

                        if (percentage < 60) {
                            barColor = 'bg-rose-500';
                            textColor = 'text-rose-700 dark:text-rose-400';
                            badgeBg = 'bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800';
                        } else if (percentage < 80) {
                            barColor = 'bg-amber-500';
                            textColor = 'text-amber-700 dark:text-amber-400';
                            badgeBg = 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800';
                        }

                        return (
                            <div 
                                key={item.student_id} 
                                onClick={() => handleOpenStudentDetail(item)}
                                className="app-card p-3 rounded-2xl border space-y-2.5 transition cursor-pointer hover:scale-[1.01] shadow-sm group" 
                                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)' }}
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[9px] font-bold opacity-60">No. {index + 1}</span>
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${item.gender === 'P' ? 'bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-400' : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400'}`}>
                                                {item.gender || 'L'}
                                            </span>
                                            <span className="text-[9px] text-blue-500 opacity-0 group-hover:opacity-100 font-bold transition">📅 Lihat Kalender</span>
                                        </div>
                                        <h3 className="font-bold text-xs leading-tight mt-1 hover:underline">{item.full_name}</h3>
                                        <span className="text-[10px] opacity-60">NIS: {item.nis}</span>
                                    </div>

                                    {/* Badge Persentase Kehadiran Visual */}
                                    <div className={`px-2 py-1 rounded-xl border text-center ${badgeBg}`}>
                                        <span className="block text-[8px] uppercase font-bold opacity-70">Kehadiran</span>
                                        <span className={`font-black text-xs ${textColor}`}>{percentage}%</span>
                                    </div>
                                </div>

                                {/* Progress Bar Visual */}
                                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                                        style={{ width: `${percentage}%` }}
                                    ></div>
                                </div>

                                {/* Badge Statistik Ringkas Per Siswa */}
                                <div className="grid grid-cols-4 gap-1 pt-2 border-t text-center transition-colors" style={{ borderColor: 'var(--border-theme)' }}>
                                    <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800/50 rounded-lg p-1">
                                        <span className="block text-[8px] uppercase font-bold text-emerald-600 dark:text-emerald-500">Hadir</span>
                                        <span className="font-black text-xs text-emerald-700 dark:text-emerald-400">{item.total_h}</span>
                                    </div>
                                    <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-100 dark:border-amber-800/50 rounded-lg p-1">
                                        <span className="block text-[8px] uppercase font-bold text-amber-600 dark:text-amber-500">Sakit</span>
                                        <span className="font-black text-xs text-amber-700 dark:text-amber-400">{item.total_s}</span>
                                    </div>
                                    <div className="bg-sky-50 dark:bg-sky-900/30 border border-sky-100 dark:border-sky-800/50 rounded-lg p-1">
                                        <span className="block text-[8px] uppercase font-bold text-sky-600 dark:text-sky-500">Izin</span>
                                        <span className="font-black text-xs text-sky-700 dark:text-sky-400">{item.total_i}</span>
                                    </div>
                                    <div className="bg-rose-50 dark:bg-rose-900/30 border border-rose-100 dark:border-rose-800/50 rounded-lg p-1">
                                        <span className="block text-[8px] uppercase font-bold text-rose-600 dark:text-rose-500">Alpa</span>
                                        <span className="font-black text-xs text-rose-700 dark:text-rose-400">{item.total_a}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </main>

            {/* MODAL KALENDER DETAIL SISWA */}
            {selectedStudent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm transition-opacity">
                    <div 
                        className="w-full max-w-md rounded-3xl shadow-2xl border overflow-hidden flex flex-col max-h-[90vh]"
                        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)' }}
                    >
                        {/* Header Modal */}
                        <div className="p-4 bg-blue-600 flex justify-between items-center text-white shrink-0">
                            <div>
                                <h3 className="font-extrabold text-sm uppercase">Rekam Jejak Kehadiran</h3>
                                <p className="text-[10px] opacity-90">{selectedStudent.full_name} • NIS: {selectedStudent.nis}</p>
                            </div>
                            <button 
                                onClick={() => setSelectedStudent(null)} 
                                className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full font-bold transition cursor-pointer flex items-center justify-center"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Konten Kalender di dalam Modal */}
                        <div className="p-4 overflow-y-auto space-y-4">
                            <div className="text-center pb-2 border-b" style={{ borderColor: 'var(--border-theme)' }}>
                                <p className="text-xs font-bold uppercase tracking-wider opacity-70">
                                    Periode: {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
                                </p>
                            </div>

                            {modalLoading ? (
                                <div className="py-12 text-center">
                                    <p className="text-xs font-bold animate-pulse text-blue-500">Memuat Kalender Absensi Siswa...</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {/* Hari Kalender Header */}
                                    <div className="grid grid-cols-7 gap-1 text-center font-bold text-[10px] opacity-60">
                                        <span>Sen</span><span>Sel</span><span>Rab</span><span>Kam</span><span>Jum</span><span>Sab</span>
                                        <span className="text-rose-500">Min</span>
                                    </div>

                                    {/* Grid Tanggal */}
                                    <div className="grid grid-cols-7 gap-1.5">
                                        {studentCalendarDays.map((item, idx) => {
                                            if (!item.day) {
                                                return <div key={idx} className="aspect-square"></div>;
                                            }

                                            let styleClass = 'border-slate-300 dark:border-slate-700 opacity-40';
                                            let badgeText = '';

                                            if (item.status === 'hadir') {
                                                styleClass = 'bg-emerald-500/20 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold';
                                                badgeText = '🟢 H';
                                            } else if (item.status === 'sakit') {
                                                styleClass = 'bg-amber-500/20 border-amber-500 text-amber-600 dark:text-amber-400 font-bold';
                                                badgeText = '🔵 S';
                                            } else if (item.status === 'izin') {
                                                styleClass = 'bg-sky-500/20 border-sky-500 text-sky-600 dark:text-sky-400 font-bold';
                                                badgeText = '🟡 I';
                                            } else if (item.status === 'alpa') {
                                                styleClass = 'bg-rose-500/20 border-rose-500 text-rose-600 dark:text-rose-400 font-bold';
                                                badgeText = '🔴 A';
                                            } else if (item.status === 'holiday') {
                                                styleClass = 'bg-slate-500/10 border-slate-500/20 text-slate-400 opacity-60';
                                                badgeText = '⚫ Libur';
                                            } else if (item.status === 'unrecorded') {
                                                styleClass = 'bg-purple-500/10 border-purple-500/40 text-purple-600 dark:text-purple-300 border-dashed';
                                                badgeText = '⚠️ Belum';
                                            }

                                            return (
                                                <div
                                                    key={idx}
                                                    title={`${item.dateStr}: ${item.label}`}
                                                    className={`aspect-square rounded-xl border flex flex-col items-center justify-center p-0.5 text-center transition hover:scale-105 ${styleClass}`}
                                                >
                                                    <span className="text-xs font-black">{item.day}</span>
                                                    <span className="text-[7px] font-extrabold uppercase mt-0.5 truncate w-full px-0.5">
                                                        {badgeText}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Legend Keterangan */}
                                    <div className="pt-3 border-t grid grid-cols-2 gap-2 text-[10px] font-semibold opacity-80" style={{ borderColor: 'var(--border-theme)' }}>
                                        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-emerald-500"><span></span></span> Hadir (H)</div>
                                        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-amber-500"></span> Sakit (S)</div>
                                        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-sky-500"></span> Izin (I)</div>
                                        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-rose-500"></span> Alpa (A)</div>
                                        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-purple-400 border border-dashed"></span> Belum Ada Record</div>
                                        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-slate-400 opacity-50"></span> Libur / Minggu</div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer Modal */}
                        <div className="p-3 border-t shrink-0 flex justify-end" style={{ borderColor: 'var(--border-theme)' }}>
                            <button
                                onClick={() => setSelectedStudent(null)}
                                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-xs font-bold rounded-xl cursor-pointer hover:opacity-80 transition"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Nav Kondisional */}
            {isUserTeacher ? <TeacherBottomNav /> : <BottomNav />}
        </div>
    );
}