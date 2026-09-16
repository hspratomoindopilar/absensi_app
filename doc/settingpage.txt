'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import {
  fetchSchoolAndClassInfo,
  fetchTenantSettings,
  updateTenantSchoolDays,
  fetchSchoolHolidays,
  addSchoolHoliday,
  deleteSchoolHoliday,
  fetchStudentsManagement,
  addSingleStudent,
  updateStudent,
  deleteStudent,
  bulkUpsertStudents
} from '@/services/settingsService';
import { SchoolHoliday, Student } from '@/types/database';
import BottomNav from '@/components/BottomNav';

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingHoliday, setSavingHoliday] = useState(false);

  const [tenantId, setTenantId] = useState('');
  const [classId, setClassId] = useState('');
  const [schoolDays, setSchoolDays] = useState<number>(5);

  // State untuk Toggle / Accordion Section
  const [openDays, setOpenDays] = useState(false);
  const [openStudents, setOpenStudents] = useState(true); // Default terbuka untuk manajemen siswa
  const [openHolidays, setOpenHolidays] = useState(false);

  // State untuk form input libur
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [holidays, setHolidays] = useState<SchoolHoliday[]>([]);

  // State untuk Manajemen Siswa
  const [students, setStudents] = useState<Student[]>([]);
  const [newNis, setNewNis] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [savingStudent, setSavingStudent] = useState(false);
  const [newGender, setNewGender] = useState<'L' | 'P'>('L');
  const [editGender, setEditGender] = useState<'L' | 'P'>('L');

  // State untuk Import Massal
  const [bulkText, setBulkText] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // State untuk Edit Siswa
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editNis, setEditNis] = useState('');
  const [editFullName, setEditFullName] = useState('');

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function loadSettingsData() {
      try {
        setLoading(true);
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session || !session.user.email) {
          router.replace('/login');
          return;
        }

        const info = await fetchSchoolAndClassInfo(session.user.email);
        if (!info || !info.tenantId || !info.classId) {
          router.replace('/login');
          return;
        }

        setTenantId(info.tenantId);
        setClassId(info.classId);

        const [settings, holidayList, studentList] = await Promise.all([
          fetchTenantSettings(info.tenantId),
          fetchSchoolHolidays(info.tenantId),
          fetchStudentsManagement(info.tenantId, info.classId)
        ]);

        setSchoolDays(settings.school_days);
        setHolidays(holidayList);
        setStudents(studentList);
      } catch (err: any) {
        console.error('Gagal memuat halaman setting:', err);
        setErrorMsg('Gagal memuat data konfigurasi.');
      } finally {
        setLoading(false);
      }
    }

    loadSettingsData();
  }, [router]);

  // Handler update tipe hari sekolah (5 atau 6 hari)
  const handleUpdateSchoolDays = async (days: number) => {
    try {
      setSavingSettings(true);
      setErrorMsg('');
      setSuccessMsg('');

      await updateTenantSchoolDays(tenantId, days);
      setSchoolDays(days);
      setSuccessMsg(`Berhasil mengubah sistem ke ${days === 5 ? '5 Hari Sekolah (Senin-Jumat)' : '6 Hari Sekolah (Senin-Sabtu)'}.`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg('Gagal menyimpan pengaturan: ' + err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  // Handler tambah hari libur
  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate || !description) {
      setErrorMsg('Semua field form libur harus diisi!');
      return;
    }

    if (startDate > endDate) {
      setErrorMsg('Tanggal mulai tidak boleh lebih besar dari tanggal selesai!');
      return;
    }

    try {
      setSavingHoliday(true);
      setErrorMsg('');
      setSuccessMsg('');

      await addSchoolHoliday(tenantId, startDate, endDate, description);
      const updatedHolidays = await fetchSchoolHolidays(tenantId);
      setHolidays(updatedHolidays);

      setStartDate('');
      setEndDate('');
      setDescription('');
      setSuccessMsg('Berhasil menambahkan kalender libur baru.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg('Gagal menambah libur: ' + err.message);
    } finally {
      setSavingHoliday(false);
    }
  };

  // Handler hapus hari libur
  const handleDeleteHoliday = async (holidayId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus jadwal libur ini?')) return;

    try {
      setErrorMsg('');
      await deleteSchoolHoliday(holidayId);
      setHolidays(holidays.filter((h) => h.holiday_id !== holidayId));
      setSuccessMsg('Jadwal libur berhasil dihapus.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg('Gagal menghapus libur: ' + err.message);
    }
  };

  // Handler tambah 1 siswa manual
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNis.trim() || !newFullName.trim()) {
      setErrorMsg('NIS dan Nama Lengkap siswa wajib diisi!');
      return;
    }

    try {
      setSavingStudent(true);
      setErrorMsg('');
      setSuccessMsg('');

      await addSingleStudent(tenantId, classId, newNis.trim(), newFullName.trim(), newGender);
      const updatedStudents = await fetchStudentsManagement(tenantId, classId);
      setStudents(updatedStudents);

      setNewNis('');
      setNewFullName('');
      setSuccessMsg('Siswa baru berhasil ditambahkan.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg('Gagal menambah siswa (Pastikan NIS belum terdaftar): ' + err.message);
    } finally {
      setSavingStudent(false);
    }
  };

  // Handler Hapus Siswa
  const handleDeleteStudent = async (studentId: string) => {
    if (!confirm('Yakin ingin menghapus siswa ini dari kelas?')) return;

    try {
      setErrorMsg('');
      await deleteStudent(studentId);
      setStudents(students.filter((s) => s.student_id !== studentId));
      setSuccessMsg('Data siswa berhasil dihapus.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg('Gagal menghapus siswa: ' + err.message);
    }
  };

  // Handler Mulai Edit Siswa
  const startEditStudent = (s: Student) => {
    setEditingStudentId(s.student_id);
    setEditNis(s.nis);
    setEditFullName(s.full_name);
  };

  // Handler Simpan Edit Siswa
  const handleSaveEditStudent = async (studentId: string) => {
    if (!editNis.trim() || !editFullName.trim()) {
      setErrorMsg('NIS dan Nama tidak boleh kosong!');
      return;
    }

    try {
      setErrorMsg('');
      await updateStudent(studentId, editNis.trim(), editFullName.trim(), editGender);
      const updatedStudents = await fetchStudentsManagement(tenantId, classId);
      setStudents(updatedStudents);
      setEditingStudentId(null);
      setSuccessMsg('Data siswa berhasil diperbarui.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg('Gagal memperbarui siswa: ' + err.message);
    }
  };

  // Handler Import Massal
  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkText.trim()) {
      setErrorMsg('Data paste kosong!');
      return;
    }

    try {
      setIsImporting(true);
      setErrorMsg('');
      setSuccessMsg('');

      const lines = bulkText.split('\n');
      const parsedStudents: { nis: string; full_name: string; gender?: 'L' | 'P' }[] = [];

      lines.forEach((line) => {
        if (!line.trim()) return;
        const parts = line.includes('\t') ? line.split('\t') : line.split(',');
        if (parts.length >= 2) {
          const nis = parts[0].trim();
          const full_name = parts[1].trim();
          // Ambil kolom ke-3 jika ada, lalu normalisasi jadi 'L' atau 'P'
          const rawGender = parts[2] ? parts[2].trim().toUpperCase() : 'L';
          const gender: 'L' | 'P' = rawGender === 'P' ? 'P' : 'L';

          if (nis && full_name) {
            parsedStudents.push({ nis, full_name, gender });
          }
        }
      });

      if (parsedStudents.length === 0) {
        setErrorMsg('Format data tidak valid. Gunakan format: NIS [Tab atau Koma] Nama Siswa');
        setIsImporting(false);
        return;
      }

      await bulkUpsertStudents(tenantId, classId, parsedStudents);
      const updatedStudents = await fetchStudentsManagement(tenantId, classId);
      setStudents(updatedStudents);

      setBulkText('');
      setSuccessMsg(`Berhasil mengimpor / memperbarui ${parsedStudents.length} data siswa.`);
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      setErrorMsg('Gagal import massal: ' + err.message);
    } finally {
      setIsImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] font-sans">
        <p className="text-xs font-medium text-slate-500 animate-pulse">Memuat pengaturan tenant...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#1e293b] font-sans flex flex-col pb-28">
      {/* Header Sederhana */}
      <div className="sticky top-0 z-30 bg-[#f8fafc]/90 backdrop-blur-md border-b border-slate-200 px-4 py-3 max-w-md mx-auto w-full">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-sm text-slate-800">Pengaturan Sekolah</h1>
            <p className="text-[10px] text-slate-500">Konfigurasi hari efektif, libur, & data siswa</p>
          </div>
          <span className="text-xl">⚙️</span>
        </div>
      </div>

      <main className="px-4 py-3 max-w-md mx-auto w-full space-y-3 flex-1">
        {/* Pesan Sukses / Error */}
        {successMsg && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium rounded-xl shadow-xs">
            ✨ {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-xl shadow-xs">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* SECTION 1: Hari Sekolah (Accordion) */}
        <div className="app-card bg-white overflow-hidden transition-all">
          <button
            type="button"
            onClick={() => setOpenDays(!openDays)}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/80 transition"
          >
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-xs uppercase tracking-wider text-slate-700">1. Sistem Hari Efektif</h2>
                <span className="text-[9px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold border border-blue-100">
                  {schoolDays} Hari Sekolah
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Pilih format hari aktif belajar di sekolah Anda.</p>
            </div>
            <span className="text-slate-400 font-bold text-xs">{openDays ? '▲' : '▼'}</span>
          </button>

          {openDays && (
            <div className="px-4 pb-4 pt-1 border-t border-slate-100 space-y-3">
              <div className="grid grid-cols-2 gap-2 mt-2">
                <button
                  onClick={() => handleUpdateSchoolDays(5)}
                  disabled={savingSettings}
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${schoolDays === 5
                    ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300 text-blue-800 font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 font-medium'
                    }`}
                >
                  <div className="flex justify-between items-center w-full mb-2">
                    <span className="text-base">📅</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${schoolDays === 5 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                      {schoolDays === 5 ? 'Aktif' : 'Pilih'}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs">5 Hari Sekolah</p>
                    <p className="text-[10px] text-slate-400 font-normal">Senin s.d. Jumat</p>
                  </div>
                </button>

                <button
                  onClick={() => handleUpdateSchoolDays(6)}
                  disabled={savingSettings}
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${schoolDays === 6
                    ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300 text-blue-800 font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 font-medium'
                    }`}
                >
                  <div className="flex justify-between items-center w-full mb-2">
                    <span className="text-base">📅</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${schoolDays === 6 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                      {schoolDays === 6 ? 'Aktif' : 'Pilih'}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs">6 Hari Sekolah</p>
                    <p className="text-[10px] text-slate-400 font-normal">Senin s.d. Sabtu</p>
                  </div>
                </button>
              </div>
              <p className="text-[9px] text-slate-400 italic">* Hari Minggu secara otomatis di-skip oleh sistem rekap.</p>
            </div>
          )}
        </div>

        {/* SECTION 2: Manajemen & Import Siswa (Accordion) */}
        <div className="app-card bg-white overflow-hidden transition-all">
          <button
            type="button"
            onClick={() => setOpenStudents(!openStudents)}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/80 transition"
          >
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-xs uppercase tracking-wider text-slate-700">2. Manajemen Data Siswa</h2>
                <span className="text-[9px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold border border-slate-200">
                  {students.length} Siswa
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Tambah siswa manual atau import massal dari Excel.</p>
            </div>
            <span className="text-slate-400 font-bold text-xs">{openStudents ? '▲' : '▼'}</span>
          </button>

          {openStudents && (
            <div className="px-4 pb-4 pt-1 border-t border-slate-100 space-y-3">
              {/* Form Tambah Siswa Manual */}
              <form onSubmit={handleAddStudent} className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200 mt-2">
                <h3 className="text-[11px] font-bold text-slate-700">➕ Tambah Siswa Baru</h3>
                <div className="grid grid-cols-4 gap-2">
                  <input
                    type="text"
                    placeholder="No. NIS"
                    value={newNis}
                    onChange={(e) => setNewNis(e.target.value)}
                    className="bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Nama Lengkap Siswa"
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    className="col-span-2 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <select
                    value={newGender}
                    onChange={(e) => setNewGender(e.target.value as 'L' | 'P')}
                    className="bg-white px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="L">L</option>
                    <option value="P">P</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={savingStudent}
                  className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition"
                >
                  {savingStudent ? 'Menyimpan...' : 'Simpan Siswa'}
                </button>
              </form>

              {/* Form Import Massal */}
              <form onSubmit={handleBulkImport} className="space-y-2 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                <div className="flex justify-between items-center">
                  <h3 className="text-[11px] font-bold text-blue-800">📥 Import Massal dari Excel</h3>
                  <span className="text-[9px] text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded font-medium">Format: NIS [Tab/Koma] Nama [Tab/Koma] L/P</span>
                </div>
                <textarea
                  rows={3}
                  placeholder="Contoh:&#10;1001, Budi Santoso, L&#10;1002, Siti Aminah, P"
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  className="w-full bg-white px-2.5 py-1.5 rounded-lg border border-blue-200 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <p className="text-[9px] text-slate-500">
                  * Tips: Anda bisa langsung blok tabel data siswa (NIS, Nama, Gender) di Excel, lalu *Paste* di kotak di atas.
                </p>
                <button
                  type="submit"
                  disabled={isImporting}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition shadow-sm"
                >
                  {isImporting ? 'Mengimpor Data...' : 'Proses Import / Update Massal'}
                </button>
              </form>

              {/* Daftar Siswa Terdaftar */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <h3 className="text-[11px] font-bold text-slate-500">Daftar Siswa Kelas ({students.length})</h3>

                {students.length === 0 ? (
                  <p className="text-[10px] text-slate-400 italic text-center py-3 bg-slate-50 rounded-xl">Belum ada data siswa di kelas ini.</p>
                ) : (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {students.map((s, idx) => (
                      <div key={s.student_id} className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                        {editingStudentId === s.student_id ? (
                          <div className="flex items-center gap-1.5 flex-1 mr-2">
                            <input
                              type="text"
                              value={editNis}
                              onChange={(e) => setEditNis(e.target.value)}
                              className="w-14 bg-white px-2 py-1 rounded border border-slate-300 text-xs"
                            />
                            <input
                              type="text"
                              value={editFullName}
                              onChange={(e) => setEditFullName(e.target.value)}
                              className="flex-1 bg-white px-2 py-1 rounded border border-slate-300 text-xs"
                            />
                            <select
                              value={editGender}
                              onChange={(e) => setEditGender(e.target.value as 'L' | 'P')}
                              className="bg-white px-1.5 py-1 rounded border border-slate-300 text-xs font-bold"
                            >
                              <option value="L">L</option>
                              <option value="P">P</option>
                            </select>
                            <button
                              onClick={() => handleSaveEditStudent(s.student_id)}
                              className="bg-emerald-600 text-white font-bold px-2 py-1 rounded text-[10px]"
                            >
                              Simpan
                            </button>
                            <button
                              onClick={() => setEditingStudentId(null)}
                              className="bg-slate-300 text-slate-700 px-2 py-1 rounded text-[10px]"
                            >
                              Batal
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-400 font-bold w-5">{idx + 1}.</span>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <p className="font-bold text-slate-800 leading-tight">{s.full_name}</p>
                                  <span className={`text-[9px] px-1 rounded font-bold ${s.gender === 'P' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {s.gender || 'L'}
                                  </span>
                                </div>
                                <p className="text-[10px] text-slate-400">NIS: {s.nis}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => startEditStudent(s)}
                                className="text-blue-600 hover:text-blue-800 font-bold text-[10px] bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg border border-blue-200 transition"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteStudent(s.student_id)}
                                className="text-rose-500 hover:text-rose-700 font-bold text-[10px] bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded-lg border border-rose-200 transition"
                              >
                                Hapus
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* SECTION 3: Kalender Libur (Accordion) */}
        <div className="app-card bg-white overflow-hidden transition-all">
          <button
            type="button"
            onClick={() => setOpenHolidays(!openHolidays)}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/80 transition"
          >
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-xs uppercase tracking-wider text-slate-700">3. Kalender Libur & Cuti</h2>
                <span className="text-[9px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold border border-slate-200">
                  {holidays.length} Jadwal
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Input rentang tanggal libur nasional atau semester.</p>
            </div>
            <span className="text-slate-400 font-bold text-xs">{openHolidays ? '▲' : '▼'}</span>
          </button>

          {openHolidays && (
            <div className="px-4 pb-4 pt-1 border-t border-slate-100 space-y-3">
              <form onSubmit={handleAddHoliday} className="space-y-2.5 mt-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">Keterangan Libur / Acara</label>
                  <input
                    type="text"
                    placeholder="Misal: Libur Semester Genap / Hari Raya"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Dari Tanggal</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Sampai Tanggal</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={savingHoliday}
                  className="w-full mt-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition shadow-sm flex items-center justify-center gap-2"
                >
                  {savingHoliday ? 'Menyimpan...' : '➕ Tambahkan Jadwal Libur'}
                </button>
              </form>

              {/* List Daftar Hari Libur Tersimpan */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <h3 className="text-[11px] font-bold text-slate-500">Daftar Libur Terdaftar ({holidays.length})</h3>

                {holidays.length === 0 ? (
                  <p className="text-[10px] text-slate-400 italic text-center py-3 bg-slate-50 rounded-xl">Belum ada kalender libur yang ditambahkan.</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {holidays.map((h) => (
                      <div key={h.holiday_id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-slate-700 leading-tight">{h.description}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {h.start_date === h.end_date ? h.start_date : `${h.start_date} s.d. ${h.end_date}`}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteHoliday(h.holiday_id)}
                          className="text-rose-500 hover:text-rose-700 font-bold text-[10px] bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded-lg border border-rose-200 transition"
                        >
                          Hapus
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}