'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import GamePlayer from '@/modules/fun-learning/components/GamePlayer';
import NavBottomStudent from '@/components/NavBottomStudent';
import '@/style/student-theme.css';

export default function StudentGamesPage() {
    const [loading, setLoading] = useState(true);
    const [currentTheme, setCurrentTheme] = useState('default');
    const [sessionData, setSessionData] = useState<{
        tenantId: string;
        studentId: string;
        studentClass: string;
    } | null>(null);

    const router = useRouter();

    useEffect(() => {
        // Ambil tema aktif siswa
        const savedTheme = localStorage.getItem('student_active_theme') || 'default';
        setCurrentTheme(savedTheme);

        // Ambil sesi login siswa
        const rawSession = localStorage.getItem('kelasyik_student_session') || localStorage.getItem('current_student');
        if (!rawSession) {
            router.replace('/login');
            return;
        }

        try {
            const session = JSON.parse(rawSession);
            const tenantId = session.tenantId || session.tenant_id;
            const studentId = session.studentId || session.student_id;
            const studentClass = session.class_name || session.studentClass || session.target_class;

            if (!tenantId || !studentId) {
                router.replace('/login');
                return;
            }

            setSessionData({
                tenantId,
                studentId,
                studentClass: studentClass || '5A', // Fallback aman jika nama kelas kosong
            });
        } catch (err) {
            console.error('Gagal membaca sesi siswa:', err);
            router.replace('/login');
        } finally {
            setLoading(false);
        }
    }, [router]);

    if (loading || !sessionData) {
        return (
            <div className="min-h-screen flex items-center justify-center font-sans" style={{ backgroundColor: 'var(--bg-main, #2f2b3e)', color: 'var(--text-main, #f1e5c5)' }}>
                <p className="text-sm font-medium animate-pulse text-cyan-400">
                    Menyiapkan Arena Misi Belajar...
                </p>
            </div>
        );
    }

    return (
        <div
            className="student-theme-root min-h-screen font-sans flex flex-col pb-28 transition-colors duration-300"
            data-theme={currentTheme}
            style={{
                backgroundColor: 'var(--bg-main)',
                color: 'var(--text-main)'
            }}
        >
            {/* HEADER SEDERHANA */}
            <div
                className="px-5 pt-6 pb-6 border-b shadow-md"
                style={{
                    backgroundColor: 'var(--bg-header)',
                    borderColor: 'var(--border-light)'
                }}
            >
                <div className="max-w-4xl mx-auto flex justify-between items-center">
                    <div>
                        <span
                            className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border"
                            style={{
                                backgroundColor: 'var(--bg-card)',
                                borderColor: 'var(--border-theme)',
                                color: 'var(--badge-text)'
                            }}
                        >
                            🎮 Zona Fun Learning
                        </span>
                        <h1 className="text-lg font-black tracking-tight mt-1" style={{ color: 'var(--text-main)' }}>
                            Misi Belajar Interaktif
                        </h1>
                    </div>
                    <button
                        onClick={() => router.push('/student/dashboard')}
                        className="text-xs px-3 py-1.5 rounded-xl font-bold transition border cursor-pointer hover:shadow-md"
                        style={{
                            backgroundColor: 'var(--bg-card)',
                            borderColor: 'var(--border-theme)',
                            color: 'var(--text-main)'
                        }}
                    >
                        ← Kembali ke Beranda
                    </button>
                </div>
            </div>

            {/* KONTEN UTAMA GAME PLAYER */}
            <div className="flex-1 max-w-4xl w-full mx-auto p-4">
                <GamePlayer 
                    tenantId={sessionData.tenantId} 
                    studentId={sessionData.studentId} 
                    studentClass={sessionData.studentClass} 
                />
            </div>

            {/* NAVIGASI BAWAH */}
            <NavBottomStudent />
        </div>
    );
}