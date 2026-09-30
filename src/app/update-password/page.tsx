// src/app/update-password/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function UpdatePasswordPage() {
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setSuccessMsg('');

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) throw error;

            setSuccessMsg('Password berhasil diperbarui! Mengalihkan ke halaman login...');
            setTimeout(() => {
                router.replace('/login');
            }, 1500);
        } catch (err: any) {
            setMessage(err.message || 'Terjadi kesalahan.');
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
                            <p className="text-xs text-slate-500 font-medium">Atur kembali kata sandi akun Anda</p>
                        </div>
                    </div>

                    {/* Error Alert */}
                    {message && (
                        <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-700 text-xs p-3 rounded-r-xl font-medium">
                            {message}
                        </div>
                    )}

                    {/* Success Alert */}
                    {successMsg && (
                        <div className="bg-emerald-50 border-l-4 border-emerald-500 text-emerald-700 text-xs p-3 rounded-r-xl font-medium">
                            {successMsg}
                        </div>
                    )}

                    <form onSubmit={handleUpdatePassword} className="space-y-4">
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

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold py-3 rounded-xl text-sm transition-all shadow-lg shadow-blue-600/25 disabled:opacity-50 cursor-pointer mt-2"
                        >
                            {loading ? 'Menyimpan...' : 'Simpan Password Baru'}
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="text-center pt-3 border-t border-slate-100">
                        <p className="text-[10px] tracking-wider text-slate-600 font-medium uppercase">
                            Developed with ♥ by <span className="text-slate-600 font-semibold">Tomoth!nk@2026</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}