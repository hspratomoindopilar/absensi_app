'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { fetchSchoolAndClassInfo } from '@/services/attendanceService';
import { fetchMonthlyAttendanceReport, MonthlyAttendanceSummary } from '@/services/rekapService';
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

  const router = useRouter();

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

        // Ambil data rekap bulanan
        const report = await fetchMonthlyAttendanceReport(
          info.tenantId,
          info.classId,
          selectedYear,
          selectedMonth
        );

        setReportData(report);
      } catch (err) {
        console.error('Gagal memuat rekap:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [selectedYear, selectedMonth, router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
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
          {/* Filter Periode (Bulan & Tahun) */}
          <div className="app-card p-3 bg-white shadow-sm flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-1">
              <span className="text-sm">📈</span>
              <span className="text-xs font-bold text-slate-700">Periode Rekap</span>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Dropdown Bulan */}
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-slate-100 text-slate-700 text-xs font-semibold px-2 py-1 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {months.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>

              {/* Dropdown Tahun */}
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-slate-100 text-slate-700 text-xs font-semibold px-2 py-1 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {[2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
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
          filteredReport.map((item, index) => (
            <div key={item.student_id} className="app-card p-3 bg-white space-y-2 transition hover:border-blue-300">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[9px] font-bold text-slate-400">No. {index + 1}</span>
                  <h3 className="font-bold text-xs text-slate-800 leading-tight">{item.full_name}</h3>
                  <span className="text-[10px] text-slate-400">NIS: {item.nis}</span>
                </div>
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
          ))
        )}
      </main>

      <BottomNav />
    </div>
  );
}