'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function RootRedirect() {
    const router = useRouter();

    useEffect(() => {
        async function checkSessionAndRedirect() {
            // 1. Cek apakah ada sesi siswa yang aktif di localStorage
            const studentSession = localStorage.getItem('kelasyik_student_session') || localStorage.getItem('current_student');
            if (studentSession) {
                router.replace('/student/dashboard');
                return;
            }

            // 2. Cek apakah ada sesi guru yang aktif via Supabase Auth
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                router.replace('/teacher');
                return;
            }

            // 3. Jika tidak ada keduanya, arahkan ke halaman login
            router.replace('/login');
        }

        checkSessionAndRedirect();
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100 font-sans">
            <p className="text-sm animate-pulse">Memverifikasi Sesi Pengguna...</p>
        </div>
    );
}