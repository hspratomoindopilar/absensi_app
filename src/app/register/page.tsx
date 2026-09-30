'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { registerTenantAndAdmin } from '@/services/authService';
import Link from 'next/link';

export default function RegisterPage() {
  // Tambah state untuk tenant_type ('individual' | 'institution')
  const [tenantType, setTenantType] = useState<'individual' | 'institution'>('individual');

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

  const [showPassword, setShowPassword] = useState(false);

  // Handler dinamis saat tipe tenant berubah
  const handleTenantTypeChange = (type: 'individual' | 'institution') => {
    setTenantType(type);
    if (type === 'individual') {
      setSchoolName('Ruang Mandiri Guru');
      // Perbaikan kurung dan pemanggilan substring
      const randomStr = Math.random().toString(36).substring(2, 7);
      setSlug('ruang-mandiri-' + randomStr);
    } else {
      setSchoolName('');
      setSlug('');
    }
  };

  const handleSchoolNameChange = (val: string) => {
    setSchoolName(val);
    if (tenantType === 'institution') {
      const generatedSlug = val
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-');
      setSlug(generatedSlug);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      await registerTenantAndAdmin({
        tenantType, // <-- Dikirim ke backend/service
        schoolName,
        slug,
        adminName,
        email,
        password,
        className,
        academicYear,
        schoolDays,
      });

      alert(tenantType === 'individual' ? 'Registrasi ruang mandiri berhasil! Silakan login.' : 'Registrasi tenant dan akun admin berhasil! Silakan login.');
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
      <div className="max-w-2xl w-full bg-white/85 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-100 p-8 space-y-6 my-6 relative overflow-hidden">

        {/* WATERMARK LOGO TOMOTH!NK DI BAWAH */}
        <div className="absolute bottom-6 inset-x-0 flex justify-center pointer-events-none z-0">
          <div
            className="w-66 h-66 bg-center bg-no-repeat bg-contain opacity-30"
            style={{ backgroundImage: "url('/tomothink-logo.png')" }}
          ></div>
        </div>

        <div className="relative z-10 space-y-6">

          {/* Header / Logo Section */}
          <div className="text-center space-y-1.5">
            <div className="mx-auto w-54 h-20 flex items-center justify-center">
              <img
                src="/kelasyikapp-logo.png"
                alt="Logo KelasYik"
                className="w-full h-full object-contain drop-shadow-sm"
              />
            </div>

            <div className="space-y-0.5">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Pendaftaran Akun KelasYik</h1>
              <p className="text-xs text-slate-500 font-medium">Pilih jalur pendaftaran sesuai kebutuhan pengajaran Anda</p>
            </div>
          </div>

          {/* TOGGLE PILIHAN TIPE TENANT (Individual vs Institusi) */}
          <div className="grid grid-cols-2 gap-2 bg-slate-200/60 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => handleTenantTypeChange('individual')}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${tenantType === 'individual'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              🚀 Guru Mandiri (Individual)
            </button>
            <button
              type="button"
              onClick={() => handleTenantTypeChange('institution')}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${tenantType === 'institution'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              🏫 Institusi Sekolah
            </button>
          </div>

          {errorMessage && (
            <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-700 text-xs p-3 rounded-r-xl font-medium">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Kolom Kiri: Informasi Institusi / Ruang Kerja */}
              <div className="space-y-3 p-4 bg-slate-50/80 rounded-xl border border-slate-100">
                <h2 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">
                  {tenantType === 'individual' ? '1. Info Ruang & Kelas' : '1. Data Institusi / Sekolah'}
                </h2>

                {tenantType === 'institution' ? (
                  <>
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
                  </>
                ) : (
                  <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-100 space-y-1 text-[11px] text-blue-800">
                    <p className="font-bold">✨ Mode Guru Mandiri (All-in)</p>
                    <p className="text-slate-600 leading-relaxed">Anda akan mendapatkan ruang kerja independen secara instan tanpa birokrasi sekolah yang rumit.</p>
                  </div>
                )}

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

              {/* Kolom Kanan: Informasi Akun Pengajar / Admin */}
              <div className="space-y-3 p-4 bg-slate-50/80 rounded-xl border border-slate-100 flex flex-col justify-between">
                <div className="space-y-3">
                  <h2 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">
                    {tenantType === 'individual' ? '2. Akun Guru / Pengajar' : '2. Akun Administrator'}
                  </h2>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Nama Lengkap</label>
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
                      placeholder="guru@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-800"
                    />
                  </div>

                  <div className="space-y-1.5 relative">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Password Baru</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'} // Tipe berubah dinamis sesuai state
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Minimal 6 karakter"
                        className="w-full bg-slate-50 px-4 py-3 pr-10 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all text-slate-800 placeholder:text-slate-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm focus:outline-none cursor-pointer"
                        title={showPassword ? 'Sembunyikan Password' : 'Tampilkan Password'}
                      >
                        {showPassword ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 italic pt-2">
                  * Pastikan data email dan password benar untuk login pertama kali.
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
                <span>🚀 {tenantType === 'individual' ? 'Buat Ruang Mandiri Sekarang' : 'Daftar Tenant & Akun Admin'}</span>
              )}
            </button>
          </form>

          {/* Footer Link & Branding */}
          <div className="text-center pt-3 border-t border-slate-100 space-y-2">
            <p className="text-xs text-slate-800">
              Sudah punya akun?{' '}
              <Link href="/login" className="text-blue-600 font-bold hover:underline">
                Masuk di sini
              </Link>
            </p>
            <p className="text-[10px] tracking-wider text-slate-600 font-medium uppercase">
              Developed with ♥ by <span className="text-slate-600 font-semibold">Tomoth!nk@2026</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}