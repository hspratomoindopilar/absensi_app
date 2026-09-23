//src/app/admin/classes/create/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import '@/style/admin-theme.css'; // <-- Import CSS Tema Admin

export default function CreateClassPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [tenantId, setTenantId] = useState<string | null>(null);

  // State Switcher Mode: 'single' atau 'bulk'
  const [mode, setMode] = useState<'single' | 'bulk'>('single');

  // State Form Single Add
  const [singleName, setSingleName] = useState('');
  const [singleGrade, setSingleGrade] = useState('');
  const [singleCapacity, setSingleCapacity] = useState('36');
  const [singleAcademicYear, setSingleAcademicYear] = useState('2025/2026');

  // State Form Bulk Add (Murni Textarea Bebas)
  const [bulkData, setBulkData] = useState('');

  useEffect(() => {
    const savedTheme = (localStorage.getItem('admin_active_theme') as 'light' | 'dark') || 'light';
    setTheme(savedTheme);
    async function initData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || !session.user.email) {
          router.replace('/login');
          return;
        }

        const { data: userData } = await supabase
          .from('users')
          .select('tenant_id')
          .eq('email', session.user.email)
          .single();

        if (userData?.tenant_id) {
          setTenantId(userData.tenant_id);
        }
      } catch (err) {
        console.error('Gagal memuat data awal:', err);
      }
    }

    initData();
  }, [router]);

  const handleSwitchTheme = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    localStorage.setItem('admin_active_theme', newTheme);
  };

  // Handler Simpan Single Add
  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleName.trim()) {
      alert('Nama kelas wajib diisi!');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.from('classes').insert([
        {
          tenant_id: tenantId,
          class_name: singleName.trim(),
          grade_level: singleGrade.trim() || null,
          capacity: parseInt(singleCapacity) || 36,
          academic_year: singleAcademicYear.trim(),
          homeroom_teacher_id: null,
        },
      ]);

      if (error) throw error;

      alert('Kelas berhasil ditambahkan!');
      router.push('/admin/classes/manage');
    } catch (err: any) {
      console.error('Gagal menyimpan kelas:', err.message);
      alert('Terjadi kesalahan saat menyimpan kelas.');
    } finally {
      setLoading(false);
    }
  };

  // Handler Simpan Bulk Add (Sesuai Urutan Kolom)
  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkData.trim()) {
      alert('Data kelas belum diisi atau belum di-paste!');
      return;
    }

    try {
      setLoading(true);
      const lines = bulkData.split('\n');
      const classesToInsert: any[] = [];

      lines.forEach((line) => {
        const trimmedLine = line.trim();
        if (trimmedLine) {
          // Memisahkan kolom berdasarkan tab (Excel) atau koma (,)
          const columns = trimmedLine.split(/\t|,/).map((col) => col.trim());
          
          const name = columns[0]; // Kolom 1: Nama Kelas
          const grade = columns[1] || null; // Kolom 2: Level Kelas (Opsional)
          const academicYear = columns[2] || '2025/2026'; // Kolom 3: Tahun Ajaran (Opsional)
          const capacity = parseInt(columns[3]) || 36; // Kolom 4: Kapasitas (Opsional)

          if (name) {
            classesToInsert.push({
              tenant_id: tenantId,
              class_name: name,
              grade_level: grade,
              academic_year: academicYear,
              capacity: capacity,
              homeroom_teacher_id: null,
            });
          }
        }
      });

      if (classesToInsert.length === 0) {
        alert('Tidak ada format data kelas yang valid terbaca.');
        setLoading(false);
        return;
      }

      const { error } = await supabase.from('classes').insert(classesToInsert);
      if (error) throw error;

      alert(`Berhasil menambahkan ${classesToInsert.length} kelas baru!`);
      router.push('/admin/classes/manage');
    } catch (err: any) {
      console.error('Gagal menyimpan kelas bulk:', err.message);
      alert('Terjadi kesalahan saat menyimpan data kelas.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="admin-theme-root min-h-screen font-sans flex flex-col justify-between p-4 transition-colors duration-300"
      data-theme={theme}
      style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}
    >
      <div className="max-w-lg w-full mx-auto space-y-4 pb-12">
        
        {/* TOMBOL SWITCHER THEME */}
        <div className="flex justify-end">
          <button
            onClick={() => handleSwitchTheme(theme === 'light' ? 'dark' : 'light')}
            className="text-[11px] font-bold px-3 py-1.5 rounded-xl shadow border transition flex items-center gap-1.5 cursor-pointer"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)', color: 'var(--text-main)' }}
          >
            <span>{theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}</span>
          </button>
        </div>

        {/* HEADER */}
        <div 
          className="backdrop-blur-md rounded-2xl p-4 shadow-lg text-center border transition-colors duration-300"
          style={{ backgroundColor: 'var(--bg-header)', borderColor: 'var(--border-theme)' }}
        >
          <h1 className="font-extrabold text-white text-base tracking-wider uppercase">TAMBAH RUANG KELAS</h1>
          <p className="text-[11px] text-blue-100 mt-0.5">Pilih metode penambahan data kelas baru</p>
        </div>

        {/* SWITCHER MODE (SINGLE VS BULK) */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)' }}>
          <button
            type="button"
            onClick={() => setMode('single')}
            className={`py-2 text-xs font-bold rounded-xl transition cursor-pointer ${mode === 'single' ? 'bg-blue-600 text-white shadow' : ''}`}
            style={{ color: mode === 'single' ? '#ffffff' : 'var(--text-main)' }}
          >
            👤 Single Add
          </button>
          <button
            type="button"
            onClick={() => setMode('bulk')}
            className={`py-2 text-xs font-bold rounded-xl transition cursor-pointer ${mode === 'bulk' ? 'bg-blue-600 text-white shadow' : ''}`}
            style={{ color: mode === 'bulk' ? '#ffffff' : 'var(--text-main)' }}
          >
            📋 Bulk Add (Paste)
          </button>
        </div>

        {/* KONTEN FORM: SINGLE ADD */}
        {mode === 'single' && (
          <form 
            onSubmit={handleSingleSubmit} 
            className="rounded-2xl p-5 shadow-lg border space-y-4 text-xs transition-colors duration-300 animate-fadeIn"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)' }}
          >
            <div className="font-bold text-[11px] uppercase tracking-wider pb-1 border-b" style={{ borderColor: 'var(--border-theme)', color: 'var(--text-muted)' }}>
              Form Tambah Satu Kelas
            </div>

            <div>
              <label className="block font-bold mb-1" style={{ color: 'var(--text-main)' }}>Nama Kelas (class_name)</label>
              <input
                type="text"
                placeholder="Contoh: X IPA 1"
                value={singleName}
                onChange={(e) => setSingleName(e.target.value)}
                required
                className="w-full border rounded-xl p-2.5 font-medium focus:outline-none"
                style={{ backgroundColor: 'var(--bg-card-hover)', borderColor: 'var(--border-theme)', color: 'var(--text-main)' }}
              />
            </div>

            <div>
              <label className="block font-bold mb-1" style={{ color: 'var(--text-main)' }}>Level Kelas (grade_level)</label>
              <input
                type="text"
                placeholder="Contoh: Kelas 10"
                value={singleGrade}
                onChange={(e) => setSingleGrade(e.target.value)}
                className="w-full border rounded-xl p-2.5 font-medium focus:outline-none"
                style={{ backgroundColor: 'var(--bg-card-hover)', borderColor: 'var(--border-theme)', color: 'var(--text-main)' }}
              />
            </div>

            <div>
              <label className="block font-bold mb-1" style={{ color: 'var(--text-main)' }}>Tahun Ajaran (academic_year)</label>
              <input
                type="text"
                placeholder="Contoh: 2025/2026"
                value={singleAcademicYear}
                onChange={(e) => setSingleAcademicYear(e.target.value)}
                className="w-full border rounded-xl p-2.5 font-medium focus:outline-none"
                style={{ backgroundColor: 'var(--bg-card-hover)', borderColor: 'var(--border-theme)', color: 'var(--text-main)' }}
              />
            </div>

            <div>
              <label className="block font-bold mb-1" style={{ color: 'var(--text-main)' }}>Kapasitas (capacity)</label>
              <input
                type="number"
                value={singleCapacity}
                onChange={(e) => setSingleCapacity(e.target.value)}
                className="w-full border rounded-xl p-2.5 font-medium focus:outline-none"
                style={{ backgroundColor: 'var(--bg-card-hover)', borderColor: 'var(--border-theme)', color: 'var(--text-main)' }}
              />
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 font-bold py-3 rounded-xl transition cursor-pointer border"
                style={{ backgroundColor: 'var(--bg-card-hover)', borderColor: 'var(--border-theme)', color: 'var(--text-main)' }}
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 font-bold py-3 rounded-xl shadow-md transition cursor-pointer disabled:opacity-50 bg-blue-600 text-white hover:bg-blue-700"
              >
                {loading ? 'Menyimpan...' : 'Simpan Kelas'}
              </button>
            </div>
          </form>
        )}

        {/* KONTEN FORM: BULK ADD (MURNI TEXTAREA BEBAS) */}
        {mode === 'bulk' && (
          <form 
            onSubmit={handleBulkSubmit} 
            className="rounded-2xl p-5 shadow-lg border space-y-4 text-xs transition-colors duration-300 animate-fadeIn"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)' }}
          >
            <div className="font-bold text-[11px] uppercase tracking-wider pb-1 border-b" style={{ borderColor: 'var(--border-theme)', color: 'var(--text-muted)' }}>
              Form Tambah Massal (Bulk Paste)
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-bold" style={{ color: 'var(--text-main)' }}>Data Kelas (Paste dari Excel / Ketik Manual)</label>
                <span className="text-[10px] text-amber-500 font-semibold">Urutan: Nama | Level | Tahun | Kapasitas</span>
              </div>
              <textarea
                rows={8}
                placeholder={`X IPA 1, Kelas X, 2025/2026, 36\nXI IPS 1, Kelas XI, 2025/2026, 30\nXII MIPA 2, Kelas XII, 2025/2026, 32`}
                value={bulkData}
                onChange={(e) => setBulkData(e.target.value)}
                className="w-full border rounded-xl p-2.5 font-mono text-xs focus:outline-none resize-y"
                style={{ backgroundColor: 'var(--bg-card-hover)', borderColor: 'var(--border-theme)', color: 'var(--text-main)' }}
              />
              <p className="text-[10px] opacity-70 mt-1">
                Pisahkan kolom dengan koma (,) atau langsung *Ctrl+V* copy dari Excel. Bisa mencampur kelas 10, 11, dan 12 sekaligus dalam satu kali proses!
              </p>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 font-bold py-3 rounded-xl transition cursor-pointer border"
                style={{ backgroundColor: 'var(--bg-card-hover)', borderColor: 'var(--border-theme)', color: 'var(--text-main)' }}
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 font-bold py-3 rounded-xl shadow-md transition cursor-pointer disabled:opacity-50 bg-blue-600 text-white hover:bg-blue-700"
              >
                {loading ? 'Menyimpan...' : 'Simpan Semua Kelas'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}