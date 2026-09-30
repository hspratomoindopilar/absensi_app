// src/app/login/page.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authenticateStudent } from '@/services/studentAuthService';

export default function LoginPage() {
  const [loginRole, setLoginRole] = useState<'teacher' | 'student'>('teacher');

  // State Guru
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // State Siswa
  const [nis, setNis] = useState('');
  const [studentPassword, setStudentPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState(''); // <-- State untuk info sukses kirim email reset
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);

  // Handler Login Guru
  const handleTeacherLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;
      if (!authData.user || !authData.user.email) throw new Error('Gagal mendapatkan sesi pengguna.');

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('email', authData.user.email)
        .single();

      if (userError || !userData) {
        throw new Error('Data profil pengguna tidak ditemukan.');
      }

      const role = (userData.role || '').toLowerCase().trim();
      const isFullAdmin = role === 'general admin' || role === 'co-general-admin';
      const isRestrictedAdmin = role === 'admin';
      const isTeacher = role === 'teacher' || role === 'guru';

      if (isFullAdmin) {
        router.push('/dashboard');
      } else if (isTeacher) {
        router.push('/teacher/profile');
      } else if (isRestrictedAdmin) {
        router.push('/dashboard');
      } else {
        router.push('/dashboard');
      }

      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal masuk. Periksa kembali email dan password.');
    } finally {
      setLoading(false);
    }
  };

  // Handler Lupa Password Guru
  const handleForgotPassword = async () => {
    if (!email) {
      setErrorMsg('Masukkan terlebih dahulu email Anda pada kolom di atas untuk reset password.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`, // Mengarah ke halaman pembaruan password
      });

      if (error) throw error;
      setSuccessMsg('Instruksi pemulihan password telah dikirim ke email Anda. Silakan cek kotak masuk.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mengirim email pemulihan.');
    } finally {
      setLoading(false);
    }
  };

  // Handler Login Siswa
  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const studentData = await authenticateStudent(nis, studentPassword);
      const className = studentData.classes?.class_name || 'Mawar69';

      localStorage.setItem('kelasyik_student_session', JSON.stringify({
        studentId: studentData.student_id,
        fullName: studentData.full_name,
        nis: studentData.nis,
        tenantId: studentData.tenant_id,
        studentClass: className,
      }));

      if (studentData.is_first_login) {
        router.push('/student/change-password');
      } else {
        router.push('/student/dashboard');
      }
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal masuk sebagai siswa.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 font-sans antialiased"
      style={{ backgroundImage: 'linear-gradient(126.6deg, rgba(44,115,210,1) 3.4%, rgba(251,234,255,1) 127.9%)' }}
    >
      <div className="w-full max-w-md bg-white/85 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-100 p-8 space-y-6 relative overflow-hidden">

        {/* WATERMARK */}
        <div className="absolute bottom-6 left-1 pointer-events-none z-0">
          <div
            className="w-90 h-90 bg-center bg-no-repeat bg-contain opacity-20"
            style={{ backgroundImage: "url('/tomothink-logo.png')" }}
          ></div>
        </div>

        <div className="relative z-10 space-y-5">
          {/* Header Logo */}
          <div className="text-center space-y-1.5">
            <div className="mx-auto w-54 h-20 flex items-center justify-center">
              <img
                src="/kelasyikapp-logo.png"
                alt="Logo KelasYik"
                className="w-full h-full object-contain drop-shadow-sm"
              />
            </div>
            <div className="space-y-0.5">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Portal Kelasyik</h1>
              <p className="text-xs text-slate-500 font-medium">Silakan pilih akses masuk Anda</p>
            </div>
          </div>

          {/* TAB SWITCHER (GURU VS SISWA) */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => { setLoginRole('teacher'); setErrorMsg(''); setSuccessMsg(''); }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${loginRole === 'teacher'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              👨‍🏫 Masuk Guru / Admin
            </button>
            <button
              type="button"
              onClick={() => { setLoginRole('student'); setErrorMsg(''); setSuccessMsg(''); }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${loginRole === 'student'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              🎓 Masuk Siswa
            </button>
          </div>

          {/* Error Alert */}
          {errorMsg && (
            <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-700 text-xs p-3 rounded-r-xl font-medium">
              {errorMsg}
            </div>
          )}

          {/* Success Alert */}
          {successMsg && (
            <div className="bg-emerald-50 border-l-4 border-emerald-500 text-emerald-700 text-xs p-3 rounded-r-xl font-medium">
              {successMsg}
            </div>
          )}

          {/* FORM LOGIN GURU */}
          {loginRole === 'teacher' ? (
            <form onSubmit={handleTeacherLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Email Guru / Admin</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@sekolah.sch.id"
                  className="w-full bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all text-slate-800 placeholder:text-slate-400"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Password</label>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-[11px] text-blue-600 hover:underline font-bold cursor-pointer"
                  >
                    Lupa Password?
                  </button>
                </div>
                <div className="space-y-1.5 relative">

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

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold py-3 rounded-xl text-sm transition-all shadow-lg shadow-blue-600/25 disabled:opacity-50 cursor-pointer mt-2"
              >
                {loading ? 'Memproses...' : 'Masuk sebagai Guru'}
              </button>
            </form>
          ) : (
            /* FORM LOGIN SISWA */
            <form onSubmit={handleStudentLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Nomor Induk Siswa (NIS)</label>
                <input
                  type="text"
                  required
                  value={nis}
                  onChange={(e) => setNis(e.target.value)}
                  placeholder="Contoh: 1001"
                  className="w-full bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all text-slate-800 placeholder:text-slate-400 font-mono"
                />
              </div>

              <div className="space-y-1.5 relative">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Password Baru</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'} // Tipe berubah dinamis sesuai state
                    required
                    value={password}
                    onChange={(e) => setStudentPassword(e.target.value)}
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

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-sky-600 hover:bg-sky-700 active:scale-[0.99] text-white font-bold py-3 rounded-xl text-sm transition-all shadow-lg shadow-sky-600/25 disabled:opacity-50 cursor-pointer mt-2"
              >
                {loading ? 'Memproses...' : 'Masuk ke Kamar Siswa'}
              </button>
            </form>
          )}

          {/* Footer Link */}
          <div className="text-center pt-3 border-t border-slate-100 space-y-2">
            {loginRole === 'teacher' && (
              <p className="text-xs text-slate-600">
                Belum punya akun sekolah?{' '}
                <Link href="/register" className="text-blue-600 font-bold hover:underline">
                  Daftar di sini
                </Link>
              </p>
            )}
            <p className="text-[10px] tracking-wider text-slate-600 font-medium uppercase">
              Developed with ♥ by <span className="text-slate-600 font-semibold">Tomoth!nk@2026</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}