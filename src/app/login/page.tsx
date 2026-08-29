'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      router.push('/');
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal masuk. Periksa kembali email dan password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 font-sans antialiased"
      style={{ backgroundImage: 'linear-gradient(126.6deg, rgba(44,115,210,1) 3.4%, rgba(251,234,255,1) 127.9%)' }}
    >
      <div className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-100 p-8 space-y-6">
        
        {/* Header / Logo Section */}
        <div className="text-center space-y-3">
          {/* SLOT LOGO APLIKASI */}
          <div className="mx-auto w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 text-white font-black text-2xl tracking-wider">
            AS
          </div>
          
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Portal Absensi Kelas</h1>
            <p className="text-xs text-slate-500 font-medium">Masuk untuk mengelola kelas</p>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-700 text-xs p-3 rounded-r-xl font-medium">
            {errorMsg}
          </div>
        )}

        {/* Form Section */}
        <form onSubmit={handleLogin} className="space-y-4">
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
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Password</label>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all text-slate-800 placeholder:text-slate-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold py-3 rounded-xl text-sm transition-all shadow-lg shadow-blue-600/25 disabled:opacity-50 cursor-pointer mt-2"
          >
            {loading ? (
              <span className="flex items-center justify-center space-x-2">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Memproses...
              </span>
            ) : (
              'Masuk Aplikasi'
            )}
          </button>
        </form>
        
        {/* Footer Link & Branding */}
        <div className="text-center pt-4 border-t border-slate-100 space-y-2">
          <p className="text-xs text-slate-500">
            Belum punya akun sekolah?{' '}
            <Link href="/register" className="text-blue-600 font-bold hover:underline">
              Daftar di sini
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