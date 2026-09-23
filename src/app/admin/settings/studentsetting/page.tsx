// ============================================================================
// HALAMAN MANAJEMEN SISWA GLOBAL (STUDENT SETTING)
// ============================================================================

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
    fetchGlobalStudentsManagement,
    addSingleStudentToClass,
    bulkUpsertStudentsGlobal,
    bulkUpdateStudentClass,
    uploadStudentPhoto,
} from '@/services/studentService';
import '@/style/admin-theme.css';

export default function StudentSettingPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [theme, setTheme] = useState<'light' | 'dark'>('light');

    // State Tenant & Data Global
    const [tenantId, setTenantId] = useState<string>('');
    const [classList, setClassList] = useState<{ class_id: string; class_name: string; grade_level?: string }[]>([]);
    const [students, setStudents] = useState<any[]>([]);

    // State Search, Filter, & Pagination
    const [searchQuery, setSearchQuery] = useState('');
    const [filterClassId, setFilterClassId] = useState('ALL');
    const [filterGradeLevel, setFilterGradeLevel] = useState('ALL');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // State Modal
    const [isSingleModalOpen, setIsSingleModalOpen] = useState(false);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);

    // Form Input Single Student
    const [formClassId, setFormClassId] = useState('');
    const [nisInput, setNisInput] = useState('');
    const [nameInput, setNameInput] = useState('');
    const [genderInput, setGenderInput] = useState<'L' | 'P'>('L');
    
    // State Biodata Tambahan & Foto
    const [phoneInput, setPhoneInput] = useState('');
    const [pobInput, setPobInput] = useState('');
    const [dobInput, setDobInput] = useState('');
    const [addressInput, setAddressInput] = useState('');
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);

    // Form Input Bulk
    const [bulkClassId, setBulkClassId] = useState('');
    const [bulkRawText, setBulkRawText] = useState('');

    // Form Input Dispatch (Multi-select / Pindah Kelas Massal)
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [targetDispatchClassId, setTargetDispatchClassId] = useState('');

    useEffect(() => {
        const savedTheme = (localStorage.getItem('admin_active_theme') as 'light' | 'dark') || 'light';
        setTheme(savedTheme);

        async function initData() {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session || !session.user.email) {
                    router.replace('/login');
                    return;
                }

                const { data: userData } = await supabase
                    .from('users')
                    .select('tenant_id')
                    .eq('email', session.user.email)
                    .single();

                if (userData && userData.tenant_id) {
                    setTenantId(userData.tenant_id);

                    // Ambil daftar kelas
                    const { data: classesData } = await supabase
                        .from('classes')
                        .select('class_id, class_name, grade_level')
                        .eq('tenant_id', userData.tenant_id)
                        .order('class_name', { ascending: true });

                    if (classesData) {
                        setClassList(classesData);
                        if (classesData.length > 0) {
                            setFormClassId(classesData[0].class_id);
                            setBulkClassId(classesData[0].class_id);
                            setTargetDispatchClassId(classesData[0].class_id);
                        }
                    }

                    // Load global students
                    const studentData = await fetchGlobalStudentsManagement(userData.tenant_id);
                    setStudents(studentData);
                }
            } catch (err) {
                console.error('Gagal memuat data:', err);
            } finally {
                setLoading(false);
            }
        }

        initData();
    }, [router]);

    const handleSwitchTheme = (newTheme: 'light' | 'dark') => {
        setTheme(newTheme);
        localStorage.setItem('admin_active_theme', newTheme);
    };

    const reloadStudents = async () => {
        if (!tenantId) return;
        const data = await fetchGlobalStudentsManagement(tenantId);
        setStudents(data);
    };

    // Filter & Search Logic
    const filteredStudents = useMemo(() => {
        return students.filter((s) => {
            const matchesSearch =
                s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.nis?.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesClass = filterClassId === 'ALL' || s.class_id === filterClassId;
            const matchesGrade = filterGradeLevel === 'ALL' || s.classes?.grade_level === filterGradeLevel;

            return matchesSearch && matchesClass && matchesGrade;
        });
    }, [students, searchQuery, filterClassId, filterGradeLevel]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredStudents.length / itemsPerPage) || 1;
    const paginatedStudents = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredStudents.slice(start, start + itemsPerPage);
    }, [filteredStudents, currentPage]);

    // Handler Tambah Single yang dimodifikasi
    const handleAddSingle = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nisInput || !nameInput) {
            alert('NIS dan Nama Siswa wajib diisi!');
            return;
        }

        try {
            setUploadingPhoto(true);
            let finalPhotoUrl = '';

            // Jika admin memilih file foto, upload dulu ke Supabase Storage
            if (photoFile) {
                finalPhotoUrl = await uploadStudentPhoto(photoFile);
            }

            await addSingleStudentToClass(
                tenantId,
                formClassId,
                nisInput,
                nameInput,
                genderInput,
                finalPhotoUrl // Masukkan URL hasil upload storage
            );

            alert('Siswa berhasil ditambahkan!');
            setIsSingleModalOpen(false);
            setNisInput('');
            setNameInput('');
            setGenderInput('L');
            setPhoneInput('');
            setPobInput('');
            setDobInput('');
            setAddressInput('');
            setPhotoFile(null); // Reset file state
            reloadStudents();
        } catch (err: any) {
            alert('Gagal: ' + err.message);
        } finally {
            setUploadingPhoto(false);
        }
    };

    // Handler Bulk Excel
    const handleBulkSubmit = async () => {
        if (!bulkRawText.trim()) {
            alert('Data paste kosong!');
            return;
        }
        try {
            const lines = bulkRawText.split('\n');
            const parsed: { nis: string; full_name: string; gender?: 'L' | 'P' }[] = [];
            for (const line of lines) {
                if (!line.trim()) continue;
                const cols = line.split(/\t|,/);
                if (cols.length >= 2) {
                    parsed.push({
                        nis: cols[0].trim(),
                        full_name: cols[1].trim(),
                        gender: (cols[2]?.trim().toUpperCase() === 'P' ? 'P' : 'L') as 'L' | 'P',
                    });
                }
            }
            if (parsed.length === 0) {
                alert('Format tidak valid.');
                return;
            }
            await bulkUpsertStudentsGlobal(tenantId, bulkClassId, parsed);
            alert(`Berhasil mengimpor ${parsed.length} siswa!`);
            setIsBulkModalOpen(false);
            setBulkRawText('');
            reloadStudents();
        } catch (err: any) {
            alert('Gagal import: ' + err.message);
        }
    };

    // Handler Checkbox Select All / Single
    const toggleSelectStudent = (id: string) => {
        setSelectedStudentIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleExecuteDispatch = async () => {
        if (selectedStudentIds.length === 0 || !targetDispatchClassId) {
            alert('Pilih minimal 1 siswa dan tentukan kelas tujuan!');
            return;
        }
        try {
            await bulkUpdateStudentClass(selectedStudentIds, targetDispatchClassId);
            alert(`Berhasil memindahkan ${selectedStudentIds.length} siswa ke kelas baru!`);
            setSelectedStudentIds([]);
            setIsDispatchModalOpen(false);
            reloadStudents();
        } catch (err: any) {
            alert('Gagal dispatch: ' + err.message);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-blue-100 font-sans">
                <p className="text-xs font-bold text-blue-800 animate-pulse">Memuat Data Global Siswa...</p>
            </div>
        );
    }

    // Ekstrak unique grade levels untuk filter
    const uniqueGrades = Array.from(new Set(classList.map(c => c.grade_level).filter(Boolean)));

    return (
        <div
            className="admin-theme-root min-h-screen font-sans flex flex-col justify-between select-none transition-colors duration-300"
            data-theme={theme}
            style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}
        >
            <div className="max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-4 pb-28">

                {/* HEADER */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="text-xs font-bold px-3 py-1.5 rounded-xl shadow border transition flex items-center gap-1 cursor-pointer"
                        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)', color: 'var(--text-main)' }}
                    >
                        <span>← Kembali ke Dashboard</span>
                    </button>

                    <button
                        onClick={() => handleSwitchTheme(theme === 'light' ? 'dark' : 'light')}
                        className="text-[11px] font-bold px-3 py-1.5 rounded-xl shadow border transition flex items-center gap-1.5 cursor-pointer"
                        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)', color: 'var(--text-main)' }}
                    >
                        <span>{theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}</span>
                    </button>
                </div>

                {/* TITLE CARD */}
                <div
                    className="backdrop-blur-md rounded-2xl p-4 sm:p-5 shadow-lg border relative transition-colors duration-300"
                    style={{ backgroundColor: 'var(--bg-header)', borderColor: 'var(--border-theme)' }}
                >
                    <div className="absolute top-3 right-3 z-10">
                        <span className="bg-emerald-400 text-emerald-950 text-[9px] font-extrabold px-2 py-0.5 rounded shadow-md uppercase tracking-wider border border-emerald-500">
                            Global List Mode
                        </span>
                    </div>
                    <h1 className="text-white font-extrabold text-sm sm:text-base tracking-wide uppercase">MANAJEMEN SISWA GLOBAL</h1>
                    <p className="text-white/80 text-xs mt-0.5">Pusat data seluruh siswa dari berbagai kelas dengan pencarian dan filter cepat.</p>
                </div>

                {/* CARD 1: ACTION BUTTONS (CRUD & UTILITIES) */}
                <div
                    className="rounded-2xl p-4 shadow-md border flex flex-wrap gap-2 items-center justify-between"
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)' }}
                >
                    <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                        <button
                            onClick={() => setIsSingleModalOpen(true)}
                            className="flex-1 sm:flex-none py-2 px-4 rounded-xl text-xs font-extrabold text-white shadow transition cursor-pointer text-center"
                            style={{ backgroundColor: 'var(--accent-btn)' }}
                        >
                            + Tambah Siswa
                        </button>
                        <button
                            onClick={() => setIsBulkModalOpen(true)}
                            className="flex-1 sm:flex-none py-2 px-4 rounded-xl text-xs font-extrabold bg-amber-500 hover:bg-amber-600 text-amber-950 shadow transition cursor-pointer text-center"
                        >
                            📋 Bulk Add (Excel)
                        </button>
                    </div>
                    <button
                        onClick={() => setIsDispatchModalOpen(true)}
                        className="w-full sm:w-auto py-2 px-4 rounded-xl text-xs font-extrabold bg-purple-600 hover:bg-purple-700 text-white shadow transition cursor-pointer text-center"
                    >
                        📦 Penempatan Kelas ({selectedStudentIds.length} dipilih)
                    </button>
                </div>

                {/* CARD 2: SEARCH & FILTER BAR */}
                <div
                    className="rounded-2xl p-4 shadow-md border space-y-3"
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)' }}
                >
                    <h2 className="font-extrabold text-xs uppercase tracking-wide" style={{ color: 'var(--text-main)' }}>
                        Filter & Pencarian Data
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label className="text-[11px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--text-muted)' }}>
                                Cari Nama / NIS:
                            </label>
                            <input
                                type="text"
                                placeholder="Ketik nama atau NIS..."
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                className="w-full p-2 rounded-xl border text-xs outline-none"
                                style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-theme)', color: 'var(--text-main)' }}
                            />
                        </div>

                        <div>
                            <label className="text-[11px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--text-muted)' }}>
                                Filter Kelas:
                            </label>
                            <select
                                value={filterClassId}
                                onChange={(e) => { setFilterClassId(e.target.value); setCurrentPage(1); }}
                                className="w-full p-2 rounded-xl border text-xs outline-none cursor-pointer"
                                style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-theme)', color: 'var(--text-main)' }}
                            >
                                <option value="ALL">Semua Kelas (Global)</option>
                                {classList.map(c => (
                                    <option key={c.class_id} value={c.class_id}>{c.class_name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-[11px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--text-muted)' }}>
                                Filter Tingkat (Grade):
                            </label>
                            <select
                                value={filterGradeLevel}
                                onChange={(e) => { setFilterGradeLevel(e.target.value); setCurrentPage(1); }}
                                className="w-full p-2 rounded-xl border text-xs outline-none cursor-pointer"
                                style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-theme)', color: 'var(--text-main)' }}
                            >
                                <option value="ALL">Semua Tingkat</option>
                                {uniqueGrades.map((g, idx) => (
                                    <option key={idx} value={g}>Tingkat {g}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* CARD 3: GLOBAL STUDENTS TABLE */}
                <div
                    className="rounded-2xl p-4 shadow-md border space-y-3"
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)' }}
                >
                    <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: 'var(--border-theme)' }}>
                        <h2 className="font-extrabold text-xs uppercase tracking-wide" style={{ color: 'var(--text-main)' }}>
                            Daftar Siswa ({filteredStudents.length})
                        </h2>
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-blue-500/20 text-blue-500">
                            Page {currentPage} of {totalPages}
                        </span>
                    </div>

                    {paginatedStudents.length === 0 ? (
                        <p className="text-center text-xs py-8" style={{ color: 'var(--text-muted)' }}>
                            Tidak ada data siswa yang cocok dengan pencarian atau filter Anda.
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="border-b" style={{ borderColor: 'var(--border-theme)', color: 'var(--text-muted)' }}>
                                        <th className="p-3 w-8 text-center" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedStudentIds(paginatedStudents.map(s => s.student_id));
                                                    } else {
                                                        setSelectedStudentIds([]);
                                                    }
                                                }}
                                                checked={paginatedStudents.length > 0 && paginatedStudents.every(s => selectedStudentIds.includes(s.student_id))}
                                                className="cursor-pointer"
                                            />
                                        </th>
                                        <th className="p-3">NIS</th>
                                        <th className="p-3">Nama Lengkap</th>
                                        <th className="p-3">Gender</th>
                                        <th className="p-3">Kelas</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedStudents.map((s) => (
                                        <tr
                                            key={s.student_id}
                                            onClick={() => router.push(`/admin/settings/studentsetting/${s.student_id}`)}
                                            className="border-b transition hover:bg-black/5 cursor-pointer group"
                                            style={{ borderColor: 'var(--border-theme)' }}
                                        >
                                            <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedStudentIds.includes(s.student_id)}
                                                    onChange={() => toggleSelectStudent(s.student_id)}
                                                    className="cursor-pointer"
                                                />
                                            </td>
                                            <td className="p-3 font-mono font-bold group-hover:text-blue-500 transition-colors">{s.nis}</td>
                                            <td className="p-3 font-bold group-hover:text-blue-500 transition-colors">{s.full_name}</td>
                                            <td className="p-3">{s.gender || 'L'}</td>
                                            <td className="p-3">
                                                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-500/20 text-blue-600 dark:text-blue-400">
                                                    {s.classes?.class_name || 'Belum Ada Kelas'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* PAGINATION CONTROLS */}
                    {totalPages > 1 && (
                        <div className="flex justify-between items-center pt-2">
                            <button
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                className="px-3 py-1 rounded border text-xs font-bold disabled:opacity-40 cursor-pointer"
                                style={{ borderColor: 'var(--border-theme)' }}
                            >
                                ← Sebelumnya
                            </button>
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                Halaman {currentPage} dari {totalPages}
                            </span>
                            <button
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                className="px-3 py-1 rounded border text-xs font-bold disabled:opacity-40 cursor-pointer"
                                style={{ borderColor: 'var(--border-theme)' }}
                            >
                                Berikutnya →
                            </button>
                        </div>
                    )}
                </div>

            </div>

            {/* MODAL TAMBAH SINGLE SISWA */}
            {isSingleModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 text-slate-800 shadow-2xl my-8">
                        <h2 className="font-extrabold text-sm uppercase text-slate-800">Tambah Siswa Baru</h2>
                        <form onSubmit={handleAddSingle} className="space-y-3 text-xs">
                            <div>
                                <label className="font-bold text-slate-600 block mb-1">Tentukan Kelas:</label>
                                <select
                                    value={formClassId}
                                    onChange={(e) => setFormClassId(e.target.value)}
                                    className="w-full p-2 border rounded-xl outline-none bg-white"
                                    required
                                >
                                    <option value="">-- Pilih Kelas --</option>
                                    {classList.map(c => (
                                        <option key={c.class_id} value={c.class_id}>{c.class_name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="font-bold text-slate-600 block mb-1">
                                    NIS: <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={nisInput}
                                    onChange={(e) => setNisInput(e.target.value)}
                                    className="w-full p-2 border rounded-xl outline-none focus:border-blue-600"
                                    placeholder="Contoh: 100234"
                                    required
                                />
                            </div>

                            <div>
                                <label className="font-bold text-slate-600 block mb-1">
                                    Nama Lengkap: <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={nameInput}
                                    onChange={(e) => setNameInput(e.target.value)}
                                    className="w-full p-2 border rounded-xl outline-none focus:border-blue-600"
                                    placeholder="Nama lengkap siswa"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="font-bold text-slate-600 block mb-1">
                                        Jenis Kelamin: <span className="text-rose-500">*</span>
                                    </label>
                                    <select
                                        value={genderInput}
                                        onChange={(e) => setGenderInput(e.target.value as 'L' | 'P')}
                                        className="w-full p-2 border rounded-xl outline-none bg-white"
                                    >
                                        <option value="L">Laki-laki (L)</option>
                                        <option value="P">Perempuan (P)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="font-bold text-slate-600 block mb-1">No. Telp / WA:</label>
                                    <input
                                        type="text"
                                        value={phoneInput}
                                        onChange={(e) => setPhoneInput(e.target.value)}
                                        className="w-full p-2 border rounded-xl outline-none"
                                        placeholder="Opsional"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="font-bold text-slate-600 block mb-1">Tempat Lahir:</label>
                                    <input
                                        type="text"
                                        value={pobInput}
                                        onChange={(e) => setPobInput(e.target.value)}
                                        className="w-full p-2 border rounded-xl outline-none"
                                        placeholder="Kota Kelahiran"
                                    />
                                </div>
                                <div>
                                    <label className="font-bold text-slate-600 block mb-1">Tanggal Lahir:</label>
                                    <input
                                        type="date"
                                        value={dobInput}
                                        onChange={(e) => setDobInput(e.target.value)}
                                        className="w-full p-2 border rounded-xl outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="font-bold text-slate-600 block mb-1">Alamat Lengkap:</label>
                                <textarea
                                    rows={2}
                                    value={addressInput}
                                    onChange={(e) => setAddressInput(e.target.value)}
                                    className="w-full p-2 border rounded-xl outline-none"
                                    placeholder="Alamat rumah siswa"
                                />
                            </div>

                            <div>
                                <label className="font-bold text-slate-600 block mb-1">Foto Formal Siswa:</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                            setPhotoFile(e.target.files[0]);
                                        }
                                    }}
                                    className="w-full p-1.5 border rounded-xl outline-none text-xs file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                                />
                                <span className="text-[10px] text-slate-400 mt-1 block">
                                    {uploadingPhoto ? 'Sedang mengunggah foto...' : 'Format: JPG, PNG, atau JPEG (Opsional)'}
                                </span>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsSingleModalOpen(false)}
                                    className="flex-1 py-2 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition cursor-pointer"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={uploadingPhoto}
                                    className="flex-1 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition cursor-pointer disabled:opacity-50"
                                >
                                    {uploadingPhoto ? 'Menyimpan...' : 'Simpan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL BULK ADD (EXCEL) */}
            {isBulkModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-3 text-slate-800 shadow-2xl">
                        <div className="flex justify-between items-center">
                            <h2 className="font-extrabold text-sm uppercase">Bulk Add Siswa (Paste Excel)</h2>
                        </div>
                        <div>
                            <label className="font-bold text-slate-600 text-xs block mb-1">Masukkan ke Kelas:</label>
                            <select
                                value={bulkClassId}
                                onChange={(e) => setBulkClassId(e.target.value)}
                                className="w-full p-2 border rounded-xl outline-none bg-white text-xs"
                            >
                                <option value="">-- Tanpa Kelas / Pilih Nanti --</option>
                                {classList.map(c => (
                                    <option key={c.class_id} value={c.class_id}>{c.class_name}</option>
                                ))}
                            </select>
                        </div>
                        <p className="text-[11px] text-slate-500">
                            Format Kolom Excel: <b>NIS</b> | <b>Nama Lengkap</b> | <b>Gender [L/P]</b>
                        </p>
                        <textarea
                            rows={5}
                            value={bulkRawText}
                            onChange={(e) => setBulkRawText(e.target.value)}
                            placeholder="1001	Budi Santoso	L&#10;1002	Siti Aminah	P"
                            className="w-full p-2.5 border rounded-xl font-mono text-xs outline-none focus:border-blue-600"
                        />
                        <div className="flex gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setIsBulkModalOpen(false)}
                                className="flex-1 py-2 bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleBulkSubmit}
                                className="flex-1 py-2 bg-amber-500 text-amber-950 rounded-xl font-bold text-xs cursor-pointer"
                            >
                                Proses Import Masal
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DISPATCH / PINDAH KELAS MASSAL */}
            {isDispatchModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-3 text-slate-800 shadow-2xl">
                        <h2 className="font-extrabold text-sm uppercase">Dispatch / Pindah Kelas Massal</h2>
                        <p className="text-[11px] text-slate-500">
                            Memindahkan <b>{selectedStudentIds.length} siswa</b> yang telah dicentang ke kelas baru:
                        </p>
                        <div className="space-y-2 text-xs">
                            <label className="font-bold text-slate-600 block">Pilih Kelas Tujuan:</label>
                            <select
                                value={targetDispatchClassId}
                                onChange={(e) => setTargetDispatchClassId(e.target.value)}
                                className="w-full p-2 border rounded-xl outline-none bg-white"
                            >
                                <option value="">-- Pilih Kelas Tujuan --</option>
                                {classList.map(c => (
                                    <option key={c.class_id} value={c.class_id}>{c.class_name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex gap-2 pt-3">
                            <button
                                type="button"
                                onClick={() => setIsDispatchModalOpen(false)}
                                className="flex-1 py-2 bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleExecuteDispatch}
                                className="flex-1 py-2 bg-purple-600 text-white rounded-xl font-bold text-xs cursor-pointer"
                            >
                                Pindahkan Sekarang
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}