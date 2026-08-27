'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Student } from '@/types/database';
import { fetchSchoolAndClassInfo, fetchStudentsByTenant, fetchTodayAttendance, saveAttendanceRecords } from '@/services/attendanceService';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';

export default function TeacherAttendanceDashboard() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL'); // 'ALL', 'H', 'S', 'I', 'A'
  const todayString = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayString);

  // State tambahan untuk kontrol status simpan & edit
  const [isAlreadySaved, setIsAlreadySaved] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  // State untuk info session & tenant
  const [sessionData, setSessionData] = useState({
    userId: '',
    tenantId: '',
    classId: '',
    schoolName: 'Memuat Sekolah...',
    className: 'Memuat Kelas...',
    teacherName: 'Guru / Admin',
  });

  const router = useRouter();

  useEffect(() => {
    async function initDashboard() {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session || !session.user.email) {
          router.replace('/login');
          return;
        }

        const info = await fetchSchoolAndClassInfo(session.user.email);

        if (!info || !info.tenantId || !info.classId || !info.userId) {
          console.error('Data tenant, kelas, atau user tidak ditemukan.');
          return;
        }

        setSessionData({
          userId: info.userId,
          tenantId: info.tenantId,
          classId: info.classId,
          schoolName: info.schoolName,
          className: info.className,
          teacherName: info.teacherName,
        });

        // 1. Ambil data siswa dasar
        const dataSiswa = await fetchStudentsByTenant(info.tenantId, info.classId);

        // 2. Cek apakah absensi hari ini sudah pernah disimpan di database
        const todayStatusMap = await fetchTodayAttendance(info.tenantId, info.classId);

        if (todayStatusMap) {
          // Jika sudah ada, gabungkan statusnya dan kunci form secara default
          const mergedStudents = dataSiswa.map((s) => ({
            ...s,
            status: todayStatusMap[s.student_id] || 'H',
          }));
          setStudents(mergedStudents);
          setIsAlreadySaved(true);
          setIsLocked(true);
        } else {
          setStudents(dataSiswa);
          setIsAlreadySaved(false);
          setIsLocked(false);
        }
      } catch (err) {
        console.error('Gagal memuat dashboard:', err);
      } finally {
        setLoading(false);
      }
    }

    initDashboard();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  const handleStatusChange = (studentId: string, status: string) => {
    if (isLocked) return; // Abaikan perubahan jika form sedang dikunci
    setStudents((prev) =>
      prev.map((s) => (s.student_id === studentId ? { ...s, status } : s))
    );
  };

  const handleSaveAttendance = async () => {
    if (!sessionData.tenantId || !sessionData.userId) return;

    try {
      setSaving(true);
      setSuccessMessage('');

      await saveAttendanceRecords(sessionData.tenantId, students, sessionData.userId, selectedDate);

      setIsAlreadySaved(true);
      setIsLocked(true); // Kunci kembali form setelah berhasil simpan
      setSuccessMessage('Berhasil! Absensi hari ini telah disimpan.');
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

  const countStatus = (status: string) =>
    students.filter((s) => s.status === status).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans">
        <p className="text-sm font-medium text-slate-500 animate-pulse">Memuat data multi-tenant...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col">
      {/* ================= STICKY TOP CONTAINER ================= */}
      <div className="sticky top-0 z-30 bg-slate-50 shadow-sm">
        <Header
          schoolName={sessionData.schoolName}
          className={sessionData.className}
          teacherName={sessionData.teacherName}
          onLogout={handleLogout}
        />

        <div className="px-4 pt-2.5 pb-2 max-w-md mx-auto space-y-2">
          {/* Banner Status Tersimpan & Tombol Ubah/Edit */}
          {isAlreadySaved && (
            <div className={`p-2.5 rounded-xl border text-xs flex items-center justify-between shadow-sm transition ${isLocked ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}>
              <div className="flex items-center gap-2">
                <span>{isLocked ? '🔒' : '🔓'}</span>
                <div>
                  <p className="font-bold leading-tight">{isLocked ? 'Absensi Hari Ini Tersimpan' : 'Mode Edit Aktif'}</p>
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
          )}

          {/* Notifikasi Sukses */}
          {successMessage && (
            <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium rounded-xl shadow-sm text-center">
              ✅ {successMessage}
            </div>
          )}

          {/* Statistik Hari Ini (Compact & Clickable Filter) */}
          {/* Statistik Hari Ini & Date Picker */}
          <div className="app-card p-2.5 bg-white shadow-sm">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                {statusFilter === 'ALL' ? 'Ringkasan Absensi' : `Filter: ${statusFilter}`}
              </span>
              
              {/* Date Picker Compact */}
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-400">📅</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-slate-100 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-1.5 text-center">
              {/* Hadir */}
              <div
                onClick={() => setStatusFilter(statusFilter === 'H' ? 'ALL' : 'H')}
                className={`p-1.5 rounded-lg border cursor-pointer transition ${statusFilter === 'H' ? 'bg-emerald-600 text-white ring-2 ring-emerald-300' : 'bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-100'
                  }`}
              >
                <span className={`block text-[8px] uppercase font-bold ${statusFilter === 'H' ? 'text-white' : 'text-emerald-600'}`}>Hadir</span>
                <span className="font-black text-sm">{countStatus('H')}</span>
              </div>

              {/* Sakit */}
              <div
                onClick={() => setStatusFilter(statusFilter === 'S' ? 'ALL' : 'S')}
                className={`p-1.5 rounded-lg border cursor-pointer transition ${statusFilter === 'S' ? 'bg-amber-500 text-white ring-2 ring-amber-300' : 'bg-amber-50 border-amber-100 text-amber-700 hover:bg-amber-100'
                  }`}
              >
                <span className={`block text-[8px] uppercase font-bold ${statusFilter === 'S' ? 'text-white' : 'text-amber-600'}`}>Sakit</span>
                <span className="font-black text-sm">{countStatus('S')}</span>
              </div>

              {/* Izin */}
              <div
                onClick={() => setStatusFilter(statusFilter === 'I' ? 'ALL' : 'I')}
                className={`p-1.5 rounded-lg border cursor-pointer transition ${statusFilter === 'I' ? 'bg-sky-500 text-white ring-2 ring-sky-300' : 'bg-sky-50 border-sky-100 text-sky-700 hover:bg-sky-100'
                  }`}
              >
                <span className={`block text-[8px] uppercase font-bold ${statusFilter === 'I' ? 'text-white' : 'text-sky-600'}`}>Izin</span>
                <span className="font-black text-sm">{countStatus('I')}</span>
              </div>

              {/* Alpa */}
              <div
                onClick={() => setStatusFilter(statusFilter === 'A' ? 'ALL' : 'A')}
                className={`p-1.5 rounded-lg border cursor-pointer transition ${statusFilter === 'A' ? 'bg-rose-600 text-white ring-2 ring-rose-300' : 'bg-rose-50 border-rose-100 text-rose-700 hover:bg-rose-100'
                  }`}
              >
                <span className={`block text-[8px] uppercase font-bold ${statusFilter === 'A' ? 'text-white' : 'text-rose-600'}`}>Alpa</span>
                <span className="font-black text-sm">{countStatus('A')}</span>
              </div>
            </div>
          </div>

          {/* Search Bar Compact */}
          <div>
            <input
              type="text"
              placeholder="🔍 Cari nama siswa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
          </div>

          {/* Judul & Counter Daftar Siswa */}
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
      {/* ================= END STICKY TOP ================= */}

      {/* ================= SCROLLABLE CONTENT (COMPACT CARDS) ================= */}
      <main className="px-4 py-2 max-w-md mx-auto w-full space-y-2 flex-1 pb-28">
        {filteredStudents.map((student, index) => (
          <div key={student.student_id} className="app-card p-2.5 bg-white flex items-center justify-between transition hover:border-blue-300">
            <div className="pr-2">
              <span className="text-[9px] font-bold text-slate-400">No. {index + 1}</span>
              <h3 className="font-bold text-xs text-slate-800 leading-tight">{student.full_name}</h3>
              <span className="text-[10px] text-slate-400">NIS: {student.nis || '-'}</span>
            </div>

            {/* Status Buttons Compact */}
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
                    disabled={isLocked}
                    className={`w-7 h-7 rounded-lg font-bold text-[11px] transition flex items-center justify-center ${isActive ? activeClass : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      } ${isLocked ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {st}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </main>

      {/* ================= FIXED BOTTOM BUTTON & NAV ================= */}
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

      <BottomNav />
    </div>
  );
}