'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Student } from '@/types/database';
import { fetchSchoolAndClassInfo, fetchStudentsByTenant, saveAttendanceRecords } from '@/services/attendanceService';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';

export default function TeacherAttendanceDashboard() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
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

        const dataSiswa = await fetchStudentsByTenant(info.tenantId, info.classId);
        setStudents(dataSiswa);
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
    setStudents((prev) =>
      prev.map((s) => (s.student_id === studentId ? { ...s, status } : s))
    );
  };

  const handleSaveAttendance = async () => {
    if (!sessionData.tenantId || !sessionData.userId) return;

    try {
      setSaving(true);
      setSuccessMessage('');

      await saveAttendanceRecords(sessionData.tenantId, students, sessionData.userId);

      setSuccessMessage('Berhasil! Absensi hari ini telah disimpan ke database.');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) {
      alert('Gagal menyimpan absensi: ' + (err.message || 'Terjadi kesalahan sistem'));
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = students.filter((s) =>
    s.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

        <div className="p-4 max-w-md mx-auto space-y-3 pb-3">
          {/* Notifikasi Sukses */}
          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium rounded-xl shadow-sm text-center animate-bounce">
              ✅ {successMessage}
            </div>
          )}

          {/* Statistik Hari Ini */}
          <div className="app-card p-3.5 bg-white shadow-sm">
            <div className="flex justify-between items-center mb-2.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Status Hari Ini</span>
              <span className="text-[11px] bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full font-semibold">
                📅 {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-100">
                <span className="block text-[9px] uppercase font-bold text-emerald-600">Hadir</span>
                <span className="font-black text-emerald-700 text-base">{countStatus('H')}</span>
              </div>
              <div className="bg-amber-50 p-2 rounded-xl border border-amber-100">
                <span className="block text-[9px] uppercase font-bold text-amber-600">Sakit</span>
                <span className="font-black text-amber-700 text-base">{countStatus('S')}</span>
              </div>
              <div className="bg-sky-50 p-2 rounded-xl border border-sky-100">
                <span className="block text-[9px] uppercase font-bold text-sky-600">Izin</span>
                <span className="font-black text-sky-700 text-base">{countStatus('I')}</span>
              </div>
              <div className="bg-rose-50 p-2 rounded-xl border border-rose-100">
                <span className="block text-[9px] uppercase font-bold text-rose-600">Alpa</span>
                <span className="font-black text-rose-700 text-base">{countStatus('A')}</span>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div>
            <input
              type="text"
              placeholder="🔍 Cari nama siswa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
          </div>

          {/* Judul & Counter Daftar Siswa (Ikut Sticky di Bawah Search) */}
          <div className="flex justify-between items-center px-1 pt-1">
            <h2 className="font-bold text-xs uppercase tracking-wider text-slate-500">
              Daftar Siswa {sessionData.className}
            </h2>
            <span className="text-xs text-slate-400">{filteredStudents.length} Siswa</span>
          </div>
        </div>
      </div>
      {/* ================= END STICKY TOP ================= */}

      {/* ================= SCROLLABLE CONTENT (MURNI CARD SISWA) ================= */}
      <main className="p-4 max-w-md mx-auto w-full space-y-3 flex-1 pb-32">
        {filteredStudents.map((student, index) => (
          <div key={student.student_id} className="app-card p-3.5 bg-white flex items-center justify-between transition hover:border-blue-300">
            <div className="pr-2">
              <span className="text-[10px] font-bold text-slate-400">No. {index + 1}</span>
              <h3 className="font-bold text-sm text-slate-800 leading-tight">{student.full_name}</h3>
              <span className="text-[11px] text-slate-400">NIS: {student.nis || '-'}</span>
            </div>

            {/* Status Buttons */}
            <div className="flex gap-1.5 shrink-0">
              {['H', 'S', 'I', 'A'].map((st) => {
                const isActive = student.status === st;
                let activeClass = '';
                if (st === 'H') activeClass = 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-300';
                if (st === 'S') activeClass = 'bg-amber-500 text-white shadow-md ring-2 ring-amber-300';
                if (st === 'I') activeClass = 'bg-sky-500 text-white shadow-md ring-2 ring-sky-300';
                if (st === 'A') activeClass = 'bg-rose-600 text-white shadow-md ring-2 ring-rose-300';

                return (
                  <button
                    key={st}
                    onClick={() => handleStatusChange(student.student_id, st)}
                    className={`w-9 h-9 rounded-xl font-bold text-xs transition flex items-center justify-center ${
                      isActive ? activeClass : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
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
      <div className="fixed bottom-16 left-0 right-0 px-4 max-w-md mx-auto z-30">
        <button
          onClick={handleSaveAttendance}
          disabled={saving || students.length === 0}
          className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold py-3.5 px-4 rounded-2xl shadow-xl transition disabled:opacity-50 text-sm tracking-wide flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>Menyimpan ke Database...</span>
            </>
          ) : (
            <>
              <span>💾 Simpan Absensi Hari Ini</span>
            </>
          )}
        </button>
      </div>

      <BottomNav />
    </div>
  );
}