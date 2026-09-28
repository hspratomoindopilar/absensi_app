//src/app/admin/classes/manage/page.tsx

'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import TeacherBottomNav from '@/components/TeacherBottomNav'; // Bottom Nav khusus Teacher
import BottomNav from '@/components/BottomNav'; // Bottom Nav Admin eksisting
import '@/style/admin-theme.css';

export default function ManageClassesPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [activeTab, setActiveTab] = useState<'mine' | 'all'>('mine');
    const [searchQuery, setSearchQuery] = useState('');
    const [classesList, setClassesList] = useState<any[]>([]);
    const [userInfo, setUserInfo] = useState<{ fullName: string; schoolName: string; role: string } | null>(null);

    // State Paginasi
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    useEffect(() => {
        const savedTheme = (localStorage.getItem('admin_active_theme') as 'light' | 'dark') || 'light';
        setTheme(savedTheme);

        async function fetchClassesAndUserData() {
            try {
                setLoading(true);
                const { data: { session } } = await supabase.auth.getSession();
                if (!session || !session.user.email) {
                    router.replace('/login');
                    return;
                }

                // 1. Ambil data profil user (role, tenant_id, full_name)
                const { data: userData, error: userError } = await supabase
                    .from('users')
                    .select('user_id, tenant_id, full_name, role')
                    .eq('email', session.user.email)
                    .single();

                if (userError || !userData) {
                    console.error('Gagal mengambil data user:', userError);
                    return;
                }

                // 2. Ambil nama sekolah dari tenants
                const { data: tenantData } = await supabase
                    .from('tenants')
                    .select('school_name')
                    .eq('tenant_id', userData.tenant_id)
                    .single();

                const roleLower = (userData.role || '').toLowerCase();
                const isTeacher = roleLower.includes('teacher') || roleLower.includes('guru') || (!roleLower.includes('admin') && !roleLower.includes('general'));

                setUserInfo({
                    fullName: userData.full_name || 'Guru / Pengajar',
                    schoolName: tenantData?.school_name || 'Sekolah',
                    role: userData.role || 'teacher'
                });

                // Jika role adalah teacher, secara default tab aktif langsung "Kelas Saya"
                if (isTeacher) {
                    setActiveTab('mine');
                }

                // 3. Ambil data kelas berdasarkan tenant
                const { data: classesData, error: classError } = await supabase
                    .from('classes')
                    .select(`
                        class_id,
                        class_name,
                        grade_level,
                        capacity,
                        homeroom_teacher_id,
                        tenant_id,
                        users:homeroom_teacher_id (
                            full_name
                        )
                    `)
                    .eq('tenant_id', userData.tenant_id);

                if (classError) {
                    console.error('Gagal memuat kelas:', classError);
                } else {
                    // Ambil relasi pengajar dari teacher_classes
                    const { data: teacherClasses } = await supabase
                        .from('teacher_classes')
                        .select('class_id')
                        .eq('teacher_id', userData.user_id);

                    const assignedClassIds = teacherClasses?.map(tc => tc.class_id) || [];

                    const formatted = (classesData || []).map((cls: any) => {
                        const isHomeroom = cls.homeroom_teacher_id === userData.user_id;
                        const isAssigned = assignedClassIds.includes(cls.class_id);
                        
                        // Ambil nama wali kelas dari hasil join relasi users
                        const homeroomName = cls.users?.full_name;

                        let picText = 'Belum ada';
                        if (isHomeroom) {
                            picText = 'Anda (Wali Kelas)';
                        } else if (homeroomName) {
                            picText = `${homeroomName}`;
                        } else if (isAssigned) {
                            picText = 'Pengajar Mapel';
                        }

                        return {
                            ...cls,
                            isMyClass: isHomeroom || isAssigned,
                            picText: picText
                        };
                    });

                    setClassesList(formatted);
                }
            } catch (err) {
                console.error('Terjadi kesalahan:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchClassesAndUserData();
    }, [router]);

    const handleSwitchTheme = (newTheme: 'light' | 'dark') => {
        setTheme(newTheme);
        localStorage.setItem('admin_active_theme', newTheme);
    };

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, activeTab]);

    const isUserTeacher = userInfo ? (userInfo.role.toLowerCase().includes('teacher') || userInfo.role.toLowerCase().includes('guru') || (!userInfo.role.toLowerCase().includes('admin') && !userInfo.role.toLowerCase().includes('general'))) : false;

    // Filter data berdasarkan Tab & Search Query
    const filteredClasses = classesList.filter((cls) => {
        const matchesSearch = cls.class_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            cls.grade_level?.toLowerCase().includes(searchQuery.toLowerCase());
        
        if (activeTab === 'mine' || isUserTeacher) {
            return matchesSearch && cls.isMyClass;
        }
        return matchesSearch;
    });

    const totalPages = Math.ceil(filteredClasses.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentData = filteredClasses.slice(startIndex, startIndex + itemsPerPage);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-blue-100 font-sans">
                <p className="text-xs font-bold text-blue-900 animate-pulse">Memuat Ruang Kelas...</p>
            </div>
        );
    }

    return (
        <div
            className="admin-theme-root min-h-screen font-sans flex flex-col justify-between select-none transition-colors duration-300"
            data-theme={theme}
            style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}
        >
            {/* KONTEN UTAMA */}
            <div className="max-w-md w-full mx-auto p-4 space-y-4 pb-28">

                {/* TOMBOL SWITCHER THEME */}
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

                {/* HEADER JUDUL */}
                <div
                    className="backdrop-blur-md rounded-2xl p-4 shadow-lg text-center border transition-colors duration-300"
                    style={{ backgroundColor: 'var(--bg-header)', borderColor: 'var(--border-theme)' }}
                >
                    <h1 className="font-extrabold text-white text-base tracking-wider uppercase">RUANG KELAS</h1>
                    <p className="text-[11px] text-blue-100 mt-0.5">Kelola kelas binaan dan daftar pengampu</p>
                </div>

                {/* INFORMASI USER (JIKA TEACHER) ATAU TOMBOL TAMBAH KELAS (JIKA ADMIN) */}
                {isUserTeacher ? (
                    <div 
                        className="p-3.5 rounded-2xl border shadow-sm flex items-center gap-3 transition-colors"
                        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)' }}
                    >
                        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-black flex items-center justify-center text-sm shadow">
                            {userInfo?.fullName ? userInfo.fullName.charAt(0).toUpperCase() : 'G'}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-[10px] uppercase font-bold tracking-wider opacity-60">{userInfo?.schoolName}</p>
                            <h2 className="font-extrabold text-xs truncate">{userInfo?.fullName}</h2>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push('/admin/classes/create')}
                            className="flex-1 bg-cyan-400 hover:bg-cyan-300 active:scale-95 text-blue-950 font-extrabold text-xs py-2.5 px-4 rounded-xl shadow-md border border-cyan-200 transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                            <span className="text-base leading-none">+</span>
                            <span>Tambah Kelas</span>
                        </button>

                        <div
                            className="flex p-1 rounded-xl border backdrop-blur-sm"
                            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)' }}
                        >
                            <button
                                onClick={() => setActiveTab('mine')}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${activeTab === 'mine' ? 'shadow' : ''}`}
                                style={{
                                    backgroundColor: activeTab === 'mine' ? 'var(--accent-btn)' : 'transparent',
                                    color: activeTab === 'mine' ? '#ffffff' : 'var(--text-main)'
                                }}
                            >
                                Kelas Saya
                            </button>
                            <button
                                onClick={() => setActiveTab('all')}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${activeTab === 'all' ? 'shadow' : ''}`}
                                style={{
                                    backgroundColor: activeTab === 'all' ? 'var(--accent-btn)' : 'transparent',
                                    color: activeTab === 'all' ? '#ffffff' : 'var(--text-main)'
                                }}
                            >
                                Semua
                            </button>
                        </div>
                    </div>
                )}

                {/* AREA FILTER & SEARCH */}
                <div
                    className="backdrop-blur-sm p-3 rounded-2xl shadow-md border flex items-center gap-2 transition-colors duration-300"
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)' }}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0 ml-1" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Cari nama kelas atau tingkat..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-transparent text-xs focus:outline-none"
                        style={{ color: 'var(--text-main)' }}
                    />
                </div>

                {/* TABEL DATA KELAS */}
                <div
                    className="rounded-2xl shadow-lg border overflow-hidden transition-colors duration-300"
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)' }}
                >
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-blue-600 text-white text-[11px] font-bold uppercase tracking-wider">
                                    <th className="p-3">Nama Kelas</th>
                                    <th className="p-3">Grade</th>
                                    <th className="p-3">Kapasitas</th>
                                    <th className="p-3">Status / PIC</th>
                                    {!isUserTeacher && <th className="p-3 text-center">Aksi</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y text-xs" style={{ borderColor: 'var(--border-theme)' }}>
                                {currentData.length > 0 ? (
                                    currentData.map((cls) => (
                                        <tr
                                            key={cls.class_id}
                                            onClick={() => router.push(`/teacher/classes/${cls.class_id}`)}
                                            className="transition cursor-pointer"
                                            style={{ backgroundColor: 'transparent' }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                        >
                                            <td className="p-3 font-bold" style={{ color: 'var(--accent-btn)' }}>{cls.class_name}</td>
                                            <td className="p-3" style={{ color: 'var(--text-muted)' }}>{cls.grade_level || '-'}</td>
                                            <td className="p-3" style={{ color: 'var(--text-muted)' }}>{cls.capacity ? `${cls.capacity} Siswa` : '-'}</td>
                                            <td className="p-3">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${cls.isMyClass
                                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                                    : 'bg-slate-100 text-slate-600'
                                                    }`}>
                                                    {cls.picText}
                                                </span>
                                            </td>

                                            {!isUserTeacher && (
                                                <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                    <a
                                                        href={`/admin/classes/edit/${cls.class_id}`}
                                                        className="inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold transition border shadow-sm hover:opacity-80"
                                                        style={{
                                                            backgroundColor: 'var(--bg-card-hover)',
                                                            borderColor: 'var(--border-theme)',
                                                            color: 'var(--text-main)'
                                                        }}
                                                    >
                                                        ✏️ Edit
                                                    </a>
                                                </td>
                                            )}
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={isUserTeacher ? 4 : 5} className="p-6 text-center italic text-xs" style={{ color: 'var(--text-muted)' }}>
                                            Tidak ada data kelas ditemukan.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* KONTROL PAGINASI */}
                    {totalPages > 1 && (
                        <div className="p-3 border-t flex justify-between items-center" style={{ borderColor: 'var(--border-theme)', backgroundColor: 'var(--bg-card)' }}>
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 text-[10px] font-bold rounded-lg border disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-80 transition cursor-pointer shadow-sm"
                                style={{ backgroundColor: 'var(--bg-card-hover)', borderColor: 'var(--border-theme)', color: 'var(--text-main)' }}
                            >
                                ❮ Prev
                            </button>
                            
                            <span className="text-[10px] font-bold tracking-wide" style={{ color: 'var(--text-muted)' }}>
                                Hal {currentPage} dari {totalPages}
                            </span>
                            
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1.5 text-[10px] font-bold rounded-lg border disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-80 transition cursor-pointer shadow-sm"
                                style={{ backgroundColor: 'var(--bg-card-hover)', borderColor: 'var(--border-theme)', color: 'var(--text-main)' }}
                            >
                                Next ❯
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* BOTTOM NAV */}
            {isUserTeacher ? <TeacherBottomNav /> : <BottomNav />}
        </div>
    );
}