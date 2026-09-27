// src/app/admin/settings/teachersetting/[id]/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { teacherService } from '@/services/teacherService';
import { supabase } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';
import '@/style/admin-theme.css';

export default function TeacherDetailPage() {
    const router = useRouter();
    const params = useParams();
    const teacherId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [teacher, setTeacher] = useState<any>(null);
    const [homeroomClasses, setHomeroomClasses] = useState<any[]>([]);
    const [teachingAssignments, setTeachingAssignments] = useState<any[]>([]);

    // Data master untuk opsi dropdown (Kelas & Mapel)
    const [allClasses, setAllClasses] = useState<any[]>([]);
    const [allSubjects, setAllSubjects] = useState<any[]>([]);

    // State Form Modal / Input
    const [selectedClassForHomeroom, setSelectedClassForHomeroom] = useState('');

    // State Tambahan untuk Mode Penugasan Mengajar (Kelas Spesifik vs Berdasarkan Grade/Tingkat)
    const [assignmentMode, setAssignmentMode] = useState<'class' | 'grade'>('class');
    const [selectedClassForTeach, setSelectedClassForTeach] = useState('');
    const [selectedGradeForTeach, setSelectedGradeForTeach] = useState('');
    const [selectedSubjectForTeach, setSelectedSubjectForTeach] = useState('');

    const [theme, setTheme] = useState<'light' | 'dark'>('light');

    // State Toggle Accordion & Info Profil
    const [showProfileInfo, setShowProfileInfo] = useState(false);
    const [isHomeroomOpen, setIsHomeroomOpen] = useState(false);
    const [isTeachingOpen, setIsTeachingOpen] = useState(false);

    // Ambil daftar unique grade_level dari data kelas yang ada
    const uniqueGrades = Array.from(new Set(allClasses.map((c) => c.grade_level).filter(Boolean)));

    useEffect(() => {
        const savedTheme = (localStorage.getItem('admin_active_theme') as 'light' | 'dark') || 'light';
        setTheme(savedTheme);

        async function loadDetail() {
            try {
                // 1. Ambil detail guru & penugasannya via teacherService
                const detail = await teacherService.getTeacherDetail(teacherId);
                setTeacher(detail.teacher);
                setHomeroomClasses(detail.homeroomClasses);
                setTeachingAssignments(detail.teachingAssignments);

                // 2. Ambil master data kelas & mapel untuk pilihan form
                const { data: { session } } = await supabase.auth.getSession();
                if (session && session.user.email) {
                    const { data: currentUser } = await supabase
                        .from('users')
                        .select('tenant_id')
                        .eq('email', session.user.email)
                        .single();

                    if (currentUser && currentUser.tenant_id) {
                        const { data: classesData } = await supabase
                            .from('classes')
                            .select('*')
                            .eq('tenant_id', currentUser.tenant_id);
                        setAllClasses(classesData || []);

                        const { data: subjectsData } = await supabase
                            .from('subjects')
                            .select('*')
                            .eq('tenant_id', currentUser.tenant_id);
                        setAllSubjects(subjectsData || []);
                    }
                }
            } catch (err) {
                console.error('Gagal memuat detail guru:', err);
            } finally {
                setLoading(false);
            }
        }

        if (teacherId) {
            loadDetail();
        }
    }, [teacherId]);

    const handleSwitchTheme = (newTheme: 'light' | 'dark') => {
        setTheme(newTheme);
        localStorage.setItem('admin_active_theme', newTheme);
    };

    // Handler: Set Wali Kelas (Support One-to-Many)
    const handleAddHomeroom = async () => {
        if (!selectedClassForHomeroom) return alert('Pilih kelas terlebih dahulu!');
        try {
            await teacherService.updateHomeroomTeacher(selectedClassForHomeroom, teacherId);
            alert('Berhasil menetapkan wali kelas!');
            // Refresh data
            const detail = await teacherService.getTeacherDetail(teacherId);
            setHomeroomClasses(detail.homeroomClasses);
            setSelectedClassForHomeroom('');
        } catch (err: any) {
            alert('Gagal: ' + err.message);
        }
    };

    // Handler: Lepas Wali Kelas
    const handleRemoveHomeroom = async (classId: string) => {
        if (!confirm('Yakin ingin melepas status wali kelas ini?')) return;
        try {
            const { error } = await supabase
                .from('classes')
                .update({ homeroom_teacher_id: null })
                .eq('class_id', classId);

            if (error) throw error;
            alert('Wali kelas berhasil dilepas.');
            const detail = await teacherService.getTeacherDetail(teacherId);
            setHomeroomClasses(detail.homeroomClasses);
        } catch (err: any) {
            alert('Gagal: ' + err.message);
        }
    };

    // Handler: Tambah Penugasan Mengajar (Support Mode Kelas Spesifik & Mode Grade/Tingkat)
    const handleAddTeaching = async () => {
        if (!selectedSubjectForTeach) {
            alert('Pilih mata pelajaran terlebih dahulu!');
            return;
        }

        if (assignmentMode === 'class' && !selectedClassForTeach) {
            alert('Pilih kelas terlebih dahulu!');
            return;
        }

        if (assignmentMode === 'grade' && !selectedGradeForTeach) {
            alert('Pilih tingkat kelas terlebih dahulu!');
            return;
        }

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const { data: currentUser } = await supabase
                .from('users')
                .select('tenant_id')
                .eq('email', session?.user?.email)
                .single();

            // Tambahkan pengaman jika currentUser null
            if (!currentUser || !currentUser.tenant_id) {
                alert('Gagal mendapatkan informasi tenant user.');
                return;
            }

            const subObj = allSubjects.find((s) => s.subject_id === selectedSubjectForTeach);
            const subjectName = subObj?.subject_name || 'Mapel Umum';

            // Tentukan target kelas berdasarkan mode pilihan admin
            let targetClasses: any[] = [];
            if (assignmentMode === 'class') {
                const target = allClasses.find((c) => c.class_id === selectedClassForTeach);
                if (target) targetClasses.push(target);
            } else {
                // Mode Grade: Ambil seluruh kelas yang memiliki grade_level yang sama
                targetClasses = allClasses.filter((c) => c.grade_level === selectedGradeForTeach);
            }

            if (targetClasses.length === 0) {
                alert('Tidak ada kelas yang ditemukan untuk penugasan ini.');
                return;
            }

            // Loop dan daftarkan ke setiap kelas yang sesuai
            for (const cls of targetClasses) {
                await teacherService.assignTeacherClass({
                    tenantId: currentUser.tenant_id,
                    teacherId: teacherId,
                    classId: cls.class_id,
                    subjectId: selectedSubjectForTeach,
                    subjectName: subjectName,
                });
            }

            alert(`Berhasil menambahkan penugasan mengajar untuk ${targetClasses.length} kelas!`);
            const detail = await teacherService.getTeacherDetail(teacherId);
            setTeachingAssignments(detail.teachingAssignments);
            setSelectedClassForTeach('');
            setSelectedGradeForTeach('');
            setSelectedSubjectForTeach('');
        } catch (err: any) {
            alert('Gagal: ' + err.message);
        }
    };

    // Handler: Hapus Penugasan Mengajar
    const handleRemoveTeaching = async (assignmentId: string) => {
        if (!confirm('Hapus penugasan mapel ini?')) return;
        try {
            await teacherService.removeTeacherClass(assignmentId);
            alert('Penugasan berhasil dihapus.');
            const detail = await teacherService.getTeacherDetail(teacherId);
            setTeachingAssignments(detail.teachingAssignments);
        } catch (err: any) {
            alert('Gagal: ' + err.message);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-blue-100 font-sans">
                <p className="text-xs font-bold text-blue-800 animate-pulse">Memuat Profil & Assignment Guru...</p>
            </div>
        );
    }

    if (!teacher) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-2 p-4 text-center">
                <p className="text-xs font-bold text-red-600">Data guru tidak ditemukan.</p>
                <button onClick={() => router.back()} className="text-xs px-3 py-1 bg-blue-600 text-white rounded-lg">Kembali</button>
            </div>
        );
    }

    return (
        <div
            className="admin-theme-root min-h-screen font-sans flex flex-col justify-between select-none transition-colors duration-300"
            data-theme={theme}
            style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}
        >
            <div className="max-w-md w-full mx-auto p-4 space-y-4 pb-28">

                {/* NAVIGASI & SWITCHER */}
                <div className="flex justify-between items-center">
                    <button
                        onClick={() => router.push('/admin/settings/teachersetting')}
                        className="text-xs font-bold px-3 py-1.5 rounded-xl shadow border transition flex items-center gap-1 cursor-pointer"
                        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)', color: 'var(--text-main)' }}
                    >
                        <span>❮ Daftar Guru</span>
                    </button>

                    <button
                        onClick={() => handleSwitchTheme(theme === 'light' ? 'dark' : 'light')}
                        className="text-[11px] font-bold px-3 py-1.5 rounded-xl shadow border transition flex items-center gap-1.5 cursor-pointer"
                        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)', color: 'var(--text-main)' }}
                    >
                        <span>{theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}</span>
                    </button>
                </div>

                {/* PROFIL KARTU GURU */}
                <div
                    className="backdrop-blur-md rounded-2xl p-4 shadow-lg border space-y-3 relative transition-colors duration-300"
                    style={{ backgroundColor: 'var(--bg-header)', borderColor: 'var(--border-theme)' }}
                >
                    <div className="absolute top-3 right-3 z-10">
                        <span className="bg-emerald-400 text-emerald-950 text-[9px] font-extrabold px-2 py-0.5 rounded shadow-md uppercase tracking-wider border border-emerald-500">
                            CRUD Active
                        </span>
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                        <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-white/85 shadow-md bg-white shrink-0">
                            <img
                                src={teacher.avatar_url || '/icon/photo_id.png'}
                                alt="Avatar"
                                className="w-full h-full object-cover"
                                onError={(e) => { (e.target as HTMLImageElement).src = '/icon/teacher.png' }}
                            />
                        </div>
                        <div className="space-y-0.5 text-white flex-1 min-w-0">
                            <h1 className="font-extrabold text-sm tracking-tight leading-tight truncate">{teacher.full_name}</h1>
                            <p className="text-[11px] opacity-90 truncate">{teacher.email}</p>
                        </div>
                    </div>

                    {/* Tombol Toggle Detail Profil */}
                    <button
                        onClick={() => setShowProfileInfo(!showProfileInfo)}
                        className="w-full mt-2 text-[10px] font-bold bg-white/10 hover:bg-white/20 text-white py-1.5 rounded-lg border border-white/20 transition-all cursor-pointer flex justify-center items-center gap-1"
                    >
                        {showProfileInfo ? 'Tutup Detail Profil ' : 'Lihat Detail Profil '}
                    </button>

                    {/* Detail Profil Expandable */}
                    {showProfileInfo && (
                        <div className="bg-black/20 p-3 rounded-xl border border-white/10 space-y-1.5 text-[10px] text-white/90 font-mono mt-2 transition-all">
                            <div className="flex justify-between border-b border-white/10 pb-1"><span className="opacity-60">NIP:</span> <span className="font-bold">{teacher.nip || '-'}</span></div>
                            <div className="flex justify-between border-b border-white/10 pb-1"><span className="opacity-60">Role:</span> <span className="uppercase font-bold">{teacher.role || '-'}</span></div>
                            <div className="flex justify-between border-b border-white/10 pb-1"><span className="opacity-60">Telepon:</span> <span className="font-bold">{teacher.phone || '-'}</span></div>
                            <div className="flex justify-between border-b border-white/10 pb-1"><span className="opacity-60">Alamat:</span> <span className="text-right max-w-[65%] leading-tight font-bold">{teacher.address || '-'}</span></div>
                            <div className="flex justify-between"><span className="opacity-60">Pendidikan:</span> <span className="font-bold">{teacher.education || '-'}</span></div>
                        </div>
                    )}
                </div>

                {/* SECTION A: MANAJEMEN WALI KELAS (HOMEROOM) ACCORDION */}
                <div
                    className="rounded-2xl shadow-md border overflow-hidden transition-colors duration-300"
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)' }}
                >
                    <button
                        onClick={() => setIsHomeroomOpen(!isHomeroomOpen)}
                        className="w-full p-4 flex justify-between items-center cursor-pointer hover:bg-slate-500/5 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <h2 className="font-extrabold text-xs tracking-wide uppercase">Manajemen Wali Kelas</h2>
                            <span className="bg-blue-500/10 text-blue-600 text-[8px] font-bold px-1.5 py-0.5 rounded border border-blue-500/20">One-to-Many</span>
                        </div>
                        <span className="font-bold text-xs opacity-60">{isHomeroomOpen ? '∧' : '∨'}</span>
                    </button>

                    {isHomeroomOpen && (
                        <div className="p-4 pt-0 space-y-3 border-t" style={{ borderColor: 'var(--border-theme)' }}>
                            {/* List Kelas Wali Saat Ini */}
                            <div className="space-y-1.5 mt-3">
                                {homeroomClasses.length === 0 ? (
                                    <p className="text-[11px] opacity-60 italic">Belum bertindak sebagai wali kelas.</p>
                                ) : (
                                    homeroomClasses.map((cls) => (
                                        <div key={cls.class_id} className="flex justify-between items-center bg-blue-50/50 p-2 rounded-xl border border-blue-100 text-xs">
                                            <div>
                                                <span className="font-bold text-blue-950 uppercase">{cls.class_name}</span>
                                                <span className="text-[10px] text-blue-800 ml-2">({cls.grade_level || 'Tanpa Tingkat'})</span>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveHomeroom(cls.class_id)}
                                                className="text-[10px] bg-red-100 hover:bg-red-200 text-red-700 font-bold px-2 py-1 rounded-lg transition"
                                            >
                                                Lepas
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Form Tambah Wali Kelas */}
                            <div className="pt-2 border-t border-slate-200/50 flex gap-2">
                                <select
                                    value={selectedClassForHomeroom}
                                    onChange={(e) => setSelectedClassForHomeroom(e.target.value)}
                                    className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none"
                                >
                                    <option value="">-- Pilih Kelas untuk Wali --</option>
                                    {allClasses.map((cls) => (
                                        <option key={cls.class_id} value={cls.class_id}>
                                            {cls.class_name} {cls.grade_level ? `(Tingkat ${cls.grade_level})` : ''}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    onClick={handleAddHomeroom}
                                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow transition shrink-0 cursor-pointer"
                                >
                                    + Set Wali
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* SECTION B: MANAJEMEN PENUGASAN MENGAJAR (TEACHER CLASSES) ACCORDION */}
                <div
                    className="rounded-2xl shadow-md border overflow-hidden transition-colors duration-300"
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)' }}
                >
                    <button
                        onClick={() => setIsTeachingOpen(!isTeachingOpen)}
                        className="w-full p-4 flex justify-between items-center cursor-pointer hover:bg-slate-500/5 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <h2 className="font-extrabold text-xs tracking-wide uppercase">Penugasan Mengajar</h2>
                            <span className="bg-emerald-500/10 text-emerald-600 text-[8px] font-bold px-1.5 py-0.5 rounded border border-emerald-500/20">Smart Roster</span>
                        </div>
                        <span className="font-bold text-xs opacity-60">{isTeachingOpen ? '∧' : '∨'}</span>
                    </button>

                    {isTeachingOpen && (
                        <div className="p-4 pt-0 space-y-3 border-t" style={{ borderColor: 'var(--border-theme)' }}>
                            {/* List Assignment Mengajar */}
                            <div className="space-y-1.5 mt-3 max-h-48 overflow-y-auto pr-1">
                                {teachingAssignments.length === 0 ? (
                                    <p className="text-[11px] opacity-60 italic">Belum ada penugasan mata pelajaran.</p>
                                ) : (
                                    teachingAssignments.map((item) => (
                                        <div key={item.id} className="flex justify-between items-center bg-slate-50 p-2 rounded-xl border border-slate-200 text-xs">
                                            <div>
                                                <p className="font-bold text-slate-800 uppercase">{item.subject_name || item.subjects?.subject_name}</p>
                                                <p className="text-[10px] text-slate-500">Kelas: {item.classes?.class_name || 'Kelas Terhapus'}</p>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveTeaching(item.id)}
                                                className="text-[10px] bg-red-100 hover:bg-red-200 text-red-700 font-bold px-2 py-1 rounded-lg transition cursor-pointer"
                                            >
                                                Hapus
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Form Tambah Penugasan Mengajar */}
                            <div className="pt-2 border-t border-slate-200/50 space-y-2">

                                {/* Tombol Pilihan Mode Penugasan */}
                                <div className="flex gap-2 text-xs">
                                    <button
                                        type="button"
                                        onClick={() => setAssignmentMode('class')}
                                        className={`flex-1 py-1 rounded-lg font-bold border transition cursor-pointer ${assignmentMode === 'class' ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-100 text-slate-700 border-slate-200'}`}
                                    >
                                        Per Kelas Spesifik
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setAssignmentMode('grade')}
                                        className={`flex-1 py-1 rounded-lg font-bold border transition cursor-pointer ${assignmentMode === 'grade' ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-100 text-slate-700 border-slate-200'}`}
                                    >
                                        Berdasarkan Tingkat (Grade)
                                    </button>
                                </div>

                                {/* Kondisional Dropdown Input Berdasarkan Mode */}
                                {assignmentMode === 'class' ? (
                                    <select
                                        value={selectedClassForTeach}
                                        onChange={(e) => setSelectedClassForTeach(e.target.value)}
                                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none"
                                    >
                                        <option value="">-- Pilih Kelas --</option>
                                        {allClasses.map((cls) => (
                                            <option key={cls.class_id} value={cls.class_id}>
                                                {cls.class_name} {cls.grade_level ? `(Tingkat ${cls.grade_level})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <select
                                        value={selectedGradeForTeach}
                                        onChange={(e) => setSelectedGradeForTeach(e.target.value)}
                                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none"
                                    >
                                        <option value="">-- Pilih Tingkat (Grade) --</option>
                                        {uniqueGrades.map((grade) => (
                                            <option key={grade} value={grade}>
                                                Seluruh Kelas Tingkat {grade}
                                            </option>
                                        ))}
                                    </select>
                                )}

                                <select
                                    value={selectedSubjectForTeach}
                                    onChange={(e) => setSelectedSubjectForTeach(e.target.value)}
                                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none"
                                >
                                    <option value="">-- Pilih Mata Pelajaran --</option>
                                    {allSubjects.map((sub) => (
                                        <option key={sub.subject_id} value={sub.subject_id}>{sub.subject_name}</option>
                                    ))}
                                </select>

                                <button
                                    onClick={handleAddTeaching}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 rounded-xl shadow transition cursor-pointer"
                                >
                                    + Tambah Penugasan Mengajar
                                </button>
                            </div>
                        </div>
                    )}
                </div>

            </div>
            {/* BOTTOM NAV */}
             <BottomNav />
        </div>
        
    );
}