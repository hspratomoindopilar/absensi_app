'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { updateStudentPassword } from '@/services/studentAuthService';

export default function ChangePasswordPage() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [studentSession, setStudentSession] = useState<{ studentId: string; fullName: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Ambil sesi siswa dari localStorage
    const rawSession = localStorage.getItem('kelasyik_student_session');
    if (!rawSession) {
      router.replace('/login');
      return;
    }
    const session = JSON.parse(rawSession);
    setStudentSession(session);
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      setErrorMsg('Semua kolom wajib diisi!');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('Password baru minimal harus 6 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Konfirmasi password tidak cocok dengan password baru.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');

      if (!studentSession) throw new Error('Sesi siswa tidak ditemukan.');

      // Update password dan ubah flag is_first_login menjadi false
      await updateStudentPassword(studentSession.studentId, newPassword);

      // Berhasil, arahkan ke dashboard siswa
      router.replace('/student/dashboard');
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mengubah password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 font-sans antialiased"
      style={{ backgroundColor: '#2f2b3e' }}
    >
      <div className="w-full max-w-md bg-[#2f2b3e]/90 backdrop-blur-xl rounded-3xl shadow-2xl border-2 border-[#7a4e8c]/60 p-8 space-y-6 relative overflow-hidden shadow-[0_0_30px_rgba(122,78,140,0.3)]">
        
        {/* Dekorasi Aksen Neon Header */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-400 via-pink-500 to-cyan-400 shadow-[0_0_10px_#22d3ee]"></div>

        <div className="space-y-6 relative z-10">
          <div className="text-center space-y-2">
            <span className="text-[10px] bg-[#7a4e8c]/30 text-[#f1e5c5] px-3 py-1 rounded-full font-bold uppercase tracking-wider border border-[#7a4e8c]">
              Keamanan Akun Siswa
            </span>
            <h1 className="text-xl font-black text-[#f1e5c5] tracking-tight">Ganti Password Baru</h1>
            <p className="text-xs text-[#d4b7a0]">
              Halo, <span className="font-bold text-white">{studentSession?.fullName || 'Ksatria'}</span>! Karena ini adalah login pertamamu, silakan buat password pribadi yang mudah diingat.
            </p>
          </div>

          {errorMsg && (
            <div className="bg-rose-950/80 border-l-4 border-rose-500 text-rose-200 text-xs p-3 rounded-r-xl font-medium shadow-[0_0_10px_rgba(244,63,94,0.2)]">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#d4b7a0] uppercase tracking-wider">Password Baru</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="w-full bg-[#1e1b29] text-[#f1e5c5] px-4 py-3 rounded-xl border border-[#7a4e8c]/50 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all placeholder:text-slate-500 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#d4b7a0] uppercase tracking-wider">Konfirmasi Password Baru</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi password baru"
                className="w-full bg-[#1e1b29] text-[#f1e5c5] px-4 py-3 rounded-xl border border-[#7a4e8c]/50 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all placeholder:text-slate-500 font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#7a4e8c] to-purple-600 hover:from-purple-600 hover:to-purple-500 active:scale-[0.99] text-[#f1e5c5] font-black py-3.5 rounded-xl text-sm transition-all shadow-[0_0_15px_rgba(122,78,140,0.5)] border border-purple-400/30 disabled:opacity-50 cursor-pointer mt-2"
            >
              {loading ? 'Menyimpan Password...' : 'Simpan & Masuk ke Beranda 🚀'}
            </button>
          </form>

          <div className="text-center pt-2 border-t border-[#7a4e8c]/30">
            <p className="text-[10px] text-[#d4b7a0]/70 uppercase tracking-widest font-semibold">
              Portal Kelasyik • Arcade Learning Ecosystem
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}