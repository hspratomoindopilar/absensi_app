// ============================================================================
// HALAMAN IMPORT SPREADSHEET INTERAKTIF SISWA
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { bulkUpsertStudentsGlobal } from '@/services/studentService';
import '@/style/admin-theme.css';

interface StudentRow {
    id: number;
    nis: string;
    full_name: string;
    gender: 'L' | 'P';
    phone: string;
    pob: string;
    dob: string; // Bisa menampung teks bebas/format Indonesia dulu sebelum diconvert
    address: string;
}

// Helper untuk konversi format tanggal DD-MM-YYYY ke YYYY-MM-DD
function parseIndonesianDate(dateStr: string): string {
    if (!dateStr) return '';
    const cleaned = dateStr.trim();
    const parts = cleaned.split(/[-/.]/);

    if (parts.length === 3) {
        let [day, month, year] = parts;
        if (year.length === 2) {
            year = '20' + year;
        }
        if (day.length === 2 && month.length === 2 && year.length === 4) {
            return `${year}-${month}-${day}`;
        }
    }
    return cleaned;
}

export default function BulkStudentPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [tenantId, setTenantId] = useState<string>('');
    const [classList, setClassList] = useState<{ class_id: string; class_name: string }[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [submitting, setSubmitting] = useState(false);

    // State Spreadsheet Rows (Inisialisasi 5 baris kosong pertama)
    const [rows, setRows] = useState<StudentRow[]>(
        Array.from({ length: 5 }, (_, index) => ({
            id: index + 1,
            nis: '',
            full_name: '',
            gender: 'L',
            phone: '',
            pob: '',
            dob: '',
            address: '',
        }))
    );

    useEffect(() => {
        const savedTheme = (localStorage.getItem('admin_active_theme') as 'light' | 'dark') || 'light';
        setTheme(savedTheme);

        async function init() {
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

                    const { data: classesData } = await supabase
                        .from('classes')
                        .select('class_id, class_name')
                        .eq('tenant_id', userData.tenant_id)
                        .order('class_name', { ascending: true });

                    if (classesData) {
                        setClassList(classesData);
                        
                    }
                }
            } catch (err) {
                console.error('Gagal memuat inisialisasi:', err);
            } finally {
                setLoading(false);
            }
        }
        init();
    }, [router]);

    // Handle perubahan nilai dalam sel tabel
    const handleCellChange = (id: number, field: keyof StudentRow, value: string) => {
        setRows(prev =>
            prev.map(row => (row.id === id ? { ...row, [field]: value } : row))
        );
    };

    // Tambah baris baru ke bawah
    const handleAddRows = (count: number = 5) => {
        setRows(prev => {
            const lastId = prev.length > 0 ? prev[prev.length - 1].id : 0;
            const newRows: StudentRow[] = Array.from({ length: count }, (_, index) => ({
                id: lastId + index + 1,
                nis: '',
                full_name: '',
                gender: 'L',
                phone: '',
                pob: '',
                dob: '',
                address: '',
            }));
            return [...prev, ...newRows];
        });
    };

    // Hapus baris spesifik
    const handleRemoveRow = (id: number) => {
        setRows(prev => prev.filter(r => r.id !== id));
    };

    // Fitur Paste Massal dari Excel (Clipboard) dengan Auto-Parse Tanggal DD-MM-YYYY
    const handlePasteFromExcel = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        e.preventDefault();
        const clipboardData = e.clipboardData.getData('text');
        if (!clipboardData) return;

        const lines = clipboardData.split('\n');
        const parsedRows: StudentRow[] = [];
        let currentId = rows.length > 0 ? rows[rows.length - 1].id + 1 : 1;

        lines.forEach(line => {
            if (!line.trim()) return;
            const cols = line.split('\t'); // Tab-separated dari Excel
            if (cols.length >= 2) {
                // Otomatis konversi kolom tanggal lahir (indeks ke-5 jika urutannya sesuai)
                const rawDob = cols[5]?.trim() || '';
                const formattedDob = parseIndonesianDate(rawDob);

                parsedRows.push({
                    id: currentId++,
                    nis: cols[0]?.trim() || '',
                    full_name: cols[1]?.trim() || '',
                    gender: cols[2]?.trim().toUpperCase() === 'P' ? 'P' : 'L',
                    phone: cols[3]?.trim() || '',
                    pob: cols[4]?.trim() || '',
                    dob: formattedDob,
                    address: cols[6]?.trim() || '',
                });
            }
        });

        if (parsedRows.length > 0) {
            setRows(prev => [...prev.filter(r => r.nis || r.full_name), ...parsedRows]);
            alert(`Berhasil memasukkan ${parsedRows.length} baris data dari clipboard Excel! (Format tanggal otomatis disesuaikan).`);
        } else {
            alert('Format paste tidak dikenali. Pastikan Anda menyalin dari kolom tabel Excel.');
        }
    };

    // Submit simpan data ke database
    const handleSubmitBulk = async () => {
        const validRows = rows.filter(r => r.nis.trim() && r.full_name.trim());
        if (validRows.length === 0) {
            alert('Tidak ada data valid yang bisa disimpan! Minimal isi NIS dan Nama.');
            return;
        }

        // Hapus validasi wajib pilih kelas, karena sekarang dibolehkan masuk General
        try {
            setSubmitting(true);

            const payloadRows = validRows.map(r => ({
                ...r,
                dob: parseIndonesianDate(r.dob)
            }));

            // Jika selectedClassId kosong (''), service akan otomatis mengisi class_id dengan null
            await bulkUpsertStudentsGlobal(tenantId, selectedClassId, payloadRows);

            const targetInfo = selectedClassId ? 'ke kelas pilihan' : 'sebagai data General';
            alert(`Berhasil menyimpan ${validRows.length} data siswa ${targetInfo}!`);
            router.push('/admin/settings/studentsetting');
        } catch (err: any) {
            alert('Gagal menyimpan data: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-100 font-sans">
                <p className="text-xs font-bold text-slate-600 animate-pulse">Memuat Lembar Kerja Import...</p>
            </div>
        );
    }

    return (
        <div
            className="admin-theme-root min-h-screen font-sans flex flex-col justify-between select-none transition-colors duration-300"
            data-theme={theme}
            style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}
        >
            <div className="max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-4 pb-28">

                {/* HEADER NAVIGATION */}
                <div className="flex justify-between items-center">
                    <button
                        onClick={() => router.push('/admin/settings/studentsetting')}
                        className="text-xs font-bold px-3 py-1.5 rounded-xl shadow border transition flex items-center gap-1 cursor-pointer"
                        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)', color: 'var(--text-main)' }}
                    >
                        <span>← Kembali ke Manajemen Siswa</span>
                    </button>
                </div>

                {/* TITLE & CONFIG CARD */}
                <div
                    className="rounded-2xl p-4 sm:p-5 shadow-md border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)' }}
                >
                    <div>
                        <h1 className="font-extrabold text-sm sm:text-base uppercase tracking-wide">Lembar Kerja Import Data Siswa</h1>
                        <p className="text-xs mt-0.5 opacity-80">Ketik langsung, edit sel, atau paste data massal dari spreadsheet Excel Anda.</p>
                    </div>

                    <div className="w-full sm:w-72">
                        <label className="text-[11px] font-bold uppercase tracking-wider block mb-1">Target Kelas Penempatan:</label>
                        <select
                            value={selectedClassId}
                            onChange={(e) => setSelectedClassId(e.target.value)}
                            className="w-full p-2 rounded-xl border text-xs outline-none cursor-pointer"
                            style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-theme)', color: 'var(--text-main)' }}
                        >
                            <option value="">📂 Simpan sebagai General (Tanpa Kelas)</option>
                            {classList.map(c => (
                                <option key={c.class_id} value={c.class_id}>Masukan ke Kelas: {c.class_name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* QUICK PASTE HELPER CARD */}
                <div
                    className="rounded-2xl p-4 shadow-md border border-dashed flex flex-col gap-2"
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)' }}
                >
                    <span className="text-xs font-extrabold uppercase">💡 Tip Cepat (Copy-Paste dari Excel):</span>
                    <p className="text-[11px] opacity-75">
                        Sorot baris data di Excel Anda (sesuaikan urutan kolom: <b>NIS | Nama Lengkap | Gender [L/P] | Telp | Tempat Lahir | Tgl Lahir [Bisa format DD-MM-YYYY] | Alamat</b>), lalu klik kotak di bawah ini dan tekan <kbd className="px-1.5 py-0.5 bg-slate-200 rounded text-slate-800 font-mono">Ctrl + V</kbd>:
                    </p>
                    <textarea
                        rows={2}
                        onPaste={handlePasteFromExcel}
                        placeholder="Klik di sini lalu tekan Ctrl + V untuk paste data masal dari Excel..."
                        className="w-full p-2 rounded-xl border text-xs outline-none font-mono"
                        style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-theme)', color: 'var(--text-main)' }}
                    />
                </div>

                {/* SPREADSHEET INTERACTIVE TABLE */}
                <div
                    className="rounded-2xl p-4 shadow-md border space-y-3 overflow-hidden"
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)' }}
                >
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-extrabold uppercase">Tabel Lembar Kerja ({rows.length} Baris Aktif)</span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleAddRows(5)}
                                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-500/20 text-blue-500 hover:bg-blue-500/30 transition cursor-pointer"
                            >
                                + Tambah 5 Baris
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto max-h-[500px]">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead className="sticky top-0 z-10" style={{ backgroundColor: 'var(--bg-card)' }}>
                                <tr className="border-b" style={{ borderColor: 'var(--border-theme)' }}>
                                    <th className="p-2 w-10 text-center">No</th>
                                    <th className="p-2 w-32">NIS <span className="text-rose-500">*</span></th>
                                    <th className="p-2 w-48">Nama Lengkap <span className="text-rose-500">*</span></th>
                                    <th className="p-2 w-24">Gender</th>
                                    <th className="p-2 w-32">No. Telp</th>
                                    <th className="p-2 w-32">Tempat Lahir</th>
                                    <th className="p-2 w-40">Tgl Lahir (DD-MM-YYYY)</th>
                                    <th className="p-2 w-48">Alamat</th>
                                    <th className="p-2 w-12 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row, index) => (
                                    <tr key={row.id} className="border-b transition hover:bg-black/5" style={{ borderColor: 'var(--border-theme)' }}>
                                        <td className="p-2 text-center opacity-50 font-mono">{index + 1}</td>
                                        <td className="p-2">
                                            <input
                                                type="text"
                                                value={row.nis}
                                                onChange={(e) => handleCellChange(row.id, 'nis', e.target.value)}
                                                placeholder="NIS..."
                                                className="w-full p-1.5 rounded border text-xs outline-none font-mono"
                                                style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-theme)', color: 'var(--text-main)' }}
                                            />
                                        </td>
                                        <td className="p-2">
                                            <input
                                                type="text"
                                                value={row.full_name}
                                                onChange={(e) => handleCellChange(row.id, 'full_name', e.target.value)}
                                                placeholder="Nama lengkap..."
                                                className="w-full p-1.5 rounded border text-xs outline-none"
                                                style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-theme)', color: 'var(--text-main)' }}
                                            />
                                        </td>
                                        <td className="p-2">
                                            <select
                                                value={row.gender}
                                                onChange={(e) => handleCellChange(row.id, 'gender', e.target.value as 'L' | 'P')}
                                                className="w-full p-1.5 rounded border text-xs outline-none cursor-pointer"
                                                style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-theme)', color: 'var(--text-main)' }}
                                            >
                                                <option value="L">L</option>
                                                <option value="P">P</option>
                                            </select>
                                        </td>
                                        <td className="p-2">
                                            <input
                                                type="text"
                                                value={row.phone}
                                                onChange={(e) => handleCellChange(row.id, 'phone', e.target.value)}
                                                placeholder="No Telp..."
                                                className="w-full p-1.5 rounded border text-xs outline-none"
                                                style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-theme)', color: 'var(--text-main)' }}
                                            />
                                        </td>
                                        <td className="p-2">
                                            <input
                                                type="text"
                                                value={row.pob}
                                                onChange={(e) => handleCellChange(row.id, 'pob', e.target.value)}
                                                placeholder="Kota..."
                                                className="w-full p-1.5 rounded border text-xs outline-none"
                                                style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-theme)', color: 'var(--text-main)' }}
                                            />
                                        </td>
                                        <td className="p-2">
                                            <input
                                                type="text"
                                                value={row.dob}
                                                onChange={(e) => handleCellChange(row.id, 'dob', e.target.value)}
                                                placeholder="17-08-2005"
                                                className="w-full p-1.5 rounded border text-xs outline-none font-mono"
                                                style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-theme)', color: 'var(--text-main)' }}
                                            />
                                        </td>
                                        <td className="p-2">
                                            <input
                                                type="text"
                                                value={row.address}
                                                onChange={(e) => handleCellChange(row.id, 'address', e.target.value)}
                                                placeholder="Alamat..."
                                                className="w-full p-1.5 rounded border text-xs outline-none"
                                                style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-theme)', color: 'var(--text-main)' }}
                                            />
                                        </td>
                                        <td className="p-2 text-center">
                                            <button
                                                onClick={() => handleRemoveRow(row.id)}
                                                className="text-rose-500 hover:text-rose-700 font-bold p-1 cursor-pointer"
                                                title="Hapus baris"
                                            >
                                                ✕
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t" style={{ borderColor: 'var(--border-theme)' }}>
                        <button
                            onClick={() => setRows(Array.from({ length: 5 }, (_, index) => ({ id: index + 1, nis: '', full_name: '', gender: 'L', phone: '', pob: '', dob: '', address: '' })))}
                            className="text-xs font-bold text-rose-500 hover:underline cursor-pointer"
                        >
                            Reset / Kosongkan Tabel
                        </button>

                        <button
                            onClick={handleSubmitBulk}
                            disabled={submitting}
                            className="px-6 py-2.5 rounded-xl text-xs font-extrabold text-white shadow-lg transition cursor-pointer disabled:opacity-50"
                            style={{ backgroundColor: 'var(--accent-btn)' }}
                        >
                            {submitting ? 'Menyimpan Data...' : 'Simpan Semua ke Database 🚀'}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}