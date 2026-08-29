'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { registerTenantAndAdmin } from '@/services/authService';
import Link from 'next/link';

export default function RegisterPage() {
  const [schoolName, setSchoolName] = useState('');
  const [slug, setSlug] = useState('');
  const [adminName, setAdminName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [className, setClassName] = useState('Kelas 5B');
  const [academicYear, setAcademicYear] = useState('2026/2027');
  const [schoolDays, setSchoolDays] = useState(5);
  
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const router = useRouter();

  const handleSchoolNameChange = (val: string) => {
    setSchoolName(val);
    const generatedSlug = val
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-');
    setSlug(generatedSlug);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      await registerTenantAndAdmin({
        schoolName,
        slug,
        adminName,
        email,
        password,
        className,
        academicYear,
        schoolDays,
      });

      alert('Registrasi tenant dan akun admin berhasil! Silakan login.');
      router.replace('/login');
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan saat pendaftaran.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 font-sans antialiased"
      style={{ backgroundImage: 'linear-gradient(126.6deg, rgba(44,115,210,1) 3.4%, rgba(251,234,255,1) 127.9%)' }}
    >
      <div className="max-w-2xl w-full bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-100 p-8 space-y-6 my-6">
        
        {/* Header / Logo Section */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 text-white font-black text-xl tracking-wider">
            AS
          </div>
          <div className="space-y-0.5">
            <h1 className="text-lg font-bold tracking-tight text-slate-900">Daftar Sekolah Baru</h1>
            <p className="text-xs text-slate-500 font-medium">Buat ruang tenant dan akun admin absensi Anda</p>
          </div>
        </div>

        {errorMessage && (
          <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-700 text-xs p-3 rounded-r-xl font-medium">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          {/* Grid Layout 2 Kolom */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Kolom Kiri: Informasi Sekolah / Tenant */}
            <div className="space-y-3 p-4 bg-slate-50/80 rounded-xl border border-slate-100">
              <h2 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">1. Data Institusi / Sekolah</h2>
              
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Nama Sekolah</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: SDN Ragunan 01"
                  value={schoolName}
                  onChange={(e) => handleSchoolNameChange(e.target.value)}
                  className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Slug Unik URL</label>
                <input
                  type="text"
                  required
                  placeholder="sdn-ragunan-01"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full bg-slate-100 border border-slate-200 px-3 py-2 rounded-xl text-xs text-slate-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Kelas Pertama</label>
                  <input
                    type="text"
                    required
                    placeholder="Kelas 5B"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Tahun Ajaran</label>
                  <input
                    type="text"
                    required
                    placeholder="2026/2027"
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-800"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Hari Sekolah</label>
                <select
                  value={schoolDays}
                  onChange={(e) => setSchoolDays(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-800"
                >
                  <option value={5}>5 Hari (Senin - Jumat)</option>
                  <option value={6}>6 Hari (Senin - Sabtu)</option>
                </select>
              </div>
            </div>

            {/* Kolom Kanan: Informasi Akun Admin */}
            <div className="space-y-3 p-4 bg-slate-50/80 rounded-xl border border-slate-100 flex flex-col justify-between">
              <div className="space-y-3">
                <h2 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">2. Akun Administrator</h2>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Nama Lengkap Admin</label>
                  <input
                    type="text"
                    required
                    placeholder="Budi Santoso, S.Pd"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Email Akses</label>
                  <input
                    type="email"
                    required
                    placeholder="admin@sekolah.sch.id"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Minimal 6 karakter"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-800"
                  />
                </div>
              </div>

              <div className="text-[11px] text-slate-400 italic pt-2">
                * Pastikan data email dan password benar untuk login pertama kali setelah tenant berhasil terdaftar.
              </div>
            </div>

          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold py-3 rounded-xl text-xs shadow-lg shadow-blue-600/25 transition-all mt-2 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>Memproses Pendaftaran...</span>
              </>
            ) : (
              <span>🚀 Daftar Tenant & Akun Admin</span>
            )}
          </button>
        </form>

        {/* Footer Link & Branding */}
        <div className="text-center pt-3 border-t border-slate-100 space-y-2">
          <p className="text-xs text-slate-500">
            Sudah punya akun sekolah?{' '}
            <Link href="/login" className="text-blue-600 font-bold hover:underline">
              Masuk di sini
            </Link>
          </p>
          <p className="text-[10px] tracking-wider text-slate-400 font-medium uppercase">
            Developed with ♥ by <span className="text-slate-600 font-semibold">Tomoth!nk</span>
          </p>
        </div>
      </div>
    </div>
  );
}