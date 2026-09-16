'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getStudentDashboardProfile } from '@/services/studentDashboardService';
import Link from 'next/link';
import NavBottomStudent from '@/components/NavBottomStudent';
import '@/style/student-theme.css';

export default function StudentDashboard() {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'fun' | 'exam'>('fun');
    const [currentTheme, setCurrentTheme] = useState('default');
    const [studentInfo, setStudentInfo] = useState({
        fullName: 'Siswa Kelasyik',
        className: 'Memuat Kelas...',
        totalExp: 350,
        totalCoins: 120,
        attendanceToday: 'Memuat Status...',
        avatarUrl: '/icon/male-student.png',
    });

    const router = useRouter();

    useEffect(() => {
        const savedTheme = localStorage.getItem('student_active_theme') || 'default'; //component ganti theme halaman
        setCurrentTheme(savedTheme);

        async function loadStudentData() {
            try {
                setLoading(true);

                const rawSession = localStorage.getItem('kelasyik_student_session') || localStorage.getItem('current_student');
                if (!rawSession) {
                    router.replace('/login');
                    return;
                }

                const session = JSON.parse(rawSession);
                const targetStudentId = session.studentId || session.student_id;

                if (!targetStudentId) {
                    router.replace('/login');
                    return;
                }

                const studentData = await getStudentDashboardProfile(targetStudentId);

                if (studentData) {
                    const rawClassName = studentData.classes?.class_name;
                    const academicYear = studentData.classes?.academic_year;

                    let classLabel = 'Kelas Aktif';
                    if (rawClassName) {
                        const formattedClass = rawClassName.toLowerCase().startsWith('kelas') ? rawClassName : `Kelas ${rawClassName}`;
                        classLabel = academicYear ? `${formattedClass} • TA ${academicYear}` : formattedClass;
                    }

                    setStudentInfo({
                        fullName: studentData.full_name,
                        className: classLabel,
                        totalExp: studentData.stats?.total_exp || 0,
                        totalCoins: studentData.stats?.total_coins || 0,
                        attendanceToday: studentData.attendanceToday,
                        avatarUrl: studentData.avatar_url,
                    });
                }
            } catch (err) {
                console.error('Gagal memuat dashboard siswa:', err);
            } finally {
                setLoading(false);
            }
        }

        loadStudentData();
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem('kelasyik_student_session');
        router.replace('/login');
    };

    //handling ganti theme
    const handleSwitchTheme = (themeName: string) => {
        setCurrentTheme(themeName);
        localStorage.setItem('student_active_theme', themeName);
    };

    const isHoliday = studentInfo.attendanceToday.toLowerCase().includes('libur');
    const isHadir = studentInfo.attendanceToday.includes('Hadir');

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#2f2b3e] text-[#f1e5c5] font-sans">
                <p className="text-sm font-medium animate-pulse text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]">
                    Menyiapkan Kamar Siswa...
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
            {/* 1. HEADER */}
            <div
                className="px-5 pt-6 pb-10 rounded-b-3xl shadow-2xl relative border-b"
                style={{
                    backgroundColor: 'var(--bg-header)',
                    borderColor: 'var(--border-light)'
                }}
            >
                <div
                    className="absolute top-0 left-0 right-0 h-1 shadow-[0_0_12px_var(--hover-shadow)]"
                    style={{ background: 'var(--accent-gradient)' }}
                ></div>

                <div className="max-w-md mx-auto flex justify-between items-center gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div
                            className="relative w-12 h-12 rounded-2xl border overflow-hidden flex items-center justify-center shrink-0 p-1 shadow-md"
                            style={{
                                backgroundColor: 'var(--bg-main)',
                                borderColor: 'var(--border-theme)'
                            }}
                        >
                            <img
                                src={studentInfo.avatarUrl}
                                alt="Avatar"
                                className="w-full h-full object-cover rounded-xl"
                            />
                            <div
                                className="absolute bottom-0 right-0 text-[8px] px-1 rounded-tl text-amber-300 font-bold border-t border-l"
                                style={{
                                    backgroundColor: 'var(--bg-header)',
                                    borderColor: 'var(--border-light)'
                                }}
                            >
                                {studentInfo.totalExp < 500 ? '🔒' : '🔓'}
                            </div>
                        </div>

                        <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="inline-block">
                                <span
                                    className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border"
                                    style={{
                                        backgroundColor: 'var(--bg-card)',
                                        borderColor: 'var(--border-theme)',
                                        color: 'var(--text-main)'
                                    }}
                                >
                                    {studentInfo.className}
                                </span>
                            </div>
                            <h1 className="text-base md:text-lg font-black tracking-tight truncate" style={{ color: 'var(--text-main)' }}>
                                Halo, {studentInfo.fullName}! 👋
                            </h1>
                            <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>Siap menaklukkan misi dan ujian hari ini?</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={() => handleSwitchTheme(currentTheme === 'default' ? 'emerald' : 'default')}
                            className="text-[10px] px-2.5 py-1.5 rounded-xl font-bold transition border cursor-pointer hover:shadow-md"
                            style={{
                                backgroundColor: 'var(--bg-card)',
                                borderColor: 'var(--border-theme)',
                                color: 'var(--text-main)'
                            }}
                            title="Uji Coba Ganti Tema"
                        >
                            🎨 {currentTheme === 'default' ? 'Emerald' : 'Default'}
                        </button>
                        <button
                            onClick={handleLogout}
                            className="text-xs px-3 py-1.5 rounded-xl font-bold transition border cursor-pointer hover:shadow-md"
                            style={{
                                backgroundColor: 'var(--bg-card)',
                                borderColor: 'var(--border-theme)',
                                color: 'var(--text-main)'
                            }}
                        >
                            Keluar
                        </button>
                    </div>
                </div>

                {/* Gamification Status Bar */}
                <div className="max-w-md mx-auto mt-5 grid grid-cols-2 gap-3">
                    <div
                        className="backdrop-blur-md p-3 rounded-2xl border flex items-center gap-3 shadow-lg transition-all duration-300 hover:shadow-[0_0_15px_var(--hover-shadow)]"
                        style={{
                            backgroundColor: 'var(--bg-card)',
                            borderColor: 'var(--border-light)'
                        }}
                    >
                        <img src="/icon/exp.png" alt="EXP" className="w-8 h-8 object-contain drop-shadow-[0_0_6px_rgba(34,211,238,0.5)]" />
                        <div>
                            <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-muted)' }}>Total EXP</p>
                            <p className="text-base font-black text-amber-300 drop-shadow-[0_0_6px_rgba(252,211,77,0.5)]">{studentInfo.totalExp} EXP</p>
                        </div>
                    </div>

                    <div
                        className="backdrop-blur-md p-3 rounded-2xl border flex items-center gap-3 shadow-lg transition-all duration-300 hover:shadow-[0_0_15px_var(--hover-shadow)]"
                        style={{
                            backgroundColor: 'var(--bg-card)',
                            borderColor: 'var(--border-light)'
                        }}
                    >
                        <img src="/icon/coin.png" alt="Koin" className="w-8 h-8 object-contain drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]" />
                        <div>
                            <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-muted)' }}>Dompet Koin</p>
                            <p className="text-base font-black text-amber-300 drop-shadow-[0_0_6px_rgba(56,189,248,0.5)]">{studentInfo.totalCoins} Koin</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. WIDGET KEHADIRAN HARI INI */}
            <div className="max-w-md mx-auto w-full px-5 -mt-6 space-y-4 relative z-10">
                <Link href="/student/raport" className="block group">
                    <div
                        className="border p-4 rounded-2xl shadow-xl flex items-center justify-between transition duration-300 cursor-pointer group-hover:shadow-[0_0_20px_var(--hover-shadow)]"
                        style={{
                            backgroundColor: 'var(--bg-card)',
                            borderColor: 'var(--border-light)'
                        }}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg border shadow-lg ${isHoliday
                                ? 'bg-zinc-500/20 text-zinc-400 border-zinc-500/40'
                                : isHadir
                                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-[0_0_10px_rgba(52,211,153,0.3)]'
                                    : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                                }`}>
                                {isHoliday ? '🏖️' : isHadir ? '✓' : '📌'}
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-bold flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                                    Status Kehadiran Hari Ini
                                    <span className="text-[9px] text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity">➔ Buka Rapor</span>
                                </p>
                                <p className={`text-xs font-bold mt-0.5 ${isHoliday ? 'text-zinc-400' : isHadir ? 'text-emerald-400' : 'text-amber-300'}`}>
                                    {studentInfo.attendanceToday}
                                </p>
                            </div>
                        </div>
                        <span
                            className="text-[10px] px-2.5 py-1 rounded-lg font-semibold border transition"
                            style={{
                                backgroundColor: 'var(--bg-main)',
                                borderColor: 'var(--border-light)',
                                color: 'var(--text-muted)'
                            }}
                        >
                            Lihat Rapor 📋
                        </span>
                    </div>
                </Link>

                {/* 3. TAB NAVIGASI UTAMA (Warna mengikuti tema aktif) */}
                <div
                    className="p-1 rounded-2xl border flex"
                    style={{
                        backgroundColor: 'var(--bg-header)',
                        borderColor: 'var(--border-light)'
                    }}
                >
                    <button
                        onClick={() => setActiveTab('fun')}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${activeTab === 'fun'
                            ? 'shadow-md border'
                            : 'hover:opacity-80'
                            }`}
                        style={{
                            background: activeTab === 'fun' ? 'var(--accent-gradient)' : 'transparent',
                            borderColor: activeTab === 'fun' ? 'var(--accent-border)' : 'transparent',
                            color: activeTab === 'fun' ? '#ffffff' : 'var(--text-muted)'
                        }}
                    >
                        <span>🎮</span> Zona Misi (Fun)
                    </button>
                    <button
                        onClick={() => setActiveTab('exam')}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${activeTab === 'exam'
                            ? 'shadow-md border'
                            : 'hover:opacity-80'
                            }`}
                        style={{
                            background: activeTab === 'exam' ? 'var(--accent-gradient)' : 'transparent',
                            borderColor: activeTab === 'exam' ? 'var(--accent-border)' : 'transparent',
                            color: activeTab === 'exam' ? '#ffffff' : 'var(--text-muted)'
                        }}
                    >
                        <span>📝</span> Ujian & Tes
                    </button>
                </div>

                {/* 4. KONTEN DINAMIS BERDASARKAN TAB */}
                {activeTab === 'fun' ? (
                    <div className="space-y-3">
                        <div className="flex justify-between items-center px-1">
                            <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Misi Game Aktif</h3>
                            <Link href="/student/games" className="text-[10px] font-bold hover:underline cursor-pointer" style={{ color: 'var(--badge-text)' }}>Lihat Semua</Link>
                        </div>

                        <Link href="/student/games" className="block">
                            <div
                                className="border p-4 rounded-2xl transition duration-300 cursor-pointer space-y-2 shadow-md hover:shadow-[0_0_20px_var(--hover-shadow)]"
                                style={{
                                    backgroundColor: 'var(--bg-card)',
                                    borderColor: 'var(--border-light)'
                                }}
                            >
                                <div className="flex justify-between items-start">
                                    <span
                                        className="text-[10px] font-bold px-2 py-0.5 rounded-md border"
                                        style={{
                                            backgroundColor: 'var(--badge-bg)',
                                            color: 'var(--badge-text)',
                                            borderColor: 'var(--badge-border)'
                                        }}
                                    >
                                        Fun Learning Arena
                                    </span>
                                    <span className="text-xs font-bold text-amber-300 drop-shadow-[0_0_6px_rgba(252,211,77,0.4)]">⚡ Klaim EXP & Koin</span>
                                </div>
                                <h4 className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>Mainkan Misi Belajar Hari Ini</h4>
                                <p className="text-xs line-clamp-1" style={{ color: 'var(--text-muted)' }}>Asah otak dengan game edukasi seru dari gurumu!</p>
                            </div>
                        </Link>
                    </div>

                ) : (
                <div className="space-y-3">
                    <div className="flex justify-between items-center px-1">
                        <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Ujian & Tes Formal</h3>
                        <span className="text-[10px] font-bold" style={{ color: 'var(--badge-text)' }}>Deadline Hari Ini</span>
                    </div>

                    <div
                        className="border p-4 rounded-2xl transition duration-300 cursor-pointer space-y-2 shadow-md hover:shadow-[0_0_20px_var(--hover-shadow)]"
                        style={{
                            backgroundColor: 'var(--bg-card)',
                            borderColor: 'var(--border-light)'
                        }}
                    >
                        <div className="flex justify-between items-start">
                            <span
                                className="text-[10px] font-bold px-2 py-0.5 rounded-md border"
                                style={{
                                    backgroundColor: 'var(--badge-bg)',
                                    color: 'var(--badge-text)',
                                    borderColor: 'var(--badge-border)'
                                }}
                            >
                                Ujian Resmi
                            </span>
                            <span className="text-xs font-bold text-rose-400 drop-shadow-[0_0_6px_rgba(251,113,133,0.4)]">⏱️ Batas 15 Menit</span>
                        </div>
                        <h4 className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>Evaluasi Matematika Bab 3</h4>
                        <p className="text-xs line-clamp-1" style={{ color: 'var(--text-muted)' }}>Kerjakan dengan teliti, nilai masuk ke buku rapor.</p>
                    </div>
                </div>
                )}
            </div>

            {/* Navigasi Bawah */}
            <NavBottomStudent />
        </div>
    );
}