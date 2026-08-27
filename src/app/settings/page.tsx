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
  deleteSchoolHoliday 
} from '@/services/attendanceService';
import { SchoolHoliday } from '@/types/database';
import BottomNav from '@/components/BottomNav';

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingHoliday, setSavingHoliday] = useState(false);
  
  const [tenantId, setTenantId] = useState('');
  const [schoolDays, setSchoolDays] = useState<number>(5);
  
  // State untuk form input libur (bulk range tanggal)
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  
  const [holidays, setHolidays] = useState<SchoolHoliday[]>([]);
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
        if (!info || !info.tenantId) {
          router.replace('/login');
          return;
        }

        setTenantId(info.tenantId);

        // Ambil setting tenant & daftar libur secara paralel
        const [settings, holidayList] = await Promise.all([
          fetchTenantSettings(info.tenantId),
          fetchSchoolHolidays(info.tenantId)
        ]);

        setSchoolDays(settings.school_days);
        setHolidays(holidayList);
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

  // Handler tambah hari libur (bulk/rentang tanggal)
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

      // Refresh list libur
      const updatedHolidays = await fetchSchoolHolidays(tenantId);
      setHolidays(updatedHolidays);

      // Reset form
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
            <p className="text-[10px] text-slate-500">Konfigurasi hari efektif & kalender libur</p>
          </div>
          <span className="text-xl">⚙️</span>
        </div>
      </div>

      <main className="px-4 py-3 max-w-md mx-auto w-full space-y-4 flex-1">
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

        {/* SECTION 1: Hari Sekolah (5 / 6 Hari) */}
        <div className="app-card p-4 bg-white space-y-3">
          <div>
            <h2 className="font-bold text-xs uppercase tracking-wider text-slate-700">1. Sistem Hari Efektif</h2>
            <p className="text-[10px] text-slate-400">Pilih format hari aktif belajar di sekolah Anda.</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleUpdateSchoolDays(5)}
              disabled={savingSettings}
              className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                schoolDays === 5 
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
              className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                schoolDays === 6 
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

        {/* SECTION 2: Kalender Libur (Bulk / Range) */}
        <div className="app-card p-4 bg-white space-y-3">
          <div>
            <h2 className="font-bold text-xs uppercase tracking-wider text-slate-700">2. Kalender Libur & Cuti</h2>
            <p className="text-[10px] text-slate-400">Input rentang tanggal libur nasional atau semester secara bulk.</p>
          </div>

          <form onSubmit={handleAddHoliday} className="space-y-2.5">
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
      </main>

      <BottomNav />
    </div>
  );
}