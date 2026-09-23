// ============================================================================
// HALAMAN DETAIL & PROFILING SISWA (STUDENT DETAIL PAGE)
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { uploadStudentPhoto } from '@/services/studentService'; // Import fungsi upload
import '@/style/admin-theme.css';

export default function StudentDetailPage() {
    const router = useRouter();
    const params = useParams();
    const studentId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [student, setStudent] = useState<any>(null);
    const [classList, setClassList] = useState<any[]>([]);

    // State Modal Edit
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editNis, setEditNis] = useState('');
    const [editFullName, setEditFullName] = useState('');
    const [editGender, setEditGender] = useState<'L' | 'P'>('L');
    const [editClassId, setEditClassId] = useState('');
    const [editPhotoUrl, setEditPhotoUrl] = useState('');
    const [photoFile, setPhotoFile] = useState<File | null>(null); // State file upload foto baru
    const [uploadingPhoto, setUploadingPhoto] = useState(false); // State indikator loading upload
    const [editPob, setEditPob] = useState('');
    const [editDob, setEditDob] = useState('');
    const [editAddress, setEditAddress] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [editPassword, setEditPassword] = useState('');

    useEffect(() => {
        const savedTheme = (localStorage.getItem('admin_active_theme') as 'light' | 'dark') || 'light';
        setTheme(savedTheme);

        async function loadStudentDetail() {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    router.replace('/login');
                    return;
                }

                // Ambil data siswa beserta is_first_login dan relasi kelasnya
                const { data: studentData, error } = await supabase
                    .from('students')
                    .select('*, classes(class_id, class_name, grade_level)')
                    .eq('student_id', studentId)
                    .single();

                if (error || !studentData) {
                    alert('Data siswa tidak ditemukan.');
                    router.replace('/admin/settings/studentsetting');
                    return;
                }

                setStudent(studentData);
                setEditNis(studentData.nis || '');
                setEditFullName(studentData.full_name || '');
                setEditGender(studentData.gender || 'L');
                setEditClassId(studentData.class_id || '');
                setEditPhotoUrl(studentData.photo_url || '');
                setEditPob(studentData.pob || '');
                setEditDob(studentData.dob || '');
                setEditAddress(studentData.address || '');
                setEditPhone(studentData.phone || '');
                setEditPassword(studentData.password || '');

                // Ambil daftar kelas untuk dropdown edit
                const { data: classesData } = await supabase
                    .from('classes')
                    .select('class_id, class_name')
                    .eq('tenant_id', studentData.tenant_id);

                if (classesData) {
                    setClassList(classesData);
                }
            } catch (err) {
                console.error('Gagal memuat detail siswa:', err);
            } finally {
                setLoading(false);
            }
        }

        if (studentId) {
            loadStudentDetail();
        }
    }, [studentId, router]);

    const handleSwitchTheme = (newTheme: 'light' | 'dark') => {
        setTheme(newTheme);
        localStorage.setItem('admin_active_theme', newTheme);
    };

    // Handler Update Profil Siswa dengan Integrasi Upload Foto
    const handleUpdateStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setUploadingPhoto(true);
            let finalPhotoUrl = editPhotoUrl;

            // Jika admin memilih file foto baru, lakukan upload ke bucket storage
            if (photoFile) {
                finalPhotoUrl = await uploadStudentPhoto(photoFile);
            }

            const { error } = await supabase
                .from('students')
                .update({
                    nis: editNis,
                    full_name: editFullName,
                    gender: editGender,
                    class_id: editClassId || null,
                    photo_url: finalPhotoUrl || null,
                    pob: editPob || null,
                    dob: editDob || null,
                    address: editAddress || null,
                    phone: editPhone || null,
                    password: editPassword || null,
                })
                .eq('student_id', studentId);

            if (error) throw error;

            alert('Profil siswa berhasil diperbarui!');
            setIsEditModalOpen(false);
            setPhotoFile(null);

            // Reload data siswa terbaru
            const { data: updated } = await supabase
                .from('students')
                .select('*, classes(class_id, class_name, grade_level)')
                .eq('student_id', studentId)
                .single();
            if (updated) setStudent(updated);

        } catch (err: any) {
            alert('Gagal mengupdate: ' + err.message);
        } finally {
            setUploadingPhoto(false);
        }
    };

    // Handler Hapus Siswa
    const handleDeleteStudent = async () => {
        const confirmDelete = window.confirm(`Apakah Anda yakin ingin menghapus siswa "${student?.full_name}"? Tindakan ini tidak dapat dibatalkan.`);
        if (!confirmDelete) return;

        try {
            const { error } = await supabase
                .from('students')
                .delete()
                .eq('student_id', studentId);

            if (error) throw error;

            alert('Siswa berhasil dihapus.');
            router.replace('/admin/settings/studentsetting');
        } catch (err: any) {
            alert('Gagal menghapus siswa: ' + err.message);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-blue-100 font-sans">
                <p className="text-xs font-bold text-blue-800 animate-pulse">Memuat Profil Lengkap Siswa...</p>
            </div>
        );
    }

    if (!student) return null;

    return (
        <div
            className="admin-theme-root min-h-screen font-sans flex flex-col justify-between select-none transition-colors duration-300"
            data-theme={theme}
            style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}
        >
            <div className="max-w-3xl w-full mx-auto p-4 sm:p-6 space-y-4 pb-28">
                
                {/* HEADER NAVIGATION */}
                <div className="flex justify-between items-center">
                    <button
                        onClick={() => router.push('/admin/settings/studentsetting')}
                        className="text-xs font-bold px-3 py-1.5 rounded-xl shadow border transition flex items-center gap-1 cursor-pointer"
                        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)', color: 'var(--text-main)' }}
                    >
                        <span>← Kembali ke Manajemen Siswa</span>
                    </button>

                    <button
                        onClick={() => handleSwitchTheme(theme === 'light' ? 'dark' : 'light')}
                        className="text-[11px] font-bold px-3 py-1.5 rounded-xl shadow border transition flex items-center gap-1.5 cursor-pointer"
                        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)', color: 'var(--text-main)' }}
                    >
                        <span>{theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}</span>
                    </button>
                </div>

                {/* PROFIL CARD UTAMA */}
                <div
                    className="rounded-2xl p-6 shadow-md border space-y-6 relative"
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)' }}
                >
                    {/* Tombol Aksi Edit & Hapus di Pojok Kanan Atas */}
                    <div className="absolute top-5 right-5 flex gap-2">
                        <button
                            onClick={() => setIsEditModalOpen(true)}
                            className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-amber-500 hover:bg-amber-600 text-amber-950 shadow transition cursor-pointer flex items-center gap-1"
                        >
                            ✏️ Edit
                        </button>
                        <button
                            onClick={handleDeleteStudent}
                            className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-rose-600 hover:bg-rose-700 text-white shadow transition cursor-pointer flex items-center gap-1"
                        >
                            🗑️ Hapus
                        </button>
                    </div>

                    {/* Info Foto & Identitas Utama */}
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 pt-2">
                        <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 shadow-md flex-shrink-0 bg-slate-200 flex items-center justify-center" style={{ borderColor: 'var(--border-theme)' }}>
                            {student.photo_url ? (
                                <img src={student.photo_url} alt={student.full_name} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-2xl font-extrabold text-slate-400">
                                    {student.full_name?.charAt(0) || 'S'}
                                </span>
                            )}
                        </div>

                        <div className="space-y-1.5 text-center sm:text-left">
                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-500/20 text-blue-600 dark:text-blue-400">
                                {student.classes?.class_name || 'Belum Ada Kelas'}
                            </span>
                            <h1 className="text-lg font-extrabold tracking-wide uppercase" style={{ color: 'var(--text-main)' }}>
                                {student.full_name}
                            </h1>
                            <p className="text-xs font-mono font-bold" style={{ color: 'var(--text-muted)' }}>
                                NIS: {student.nis}
                            </p>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                Jenis Kelamin: {student.gender === 'P' ? 'Perempuan (P)' : 'Laki-laki (L)'}
                            </p>
                        </div>
                    </div>

                    <hr style={{ borderColor: 'var(--border-theme)' }} />

                    {/* GRID DETAIL PROFILING */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div className="p-3 rounded-xl border" style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-theme)' }}>
                            <span className="block text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Tempat, Tanggal Lahir</span>
                            <span className="font-bold mt-0.5 block" style={{ color: 'var(--text-main)' }}>
                                {student.pob || '-'}, {student.dob ? new Date(student.dob).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                            </span>
                        </div>

                        <div className="p-3 rounded-xl border" style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-theme)' }}>
                            <span className="block text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Nomor Telepon / WhatsApp</span>
                            <span className="font-bold mt-0.5 block font-mono" style={{ color: 'var(--text-main)' }}>
                                {student.phone || '-'}
                            </span>
                        </div>

                        <div className="p-3 rounded-xl border sm:col-span-2" style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-theme)' }}>
                            <span className="block text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Alamat Lengkap</span>
                            <span className="font-bold mt-0.5 block" style={{ color: 'var(--text-main)' }}>
                                {student.address || '-'}
                            </span>
                        </div>

                        <div className="p-3 rounded-xl border sm:col-span-2" style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-theme)' }}>
                            <span className="block text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Status / Password Login Siswa</span>
                            <span className="font-bold mt-0.5 block font-mono bg-black/5 dark:bg-white/5 p-1.5 rounded text-amber-600 dark:text-amber-400">
                                {student.is_first_login === false ? '🔒 Password sudah diubah oleh siswa' : (student.password || '(Belum diset / Default)')}
                            </span>
                        </div>
                    </div>

                </div>

            </div>

            {/* MODAL EDIT SISWA */}
            {isEditModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 text-slate-800 shadow-2xl my-8">
                        <h2 className="font-extrabold text-sm uppercase text-slate-800">Edit Profil Siswa</h2>

                        <form onSubmit={handleUpdateStudent} className="space-y-3 text-xs">
                            <div>
                                <label className="font-bold text-slate-600 block mb-1">Kelas:</label>
                                <select
                                    value={editClassId}
                                    onChange={(e) => setEditClassId(e.target.value)}
                                    className="w-full p-2 border rounded-xl outline-none bg-white"
                                >
                                    <option value="">-- Tanpa Kelas --</option>
                                    {classList.map(c => (
                                        <option key={c.class_id} value={c.class_id}>{c.class_name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="font-bold text-slate-600 block mb-1">NIS:</label>
                                <input
                                    type="text"
                                    value={editNis}
                                    onChange={(e) => setEditNis(e.target.value)}
                                    className="w-full p-2 border rounded-xl outline-none"
                                    required
                                />
                            </div>

                            <div>
                                <label className="font-bold text-slate-600 block mb-1">Nama Lengkap:</label>
                                <input
                                    type="text"
                                    value={editFullName}
                                    onChange={(e) => setEditFullName(e.target.value)}
                                    className="w-full p-2 border rounded-xl outline-none"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="font-bold text-slate-600 block mb-1">Gender:</label>
                                    <select
                                        value={editGender}
                                        onChange={(e) => setEditGender(e.target.value as 'L' | 'P')}
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
                                        value={editPhone}
                                        onChange={(e) => setEditPhone(e.target.value)}
                                        className="w-full p-2 border rounded-xl outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="font-bold text-slate-600 block mb-1">Tempat Lahir (pob):</label>
                                    <input
                                        type="text"
                                        value={editPob}
                                        onChange={(e) => setEditPob(e.target.value)}
                                        className="w-full p-2 border rounded-xl outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="font-bold text-slate-600 block mb-1">Tanggal Lahir (dob):</label>
                                    <input
                                        type="date"
                                        value={editDob ? editDob.split('T')[0] : ''}
                                        onChange={(e) => setEditDob(e.target.value)}
                                        className="w-full p-2 border rounded-xl outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="font-bold text-slate-600 block mb-1">Alamat (address):</label>
                                <textarea
                                    rows={2}
                                    value={editAddress}
                                    onChange={(e) => setEditAddress(e.target.value)}
                                    className="w-full p-2 border rounded-xl outline-none"
                                />
                            </div>

                            {/* Ganti Input Teks URL Menjadi File Upload */}
                            <div>
                                <label className="font-bold text-slate-600 block mb-1">Ganti Foto Siswa (Opsional):</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                            setPhotoFile(e.target.files[0]);
                                        }
                                    }}
                                    className="w-full p-1 border rounded-xl outline-none text-xs file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                                />
                                <span className="text-[10px] text-slate-400 mt-1 block">
                                    {uploadingPhoto ? 'Sedang mengunggah foto baru...' : 'Biarkan kosong jika tidak ingin mengubah foto.'}
                                </span>
                            </div>

                            <div className="flex gap-2 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="flex-1 py-2 bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={uploadingPhoto}
                                    className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-amber-950 rounded-xl font-bold cursor-pointer disabled:opacity-50"
                                >
                                    {uploadingPhoto ? 'Menyimpan...' : 'Simpan Perubahan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}