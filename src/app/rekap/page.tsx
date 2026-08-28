'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { fetchSchoolAndClassInfo } from '@/services/attendanceService';
import { fetchMonthlyAttendanceReport, MonthlyAttendanceSummary, fetchCustomRangeAttendanceReport } from '@/services/rekapService';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';

export default function RekapPage() {
    const [loading, setLoading] = useState(true);
    const [reportData, setReportData] = useState<MonthlyAttendanceSummary[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    // State untuk filter Bulan & Tahun (default ke bulan & tahun saat ini)
    const currentDate = new Date();
    const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);

    const [sessionData, setSessionData] = useState({
        tenantId: '',
        classId: '',
        schoolName: 'Memuat Sekolah...',
        className: 'Memuat Kelas...',
        teacherName: 'Guru / Admin',
    });

    const [filterMode, setFilterMode] = useState<'monthly' | 'custom'>('monthly');

    // State sementara untuk input date picker (tidak langsung mentrigger fetch)
    const [tempStartDate, setTempStartDate] = useState(
        new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0]
    );
    const [tempEndDate, setTempEndDate] = useState(
        new Date().toISOString().split('T')[0]
    );

    // State final yang benar-benar digunakan untuk mengambil data rekap
    const [customStartDate, setCustomStartDate] = useState(tempStartDate);
    const [customEndDate, setCustomEndDate] = useState(tempEndDate);
    const router = useRouter();

    // Load session & data rekap
    // Load session & data rekap
    useEffect(() => {
        async function loadData() {
            try {
                setLoading(true);
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();

                if (sessionError || !session || !session.user.email) {
                    router.replace('/login');
                    return;
                }

                const info = await fetchSchoolAndClassInfo(session.user.email);
                if (!info || !info.tenantId || !info.classId) {
                    setLoading(false);
                    return;
                }

                setSessionData({
                    tenantId: info.tenantId,
                    classId: info.classId,
                    schoolName: info.schoolName,
                    className: info.className,
                    teacherName: info.teacherName,
                });

                let report: MonthlyAttendanceSummary[] = [];

                if (filterMode === 'monthly') {
                    report = await fetchMonthlyAttendanceReport(
                        info.tenantId,
                        info.classId,
                        selectedYear,
                        selectedMonth
                    );
                } else {
                    report = await fetchCustomRangeAttendanceReport(
                        info.tenantId,
                        info.classId,
                        customStartDate,
                        customEndDate
                    );
                }

                setReportData(report);
            } catch (err) {
                console.error('Gagal memuat rekap:', err);
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, [filterMode, selectedYear, selectedMonth, customStartDate, customEndDate, router]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.replace('/login');
    };

    // Fungsi untuk memicu jendela cetak browser
    const handlePrint = () => {
        window.print();
    };

    // Filter pencarian nama siswa
    const filteredReport = reportData.filter((item) =>
        item.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.nis.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Daftar nama bulan untuk dropdown
    const months = [
        { value: 1, label: 'Januari' },
        { value: 2, label: 'Februari' },
        { value: 3, label: 'Maret' },
        { value: 4, label: 'April' },
        { value: 5, label: 'Mei' },
        { value: 6, label: 'Juni' },
        { value: 7, label: 'Juli' },
        { value: 8, label: 'Agustus' },
        { value: 9, label: 'September' },
        { value: 10, label: 'Oktober' },
        { value: 11, label: 'November' },
        { value: 12, label: 'Desember' },
    ];

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans">
                <p className="text-sm font-medium text-slate-500 animate-pulse">Memuat rekapitulasi bulanan...</p>
            </div>
        );
    }

    // Fungsi untuk mendownload rekap ke format CSV (Excel-friendly)
    const handleExportCSV = () => {
        if (!filteredReport || filteredReport.length === 0) {
            alert('Tidak ada data rekap untuk diexport.');
            return;
        }

        // Header CSV dengan kolom persentase lengkap
        let csvContent = 'data:text/csv;charset=utf-8,\uFEFF';
        csvContent += 'NIS,Nama Lengkap,Gender,Hadir (H),Sakit (S),Izin (I),Alpa (A),Total Data,Hadir (%),Sakit (%),Izin (%),Alpa (%)\n';

        // Baris Data Siswa
        filteredReport.forEach((row) => {
            const total = row.total_presence;
            const hPct = total > 0 ? Math.round((row.total_h / total) * 100) + '%' : '0%';
            const sPct = total > 0 ? Math.round((row.total_s / total) * 100) + '%' : '0%';
            const iPct = total > 0 ? Math.round((row.total_i / total) * 100) + '%' : '0%';
            const aPct = total > 0 ? Math.round((row.total_a / total) * 100) + '%' : '0%';

            const line = [
                `"${row.nis}"`,
                `"${row.full_name}"`,
                `"${row.gender || 'L'}"`,
                row.total_h,
                row.total_s,
                row.total_i,
                row.total_a,
                total,
                `"${hPct}"`,
                `"${sPct}"`,
                `"${iPct}"`,
                `"${aPct}"`
            ].join(',');
            csvContent += line + '\n';
        });

        // Hitung baris ringkasan bawah
        const totalSiswa = filteredReport.length;
        const totalLaki = filteredReport.filter(s => (s.gender || 'L') === 'L').length;
        const totalPerempuan = filteredReport.filter(s => s.gender === 'P').length;

        // Tambahkan baris kosong dan rekapitulasi di bawah
        csvContent += '\n';
        csvContent += `,"Total Siswa",${totalSiswa}\n`;
        csvContent += `,"Jumlah Siswa Laki-Laki",${totalLaki}\n`;
        csvContent += `,"Jumlah Siswa Perempuan",${totalPerempuan}\n`;

        // Buat link unduhan virtual dan trigger klik
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `Rekap_Absensi_Bulan_${selectedMonth}_${selectedYear}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col">
            <div className="sticky top-0 z-30 bg-slate-50 shadow-sm">
                <Header
                    schoolName={sessionData.schoolName}
                    className={sessionData.className}
                    teacherName={sessionData.teacherName}
                    onLogout={handleLogout}
                />

                <div className="px-4 pt-2.5 pb-2 max-w-md mx-auto space-y-2">
                    {/* Filter Periode (Bulanan / Kustom) */}
                    <div className="app-card p-3 bg-white shadow-sm space-y-2 print:hidden">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-slate-700">Periode Rekap</span>
                            </div>

                            {/* Tombol Toggle Mode */}
                            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                                <button
                                    onClick={() => setFilterMode('monthly')}
                                    className={`px-2 py-1 text-[10px] font-bold rounded-md transition ${filterMode === 'monthly' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                                >
                                    Bulanan
                                </button>
                                <button
                                    onClick={() => setFilterMode('custom')}
                                    className={`px-2 py-1 text-[10px] font-bold rounded-md transition ${filterMode === 'custom' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                                >
                                    Kustom
                                </button>
                            </div>
                        </div>

                        {filterMode === 'monthly' ? (
                            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                                <span className="text-[11px] text-slate-500">Pilih Bulan & Tahun</span>
                                <div className="flex items-center gap-1.5">
                                    <select
                                        value={selectedMonth}
                                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                        className="bg-slate-100 text-slate-700 text-xs font-semibold px-2 py-1 rounded-lg border border-slate-200 focus:outline-none"
                                    >
                                        {months.map((m) => (
                                            <option key={m.value} value={m.value}>{m.label}</option>
                                        ))}
                                    </select>
                                    <select
                                        value={selectedYear}
                                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                                        className="bg-slate-100 text-slate-700 text-xs font-semibold px-2 py-1 rounded-lg border border-slate-200 focus:outline-none"
                                    >
                                        {[2025, 2026, 2027].map((y) => (
                                            <option key={y} value={y}>{y}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2 pt-1 border-t border-slate-100">
                                <div className="flex items-center justify-between gap-1">
                                    <input
                                        type="date"
                                        value={tempStartDate}
                                        onChange={(e) => setTempStartDate(e.target.value)}
                                        className="bg-slate-100 text-slate-700 text-[10px] font-semibold px-2 py-1 rounded-lg border border-slate-200 focus:outline-none flex-1"
                                    />
                                    <span className="text-slate-400 text-xs">s/d</span>
                                    <input
                                        type="date"
                                        value={tempEndDate}
                                        onChange={(e) => setTempEndDate(e.target.value)}
                                        className="bg-slate-100 text-slate-700 text-[10px] font-semibold px-2 py-1 rounded-lg border border-slate-200 focus:outline-none flex-1"
                                    />
                                </div>
                                <button
                                    onClick={() => {
                                        setCustomStartDate(tempStartDate);
                                        setCustomEndDate(tempEndDate);
                                    }}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition shadow-sm"
                                >
                                    Terapkan Rentang Tanggal
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={handleExportCSV}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-xl text-xs transition shadow-sm flex items-center justify-center gap-1.5"
                        >
                            <span>📊</span> Export Excel
                        </button>
                        <button
                            onClick={handlePrint}
                            className="flex-1 bg-slate-700 hover:bg-slate-800 text-white font-bold py-2 px-3 rounded-xl text-xs transition shadow-sm flex items-center justify-center gap-1.5"
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
                            className="w-full bg-white px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                        />
                    </div>
                    {/* Teks Informasi Periode - Hanya Muncul Saat Dicetak */}
                    <div className="hidden print:block mb-4 text-center border-b border-slate-300 pb-3">
                        <h1 className="text-base font-bold text-slate-900">REKAPITULASI KEHADIRAN SISWA</h1>
                        <p className="text-xs text-slate-700 mt-0.5">
                            {sessionData.schoolName} - {sessionData.className}
                        </p>
                        <p className="text-xs font-semibold text-slate-800 mt-1">
                            Periode: {filterMode === 'monthly'
                                ? `${months.find(m => m.value === selectedMonth)?.label} ${selectedYear}`
                                : `${customStartDate} s/d ${customEndDate}`
                            }
                        </p>
                    </div>
                    <div className="flex justify-between items-center px-1 pt-0.5">
                        <h2 className="font-bold text-[11px] uppercase tracking-wider text-slate-500">
                            Akumulasi Kehadiran Kelas
                        </h2>
                        <span className="text-[11px] text-slate-400">{filteredReport.length} Siswa</span>
                    </div>
                </div>
            </div>

            <main className="px-4 py-2 max-w-md mx-auto w-full space-y-2 flex-1 pb-28">
                {filteredReport.length === 0 ? (
                    <div className="app-card p-8 bg-white text-center space-y-2 mt-4">
                        <span className="text-3xl">📭</span>
                        <h3 className="font-bold text-xs text-slate-700">Belum Ada Data Rekap</h3>
                        <p className="text-[10px] text-slate-400">
                            Belum ada catatan absensi yang tersimpan pada bulan {months.find(m => m.value === selectedMonth)?.label} {selectedYear}.
                        </p>
                    </div>
                ) : (
                    filteredReport.map((item, index) => {
                        // Hitung persentase kehadiran riil per siswa
                        const total = item.total_presence;
                        const percentage = total > 0 ? Math.round((item.total_h / total) * 100) : 0;

                        // Tentukan warna progress bar berdasarkan persentase
                        let barColor = 'bg-emerald-500';
                        let textColor = 'text-emerald-700';
                        let badgeBg = 'bg-emerald-50 border-emerald-200';

                        if (percentage < 60) {
                            barColor = 'bg-rose-500';
                            textColor = 'text-rose-700';
                            badgeBg = 'bg-rose-50 border-rose-200';
                        } else if (percentage < 80) {
                            barColor = 'bg-amber-500';
                            textColor = 'text-amber-700';
                            badgeBg = 'bg-amber-50 border-amber-200';
                        }

                        return (
                            <div key={item.student_id} className="app-card p-3 bg-white space-y-2.5 transition hover:border-blue-300">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[9px] font-bold text-slate-400">No. {index + 1}</span>
                                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${item.gender === 'P' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'}`}>
                                                {item.gender || 'L'}
                                            </span>
                                        </div>
                                        <h3 className="font-bold text-xs text-slate-800 leading-tight mt-0.5">{item.full_name}</h3>
                                        <span className="text-[10px] text-slate-400">NIS: {item.nis}</span>
                                    </div>

                                    {/* Badge Persentase Kehadiran Visual */}
                                    <div className={`px-2 py-1 rounded-xl border text-center ${badgeBg}`}>
                                        <span className="block text-[8px] uppercase font-bold text-slate-400">Kehadiran</span>
                                        <span className={`font-black text-xs ${textColor}`}>{percentage}%</span>
                                    </div>
                                </div>

                                {/* Progress Bar Visual */}
                                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                                        style={{ width: `${percentage}%` }}
                                    ></div>
                                </div>

                                {/* Badge Statistik Ringkas Per Siswa */}
                                <div className="grid grid-cols-4 gap-1 pt-1 border-t border-slate-100 text-center">
                                    <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-1">
                                        <span className="block text-[8px] uppercase font-bold text-emerald-600">Hadir</span>
                                        <span className="font-black text-xs text-emerald-700">{item.total_h}</span>
                                    </div>
                                    <div className="bg-amber-50 border border-amber-100 rounded-lg p-1">
                                        <span className="block text-[8px] uppercase font-bold text-amber-600">Sakit</span>
                                        <span className="font-black text-xs text-amber-700">{item.total_s}</span>
                                    </div>
                                    <div className="bg-sky-50 border border-sky-100 rounded-lg p-1">
                                        <span className="block text-[8px] uppercase font-bold text-sky-600">Izin</span>
                                        <span className="font-black text-xs text-sky-700">{item.total_i}</span>
                                    </div>
                                    <div className="bg-rose-50 border border-rose-100 rounded-lg p-1">
                                        <span className="block text-[8px] uppercase font-bold text-rose-600">Alpa</span>
                                        <span className="font-black text-xs text-rose-700">{item.total_a}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </main>

            <BottomNav />
        </div>
    );
}