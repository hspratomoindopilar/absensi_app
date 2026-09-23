// src/app/teacher/classes/[id]/attendance/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Student } from '@/types/database';
import {
  fetchStudentsByTenant,
  fetchAttendanceByDate,
  saveAttendanceRecords,
} from '@/services/attendanceService';
import { fetchTenantSettings, fetchSchoolHolidays } from '@/services/settingsService';
import BottomNav from '@/components/BottomNav';
import '@/style/admin-theme.css';

export default function ClassAttendancePage() {
  const params = useParams();
  const classId = params.id as string;
  const router = useRouter();

  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const todayString = new Date().toISOString().split('T')[0];
  const [tempDate, setTempDate] = useState(todayString);
  const [selectedDate, setSelectedDate] = useState(todayString);

  const [isAlreadySaved, setIsAlreadySaved] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

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
    className: 'Kelas Mawar',
  });

  useEffect(() => {
    const savedTheme = (localStorage.getItem('admin_active_theme') as 'light' | 'dark') || 'light';
    setTheme(savedTheme);
  }, []);

  useEffect(() => {
    async function loadAttendanceData() {
      try {
        setLoading(true);
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session || !session.user.email) {
          router.replace('/login');
          return;
        }

        const { data: userData } = await supabase
          .from('users')
          .select('user_id, tenant_id')
          .eq('email', session.user.email)
          .single();

        if (!userData) return;

        const { data: classData } = await supabase
          .from('classes')
          .select('class_name')
          .eq('class_id', classId)
          .single();

        const settings = await fetchTenantSettings(userData.tenant_id);
        const currentSchoolDays = settings.school_days;

        setSessionData({
          userId: userData.user_id,
          tenantId: userData.tenant_id,
          className: classData?.class_name || `Kelas ${classId}`,
        });

        const dateObj = new Date(selectedDate);
        const dayOfWeek = dateObj.getDay();
        const isSunday = dayOfWeek === 0;
        const isSaturdayOff = dayOfWeek === 6 && currentSchoolDays === 5;

        const holidays = await fetchSchoolHolidays(userData.tenant_id);
        const matchedHoliday = holidays.find(
          (h) => selectedDate >= h.start_date && selectedDate <= h.end_date
        );

        const isHoliday = !!matchedHoliday || isSunday || isSaturdayOff;
        let holidayName = matchedHoliday ? matchedHoliday.description : '';
        if (isSunday) holidayName = 'Hari Minggu (Libur)';
        if (isSaturdayOff) holidayName = 'Libur Akhir Pekan';

        setDayStatus({
          isHoliday,
          holidayName,
          isSunday,
          isSchoolDay: !isHoliday,
        });

        const dataSiswa = await fetchStudentsByTenant(userData.tenant_id, classId);
        const statusMap = await fetchAttendanceByDate(userData.tenant_id, classId, selectedDate);

        if (statusMap) {
          const mergedStudents = dataSiswa.map((s) => ({
            ...s,
            status: statusMap[s.student_id] || 'H',
          }));
          setStudents(mergedStudents);
          setIsAlreadySaved(true);
          setIsLocked(true);
        } else {
          setStudents(dataSiswa);
          setIsAlreadySaved(false);
          setIsLocked(isHoliday);
        }
      } catch (err) {
        console.error('Gagal memuat absensi:', err);
      } finally {
        setLoading(false);
      }
    }

    loadAttendanceData();
  }, [classId, selectedDate, router]);

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
    if (dayStatus.isHoliday) return 0;
    return students.filter((s) => s.status === status).length;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-sans bg-slate-900 text-white">
        <p className="text-sm font-medium animate-pulse">Memuat data absensi kelas...</p>
      </div>
    );
  }

  return (
    <div 
      className="admin-theme-root h-screen font-sans flex flex-col justify-between overflow-hidden transition-colors duration-300"
      data-theme={theme}
      style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}
    >
      {/* 1. BAGIAN STICKY ATAS (Header, Status, Ringkasan, Filter, & Tombol Simpan) */}
      <div className="sticky top-0 z-20 space-y-3 p-4 pb-2 shadow-sm" style={{ backgroundColor: 'var(--bg-main)' }}>
        
        {/* Header Kecil & Tombol Kembali */}
        <div className="flex justify-between items-center max-w-md mx-auto w-full">
          <button
            onClick={() => router.push(`/teacher/classes/${classId}`)}
            className="text-xs font-bold px-3 py-1.5 rounded-xl border shadow-sm transition flex items-center gap-1 cursor-pointer"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)', color: 'var(--text-main)' }}
          >
            ← Kembali ke Kelas
          </button>
          <h1 className="text-xs font-black uppercase tracking-wider opacity-80">Absensi {sessionData.className}</h1>
        </div>

        <div className="max-w-md mx-auto w-full space-y-2">
          {/* Banner Hari Libur / Status Terkunci */}
          {dayStatus.isHoliday ? (
            <div className="p-2.5 rounded-xl border bg-amber-500/15 border-amber-500/30 text-amber-500 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>🏖️</span>
                <div>
                  <p className="font-bold leading-tight">Hari Libur Terdeteksi</p>
                  <p className="text-[10px] opacity-90">{dayStatus.holidayName}</p>
                </div>
              </div>
              <span className="text-[9px] bg-amber-500/20 font-bold px-2 py-0.5 rounded-lg">Libur</span>
            </div>
          ) : (
            isAlreadySaved && (
              <div className={`p-2 rounded-xl border text-xs flex items-center justify-between shadow-sm ${isLocked ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-500' : 'bg-amber-500/15 border-amber-500/30 text-amber-500'}`}>
                <div className="flex items-center gap-2">
                  <span>{isLocked ? '🔒' : '✏️'}</span>
                  <div>
                    <p className="font-bold leading-tight">{isLocked ? `Absensi Tanggal ${selectedDate} Tersimpan` : 'Mode Edit Aktif'}</p>
                  </div>
                </div>
                {isLocked && (
                  <button
                    onClick={() => setIsLocked(false)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2 py-0.5 rounded-lg text-[10px] cursor-pointer"
                  >
                    Ubah
                  </button>
                )}
              </div>
            )
          )}

          {successMessage && (
            <div className="p-2 bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 text-xs font-medium rounded-xl text-center">
              ✨ {successMessage}
            </div>
          )}

          {/* Statistik & Date Picker */}
          <div 
            className="p-3 rounded-2xl border shadow-sm space-y-2"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)' }}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-semibold opacity-70 uppercase tracking-wider">
                {statusFilter === 'ALL' ? 'Ringkasan Kehadiran' : `Filter: ${statusFilter}`}
              </span>

              <div className="flex items-center gap-1">
                <span className="text-[10px]">📅</span>
                <input
                  type="date"
                  value={tempDate}
                  onChange={(e) => setTempDate(e.target.value)}
                  className="bg-slate-500/10 text-[10px] font-semibold px-2 py-0.5 rounded-lg border border-slate-500/20 focus:outline-none"
                  style={{ color: 'var(--text-main)' }}
                />
                <button
                  onClick={() => setSelectedDate(tempDate)}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-lg cursor-pointer shadow-sm"
                >
                  Pilih
                </button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-1.5 text-center">
              {['H', 'S', 'I', 'A'].map((st) => {
                const labels: Record<string, string> = { H: 'Hadir', S: 'Sakit', I: 'Izin', A: 'Alpa' };
                const isSelected = statusFilter === st;
                return (
                  <div
                    key={st}
                    onClick={() => setStatusFilter(statusFilter === st ? 'ALL' : st)}
                    className={`p-1.5 rounded-xl border cursor-pointer transition ${isSelected ? 'bg-blue-600 text-white ring-2 ring-blue-300' : 'opacity-80 hover:opacity-100'}`}
                    style={{ backgroundColor: isSelected ? undefined : 'var(--bg-main)', borderColor: 'var(--border-theme)' }}
                  >
                    <span className="block text-[8px] uppercase font-bold">{labels[st]}</span>
                    <span className="font-black text-sm">{countStatus(st)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Input Pencarian */}
          <div>
            <input
              type="text"
              placeholder="🔍 Cari nama siswa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={dayStatus.isHoliday}
              className="w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm disabled:opacity-60"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)', color: 'var(--text-main)' }}
            />
          </div>

          {/* Tombol Simpan (Ikut Sticky di Atas Area Scroll Siswa) */}
          {!dayStatus.isHoliday && (
            <div>
              <button
                onClick={handleSaveAttendance}
                disabled={saving || students.length === 0 || isLocked}
                className={`w-full font-bold py-2.5 px-4 rounded-xl shadow-md transition text-xs tracking-wide flex items-center justify-center gap-2 cursor-pointer ${
                  isLocked
                    ? 'bg-slate-500/20 text-slate-400 cursor-not-allowed shadow-none'
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
                  <span>💾 Simpan Perubahan Absensi</span>
                )}
              </button>
            </div>
          )}

          <div className="flex justify-between items-center px-1 pt-1">
            <h2 className="font-bold text-[11px] uppercase tracking-wider opacity-70">
              Daftar Siswa ({filteredStudents.length})
            </h2>
            {statusFilter !== 'ALL' && (
              <button
                onClick={() => setStatusFilter('ALL')}
                className="text-[9px] bg-slate-500/20 px-2 py-0.5 rounded font-bold cursor-pointer"
              >
                Reset Filter
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. AREA SCROLL KHUSUS SISWA (Bisa digeser mandiri di tengah) */}
      <div className="flex-1 overflow-y-auto px-4 pb-20 max-w-md mx-auto w-full space-y-2">
        {dayStatus.isHoliday ? (
          <div className="p-8 text-center space-y-2 rounded-2xl border shadow-md mt-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)' }}>
            <span className="text-3xl">☕</span>
            <h3 className="font-bold text-xs">Absensi Ditiadakan Hari Ini</h3>
            <p className="text-[10px] opacity-70 leading-relaxed">
              Tanggal terpilih adalah hari libur (<span className="font-semibold">{dayStatus.holidayName}</span>).
            </p>
          </div>
        ) : (
          filteredStudents.map((student, index) => (
            <div 
              key={student.student_id} 
              className="p-3 rounded-2xl border shadow-sm flex items-center justify-between transition"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)' }}
            >
              <div className="pr-2">
                <span className="text-[9px] font-bold opacity-50">No. {index + 1}</span>
                <h3 className="font-bold text-xs leading-tight">{student.full_name}</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] opacity-60">NIS: {student.nis || '-'}</span>
                  <span className="opacity-30">•</span>
                  <span className={`text-[9px] px-1 rounded font-bold ${student.gender === 'P' ? 'bg-pink-500/20 text-pink-500' : 'bg-blue-500/20 text-blue-500'}`}>
                    {student.gender === 'P' ? 'P' : 'L'}
                  </span>
                </div>
              </div>

              {/* Tombol Pilihan Status (H, S, I, A) */}
              <div className="flex gap-1 shrink-0">
                {['H', 'S', 'I', 'A'].map((st) => {
                  const isActive = student.status === st;
                  let activeColor = '';
                  if (st === 'H' && isActive) activeColor = 'bg-emerald-600 text-white ring-2 ring-emerald-300';
                  if (st === 'S' && isActive) activeColor = 'bg-amber-500 text-white ring-2 ring-amber-300';
                  if (st === 'I' && isActive) activeColor = 'bg-sky-500 text-white ring-2 ring-sky-300';
                  if (st === 'A' && isActive) activeColor = 'bg-rose-600 text-white ring-2 ring-rose-300';

                  return (
                    <button
                      key={st}
                      onClick={() => handleStatusChange(student.student_id, st)}
                      disabled={isLocked || dayStatus.isHoliday}
                      className={`w-7 h-7 rounded-lg font-bold text-[11px] transition flex items-center justify-center cursor-pointer ${
                        isActive ? activeColor : 'bg-slate-500/10 opacity-70 hover:opacity-100'
                      } ${isLocked || dayStatus.isHoliday ? 'cursor-not-allowed opacity-50' : ''}`}
                    >
                      {st}
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 3. BOTTOM NAV MENTOK DI BAWAH (Fixed) */}
      <BottomNav />
    </div>
  );
}