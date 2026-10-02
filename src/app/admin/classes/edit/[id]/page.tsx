// src/app/admin/classes/edit/[id]/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { academicYearService } from '@/services/settingsService'; // <-- Jembatan layanan
import '@/style/admin-theme.css'; 

export default function EditClassPage() {
  const router = useRouter();
  const params = useParams();
  const classId = params.id; 

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>('light'); 
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [teachersList, setTeachersList] = useState<any[]>([]);

  // --- STATE ACADEMIC YEAR ---
  const [academicYears, setAcademicYears] = useState<any[]>([]); // Opsi referensi
  
  const [className, setClassName] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [capacity, setCapacity] = useState('36');
  const [homeroomTeacherId, setHomeroomTeacherId] = useState('');
  
  // State untuk menyimpan ID referensi 
  const [academicYearId, setAcademicYearId] = useState('');

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

          const { data: teachers } = await supabase
            .from('users')
            .select('user_id, full_name')
            .eq('tenant_id', userData.tenant_id);

          setTeachersList(teachers || []);

          // Memuat daftar referensi tahun ajaran
          const ayList = await academicYearService.fetchAcademicYears(userData.tenant_id);
          setAcademicYears(ayList || []);
        }

        if (classId) {
          const { data: classData, error } = await supabase
            .from('classes')
            .select('*')
            .eq('class_id', classId)
            .single();

          if (error) throw error;

          if (classData) {
            setClassName(classData.class_name || '');
            setGradeLevel(classData.grade_level || '');
            setCapacity(classData.capacity ? classData.capacity.toString() : '');
            setHomeroomTeacherId(classData.homeroom_teacher_id || '');
            
            // Set ID tahun ajaran berdasarkan data kelas yang tersimpan
            setAcademicYearId(classData.academic_year_id || '');
          }
        }
      } catch (err) {
        console.error('Gagal memuat data kelas:', err);
        alert('Gagal mengambil data kelas untuk diedit.');
      } finally {
        setFetching(false);
      }
    }

    initData();
  }, [classId, router]);

  const handleSwitchTheme = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    localStorage.setItem('admin_active_theme', newTheme);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!className.trim()) {
      alert('Nama kelas wajib diisi!');
      return;
    }
    
    // Proteksi: Pastikan admin telah membuat & memilih Tahun Ajaran
    if (!academicYearId) {
      alert('Pilih Tahun Ajaran terlebih dahulu!');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('classes')
        .update({
          class_name: className,
          grade_level: gradeLevel,
          capacity: parseInt(capacity) || 36,
          homeroom_teacher_id: homeroomTeacherId || null,
          academic_year_id: academicYearId, // <-- Menyimpan relasi baru
        })
        .eq('class_id', classId);

      if (error) throw error;

      alert('Kelas berhasil diperbarui!');
      router.push('/admin/classes/manage');
    } catch (err: any) {
      console.error('Gagal memperbarui kelas:', err.message);
      alert('Terjadi kesalahan saat memperbarui kelas.');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center font-sans text-xs" style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}>
        Memuat data kelas...
      </div>
    );
  }

  return (
    <div 
      className="admin-theme-root min-h-screen font-sans flex flex-col justify-between p-4 transition-colors duration-300"
      data-theme={theme}
      style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}
    >
      <div className="max-w-md w-full mx-auto space-y-4 pb-12">
        
        {/* TOMBOL SWITCHER THEME (LIGHT / DARK) */}
        <div className="flex justify-end">
          <button
            onClick={() => handleSwitchTheme(theme === 'light' ? 'dark' : 'light')}
            className="text-[11px] font-bold px-3 py-1.5 rounded-xl shadow border transition flex items-center gap-1.5 cursor-pointer"
            style={{ 
              backgroundColor: 'var(--bg-card)', 
              borderColor: 'var(--border-theme)',
              color: 'var(--text-main)'
            }}
          >
            <span>{theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}</span>
          </button>
        </div>

        {/* HEADER */}
        <div 
          className="backdrop-blur-md rounded-2xl p-4 shadow-lg text-center border transition-colors duration-300"
          style={{ backgroundColor: 'var(--bg-header)', borderColor: 'var(--border-theme)' }}
        >
          <h1 className="font-extrabold text-white text-base tracking-wider uppercase">EDIT KELAS</h1>
          <p className="text-[11px] text-blue-100 mt-0.5">Perbarui informasi ruang kelas</p>
        </div>

        {/* FORM CARD */}
        <form 
          onSubmit={handleSubmit} 
          className="rounded-2xl p-5 shadow-lg border space-y-4 text-xs transition-colors duration-300"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)' }}
        >
          
          <div>
            <label className="block font-bold mb-1" style={{ color: 'var(--text-main)' }}>Nama Kelas</label>
            <input
              type="text"
              placeholder="Contoh: X IPA 1, XI IPS 2"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              required
              className="w-full border rounded-xl p-2.5 font-medium focus:outline-none transition-colors duration-300"
              style={{ 
                backgroundColor: 'var(--bg-card-hover)', 
                borderColor: 'var(--border-theme)',
                color: 'var(--text-main)'
              }}
            />
          </div>

          <div>
            <label className="block font-bold mb-1" style={{ color: 'var(--text-main)' }}>Tingkat / Grade</label>
            <input
              type="text"
              placeholder="Contoh: Kelas 10, Tingkat 1, Semester 2, dll."
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
              className="w-full border rounded-xl p-2.5 font-medium focus:outline-none transition-colors duration-300"
              style={{ 
                backgroundColor: 'var(--bg-card-hover)', 
                borderColor: 'var(--border-theme)',
                color: 'var(--text-main)'
              }}
            />
          </div>

          <div>
            <label className="block font-bold mb-1" style={{ color: 'var(--text-main)' }}>Kapasitas Maksimal (Siswa)</label>
            <input
              type="number"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              className="w-full border rounded-xl p-2.5 font-medium focus:outline-none transition-colors duration-300"
              style={{ 
                backgroundColor: 'var(--bg-card-hover)', 
                borderColor: 'var(--border-theme)',
                color: 'var(--text-main)'
              }}
            />
          </div>

          <div>
            <label className="block font-bold mb-1" style={{ color: 'var(--text-main)' }}>Wali Kelas (PIC)</label>
            <select
              value={homeroomTeacherId}
              onChange={(e) => setHomeroomTeacherId(e.target.value)}
              className="w-full border rounded-xl p-2.5 font-medium focus:outline-none transition-colors duration-300 cursor-pointer"
              style={{ 
                backgroundColor: 'var(--bg-card-hover)', 
                borderColor: 'var(--border-theme)',
                color: 'var(--text-main)'
              }}
            >
              <option value="">-- Pilih Wali Kelas (Opsional) --</option>
              {teachersList.map((t) => (
                <option key={t.user_id} value={t.user_id}>
                  {t.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Smart Fallback Dropdown: Tahun Ajaran */}
          <div>
            <label className="block font-bold mb-1" style={{ color: 'var(--text-main)' }}>Tahun Ajaran</label>
            {academicYears.length > 0 ? (
                <select
                  value={academicYearId}
                  onChange={(e) => setAcademicYearId(e.target.value)}
                  className="w-full border rounded-xl p-2.5 font-medium focus:outline-none transition-colors duration-300 cursor-pointer"
                  style={{ 
                    backgroundColor: 'var(--bg-card-hover)', 
                    borderColor: 'var(--border-theme)',
                    color: 'var(--text-main)'
                  }}
                >
                   {/* Opsi kosong (jika belum diset) */}
                   {!academicYearId && <option value="">-- Pilih Tahun Ajaran --</option>}
                   
                   {academicYears.map(ay => (
                       <option key={ay.academic_year_id} value={ay.academic_year_id}>
                          {ay.year_name} {ay.is_active ? ' (Berjalan)' : ''}
                       </option>
                   ))}
                </select>
            ) : (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                    <p className="text-[10px] text-amber-700 font-semibold mb-2">
                       ⚠️ Belum ada referensi Tahun Ajaran. Anda wajib membuatnya sebelum memperbarui kelas ini.
                    </p>
                    <button 
                       type="button"
                       onClick={() => router.push('/admin/settings/schoolsetting')}
                       className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg shadow-sm font-bold w-full transition cursor-pointer"
                    >
                       + Buat Tahun Ajaran Sekarang
                    </button>
                </div>
            )}
          </div>

          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 font-bold py-3 rounded-xl transition cursor-pointer border"
              style={{ 
                backgroundColor: 'var(--bg-card-hover)', 
                borderColor: 'var(--border-theme)',
                color: 'var(--text-main)' 
              }}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || academicYears.length === 0}
              className="flex-1 font-bold py-3 rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
              style={{ 
                backgroundColor: 'var(--accent-btn)', 
                color: '#ffffff' 
              }}
            >
              {loading ? 'Menyimpan...' : 'Perbarui Kelas'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}