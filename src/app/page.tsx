'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Student } from '@/types/database';
import {
  fetchSchoolAndClassInfo,
  fetchStudentsByTenant,
  fetchAttendanceByDate,
  saveAttendanceRecords,

} from '@/services/attendanceService';
import { fetchTenantSettings, fetchSchoolHolidays } from '@/services/settingsService';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';

export default function TeacherAttendanceDashboard() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const todayString = new Date().toISOString().split('T')[0];
  
  // State sementara untuk input date picker agar tidak langsung menutup picker saat ganti bulan
  const [tempDate, setTempDate] = useState(todayString);
  
  // State final yang benar-benar memicu fetch data absensi
  const [selectedDate, setSelectedDate] = useState(todayString);

  const [isAlreadySaved, setIsAlreadySaved] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  // State validasi hari libur / minggu / efektif
  
  const [dayStatus, setDayStatus] = useState<{
    isHoliday: boolean;
    holidayName: string;
    isSunday: boolean;
    isSchoolDay: boolean;
  }>({
    isHoliday: false,
    holidayName: '',
    isSunday: false,
    isSchoolDay: true,
  });

  const [sessionData, setSessionData] = useState({
    userId: '',
    tenantId: '',
    classId: '',
    schoolName: 'Memuat Sekolah...',
    className: 'Memuat Kelas...',
    teacherName: 'Guru / Admin',
  });

  const router = useRouter();

  // useEffect tunggal untuk inisialisasi sesi DAN perubahan tanggal
  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session || !session.user.email) {
          router.replace('/login');
          return;
        }

        // Ambil info sekolah & kelas jika belum ada
        let currentTenantId = sessionData.tenantId;
        let currentClassId = sessionData.classId;
        let currentSchoolDays = 5;

        if (!currentTenantId) {
          const info = await fetchSchoolAndClassInfo(session.user.email);
          if (!info || !info.tenantId || !info.classId || !info.userId) {
            setLoading(false);
            return;
          }

          currentTenantId = info.tenantId;
          currentClassId = info.classId;

          const settings = await fetchTenantSettings(currentTenantId);
          currentSchoolDays = settings.school_days;

          setSessionData({
            userId: info.userId,
            tenantId: info.tenantId,
            classId: info.classId,
            schoolName: info.schoolName,
            className: info.className,
            teacherName: info.teacherName,
          });
        } else {
          const settings = await fetchTenantSettings(currentTenantId);
          currentSchoolDays = settings.school_days;
        }

        // --- VALIDASI HARI LIBUR & HARI MINGGU ---
        const dateObj = new Date(selectedDate);
        const dayOfWeek = dateObj.getDay(); // 0 = Minggu, 6 = Sabtu
        const isSunday = dayOfWeek === 0;

        // Cek apakah hari Sabtu tapi sekolahnya 5 hari (Senin-Jumat)
        const isSaturdayOff = dayOfWeek === 6 && currentSchoolDays === 5;

        // Cek apakah tanggal terpilih masuk dalam tabel school_holidays
        const holidays = await fetchSchoolHolidays(currentTenantId);
        const matchedHoliday = holidays.find(
          (h) => selectedDate >= h.start_date && selectedDate <= h.end_date
        );

        const isHoliday = !!matchedHoliday || isSunday || isSaturdayOff;
        let holidayName = matchedHoliday ? matchedHoliday.description : '';
        if (isSunday) holidayName = 'Hari Minggu (Libur)';
        if (isSaturdayOff) holidayName = 'Libur Akhir Pekan (Sistem 5 Hari Sekolah)';

        setDayStatus({
          isHoliday,
          holidayName,
          isSunday,
          isSchoolDay: !isHoliday,
        });

        // 1. Ambil data siswa dasar
        const dataSiswa = await fetchStudentsByTenant(currentTenantId, currentClassId);

        // 2. Ambil data absensi berdasarkan tanggal yang dipilih di date picker
        const statusMap = await fetchAttendanceByDate(currentTenantId, currentClassId, selectedDate);

        if (statusMap) {
          const mergedStudents = dataSiswa.map((s) => ({
            ...s,
            status: statusMap[s.student_id] || 'H',
          }));
          setStudents(mergedStudents);
          setIsAlreadySaved(true);
          setIsLocked(true); // Kunci jika sudah ada di tanggal tersebut
        } else {
          setStudents(dataSiswa);
          setIsAlreadySaved(false);
          setIsLocked(isHoliday); // Kunci otomatis jika hari libur
        }
      } catch (err) {
        console.error('Gagal memuat data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [selectedDate, router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  const handleStatusChange = (studentId: string, status: string) => {
    if (isLocked || dayStatus.isHoliday) return;
    setStudents((prev) =>
      prev.map((s) => (s.student_id === studentId ? { ...s, status } : s))
    );
  };

  const handleSaveAttendance = async () => {
    if (!sessionData.tenantId || !sessionData.userId || dayStatus.isHoliday) return;

    try {
      setSaving(true);
      setSuccessMessage('');

      await saveAttendanceRecords(sessionData.tenantId, students, sessionData.userId, selectedDate);

      setIsAlreadySaved(true);
      setIsLocked(true);
      setSuccessMessage(`Berhasil! Absensi tanggal ${selectedDate} disimpan.`);
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) {
      alert('Gagal menyimpan absensi: ' + (err.message || 'Terjadi kesalahan sistem'));
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = students.filter((s) => {
    const matchesSearch = s.full_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const countStatus = (status: string) => {
    if (dayStatus.isHoliday) return 0; // Jika libur, paksa jadi 0
    return students.filter((s) => s.status === status).length;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans">
        <p className="text-sm font-medium text-slate-500 animate-pulse">Memuat data multi-tenant & kalender...</p>
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
          {/* BANNER NOTIFIKASI HARI LIBUR / EFEKTIF */}
          {dayStatus.isHoliday ? (
            <div className="p-3 rounded-xl border bg-amber-50 border-amber-200 text-amber-800 text-xs shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">🏖️</span>
                <div>
                  <p className="font-bold leading-tight">Hari Libur Terdeteksi</p>
                  <p className="text-[10px] opacity-90 mt-0.5">{dayStatus.holidayName}</p>
                </div>
              </div>
              <span className="text-[9px] bg-amber-200/60 font-bold px-2 py-1 rounded-lg">Libur</span>
            </div>
          ) : (
            isAlreadySaved && (
              <div className={`p-2.5 rounded-xl border text-xs flex items-center justify-between shadow-sm transition ${isLocked ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}>
                <div className="flex items-center gap-2">
                  <span>{isLocked ? '🔒' : '✏️'}</span>
                  <div>
                    <p className="font-bold leading-tight">{isLocked ? `Absensi Tanggal ${selectedDate} Tersimpan` : 'Mode Edit Aktif'}</p>
                    <p className="text-[10px] opacity-80">{isLocked ? 'Data terkunci.' : 'Silakan koreksi & simpan.'}</p>
                  </div>
                </div>
                {isLocked && (
                  <button
                    onClick={() => setIsLocked(false)}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-2.5 py-1 rounded-lg text-[11px] transition shadow-sm"
                  >
                    Ubah
                  </button>
                )}
              </div>
            )
          )}

          {successMessage && (
            <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium rounded-xl shadow-sm text-center">
              ✨ {successMessage}
            </div>
          )}

          {/* Statistik & Date Picker */}
          <div className="app-card p-2.5 bg-white shadow-sm">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                {statusFilter === 'ALL' ? 'Ringkasan Absensi' : `Filter: ${statusFilter}`}
              </span>

              <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-400">📅</span>
                <input
                  type="date"
                  value={tempDate}
                  onChange={(e) => setTempDate(e.target.value)}
                  className="bg-slate-100 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  onClick={() => setSelectedDate(tempDate)}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-lg transition shadow-sm"
                >
                  Pilih
                </button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-1.5 text-center">
              <div
                onClick={() => setStatusFilter(statusFilter === 'H' ? 'ALL' : 'H')}
                className={`p-1.5 rounded-lg border cursor-pointer transition ${statusFilter === 'H' ? 'bg-emerald-600 text-white ring-2 ring-emerald-300' : 'bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-100'}`}
              >
                <span className={`block text-[8px] uppercase font-bold ${statusFilter === 'H' ? 'text-white' : 'text-emerald-600'}`}>Hadir</span>
                <span className="font-black text-sm">{countStatus('H')}</span>
              </div>

              <div
                onClick={() => setStatusFilter(statusFilter === 'S' ? 'ALL' : 'S')}
                className={`p-1.5 rounded-lg border cursor-pointer transition ${statusFilter === 'S' ? 'bg-amber-500 text-white ring-2 ring-amber-300' : 'bg-amber-50 border-amber-100 text-amber-700 hover:bg-amber-100'}`}
              >
                <span className={`block text-[8px] uppercase font-bold ${statusFilter === 'S' ? 'text-white' : 'text-amber-600'}`}>Sakit</span>
                <span className="font-black text-sm">{countStatus('S')}</span>
              </div>

              <div
                onClick={() => setStatusFilter(statusFilter === 'I' ? 'ALL' : 'I')}
                className={`p-1.5 rounded-lg border cursor-pointer transition ${statusFilter === 'I' ? 'bg-sky-500 text-white ring-2 ring-sky-300' : 'bg-sky-50 border-sky-100 text-sky-700 hover:bg-sky-100'}`}
              >
                <span className={`block text-[8px] uppercase font-bold ${statusFilter === 'I' ? 'text-white' : 'text-sky-600'}`}>Izin</span>
                <span className="font-black text-sm">{countStatus('I')}</span>
              </div>

              <div
                onClick={() => setStatusFilter(statusFilter === 'A' ? 'ALL' : 'A')}
                className={`p-1.5 rounded-lg border cursor-pointer transition ${statusFilter === 'A' ? 'bg-rose-600 text-white ring-2 ring-rose-300' : 'bg-rose-50 border-rose-100 text-rose-700 hover:bg-rose-100'}`}
              >
                <span className={`block text-[8px] uppercase font-bold ${statusFilter === 'A' ? 'text-white' : 'text-rose-600'}`}>Alpa</span>
                <span className="font-black text-sm">{countStatus('A')}</span>
              </div>
            </div>
          </div>

          <div>
            <input
              type="text"
              placeholder="🔍 Cari nama siswa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={dayStatus.isHoliday}
              className="w-full bg-white px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm disabled:bg-slate-100 disabled:opacity-60"
            />
          </div>

          <div className="flex justify-between items-center px-1 pt-0.5">
            <h2 className="font-bold text-[11px] uppercase tracking-wider text-slate-500">
              {statusFilter === 'ALL' ? `Daftar Siswa ${sessionData.className}` : `Filter: Status [${statusFilter}]`}
            </h2>
            <div className="flex items-center gap-2">
              {statusFilter !== 'ALL' && (
                <button
                  onClick={() => setStatusFilter('ALL')}
                  className="text-[9px] bg-slate-200 hover:bg-slate-300 text-slate-700 px-1.5 py-0.5 rounded font-bold transition"
                >
                  Reset All
                </button>
              )}
              <span className="text-[11px] text-slate-400">{filteredStudents.length} Siswa</span>
            </div>
          </div>
        </div>
      </div>

      <main className="px-4 py-2 max-w-md mx-auto w-full space-y-2 flex-1 pb-28">
        {dayStatus.isHoliday ? (
          <div className="app-card p-8 bg-white text-center space-y-3 mt-4">
            <span className="text-3xl">☕</span>
            <h3 className="font-bold text-xs text-slate-700">Absensi Ditiadakan Hari Ini</h3>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Tanggal yang Anda pilih adalah hari libur (<span className="font-semibold text-slate-600">{dayStatus.holidayName}</span>). Sistem mengunci absensi agar tidak memengaruhi rekapitulasi kehadiran.
            </p>
          </div>
        ) : (
          filteredStudents.map((student, index) => (
            <div key={student.student_id} className="app-card p-2.5 bg-white flex items-center justify-between transition hover:border-blue-300">
              <div className="pr-2">
                <span className="text-[9px] font-bold text-slate-400">No. {index + 1}</span>
                <h3 className="font-bold text-xs text-slate-800 leading-tight">{student.full_name}</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] text-slate-400">NIS: {student.nis || '-'}</span>
                  <span className="text-slate-300">•</span>
                  <span className={`text-[9px] px-1 rounded font-bold ${student.gender === 'P' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'}`}>
                    {student.gender === 'P' ? 'Perempuan' : 'Laki-laki'}
                  </span>
                </div>
              </div>

              <div className="flex gap-1 shrink-0">
                {['H', 'S', 'I', 'A'].map((st) => {
                  const isActive = student.status === st;
                  let activeClass = '';
                  if (st === 'H') activeClass = 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-300';
                  if (st === 'S') activeClass = 'bg-amber-500 text-white shadow-sm ring-1 ring-amber-300';
                  if (st === 'I') activeClass = 'bg-sky-500 text-white shadow-sm ring-1 ring-sky-300';
                  if (st === 'A') activeClass = 'bg-rose-600 text-white shadow-sm ring-1 ring-rose-300';

                  return (
                    <button
                      key={st}
                      onClick={() => handleStatusChange(student.student_id, st)}
                      disabled={isLocked || dayStatus.isHoliday}
                      className={`w-7 h-7 rounded-lg font-bold text-[11px] transition flex items-center justify-center ${isActive ? activeClass : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        } ${isLocked || dayStatus.isHoliday ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                      {st}
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </main>

      {!dayStatus.isHoliday && (
        <div className="fixed bottom-14 left-0 right-0 px-4 max-w-md mx-auto z-30">
          <button
            onClick={handleSaveAttendance}
            disabled={saving || students.length === 0 || isLocked}
            className={`w-full font-bold py-3 px-4 rounded-xl shadow-lg transition text-xs tracking-wide flex items-center justify-center gap-2 ${isLocked
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
              : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white'
              }`}
          >
            {saving ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>Menyimpan...</span>
              </>
            ) : isLocked ? (
              <span>🔒 Absensi Terkunci (Klik "Ubah" di atas)</span>
            ) : (
              <>
                <span>💾 Simpan Perubahan Absensi</span>
              </>
            )}
          </button>
        </div>
      )}

      <BottomNav />
    </div>
  );
}