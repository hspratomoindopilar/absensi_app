'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';
import '@/style/admin-theme.css';

interface UserProfile {
    user_id: string;
    tenant_id: string;
    full_name: string;
    email: string;
    role: string;
    nip?: string;
    phone?: string;
    address?: string;
    education?: string;
    avatar_url?: string;
}

export default function UserManagementPage() {
    const [loading, setLoading] = useState(true);
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const router = useRouter();

    const [tenantType, setTenantType] = useState<string>('individual');
    const [tenantId, setTenantId] = useState<string>('');
    const [currentEmail, setCurrentEmail] = useState<string>('');
    const [usersList, setUsersList] = useState<UserProfile[]>([]);

    // State Modal Tambah / Edit
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState<string>('');

    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // Form Field State
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('teacher');
    const [nip, setNip] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [education, setEducation] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string>('');

    //search-filter-pagination
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRoleFilter, setSelectedRoleFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    // 1. Filter berdasarkan Search (nama/email/NIP) & Role
    const filteredUsers = usersList.filter((u) => {
        const matchesSearch =
            u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (u.nip && u.nip.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesRole = selectedRoleFilter === 'all' || u.role === selectedRoleFilter;

        return matchesSearch && matchesRole;
    });

    // 2. Hitung Total Halaman
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1;

    // 3. Potong data sesuai halaman aktif (Pagination)
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);

    // Mengambil daftar role unik secara otomatis dari data usersList
    const uniqueRoles = Array.from(new Set(usersList.map((u) => u.role)));

    useEffect(() => {
        const savedTheme = (localStorage.getItem('admin_active_theme') as 'light' | 'dark') || 'light';
        setTheme(savedTheme);

        async function loadData() {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error || !session || !session.user.email) {
                    router.replace('/login');
                    return;
                }

                setCurrentEmail(session.user.email);

                // Ambil data user yang sedang login untuk tahu tenant_id
                const { data: currentUser } = await supabase
                    .from('users')
                    .select('tenant_id')
                    .eq('email', session.user.email)
                    .single();

                if (currentUser && currentUser.tenant_id) {
                    setTenantId(currentUser.tenant_id);

                    // Ambil info tenant_type
                    const { data: tenantData } = await supabase
                        .from('tenants')
                        .select('tenant_type')
                        .eq('tenant_id', currentUser.tenant_id)
                        .single();

                    if (tenantData) {
                        setTenantType(tenantData.tenant_type || 'individual');
                    }

                    // Ambil daftar user dalam 1 tenant
                    fetchUsersList(currentUser.tenant_id);
                }
            } catch (err) {
                console.error('Gagal memuat data user management:', err);
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, [router]);

    const fetchUsersList = async (tId: string) => {
        const { data: listUsers } = await supabase
            .from('users')
            .select('*')
            .eq('tenant_id', tId)
            .order('created_at', { ascending: false });

        if (listUsers) {
            setUsersList(listUsers);
        }
    };

    const handleSwitchTheme = (newTheme: 'light' | 'dark') => {
        setTheme(newTheme);
        localStorage.setItem('admin_active_theme', newTheme);
    };

    const openAddModal = () => {
        setIsEditMode(false);
        setSelectedUserId('');
        setFullName('');
        setEmail('');
        setPassword('');
        setRole('teacher');
        setNip('');
        setPhone('');
        setAddress('');
        setEducation('');
        setAvatarUrl('');
        setAvatarFile(null);
        setAvatarPreview('');
        setErrorMsg('');
        setSuccessMsg('');
        setIsModalOpen(true);
    };

    const openEditModal = (user: UserProfile) => {
        setIsEditMode(true);
        setSelectedUserId(user.user_id);
        setFullName(user.full_name || '');
        setEmail(user.email || '');
        setPassword('');
        setRole(user.role || 'teacher');
        setNip(user.nip || '');
        setPhone(user.phone || '');
        setAddress(user.address || '');
        setEducation(user.education || '');
        setAvatarUrl(user.avatar_url || '');
        setAvatarFile(null);
        setAvatarPreview(user.avatar_url || '');
        setErrorMsg('');
        setSuccessMsg('');
        setIsModalOpen(true);
    };

    const hasCoGeneralAdmin = usersList.some(u => u.role === 'co-general admin' && u.user_id !== selectedUserId);

    const handleSubmitForm = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setErrorMsg('');
        setSuccessMsg('');

        try {
            if (tenantType === 'institusi' && role === 'co-general admin' && hasCoGeneralAdmin) {
                throw new Error('Tenant institusi hanya diizinkan memiliki 1 Co-General Admin.');
            }

            let finalAvatarUrl = avatarUrl;

            // --- PROSES UPLOAD FOTO KE BUCKET 'teacherphotos' ---
            if (avatarFile) {
                const fileExt = avatarFile.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
                const filePath = `${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('teacherphotos')
                    .upload(filePath, avatarFile);

                if (uploadError) throw new Error('Gagal mengunggah foto: ' + uploadError.message);

                // Ambil Public URL dari file yang diupload
                const { data: publicUrlData } = supabase.storage
                    .from('teacherphotos')
                    .getPublicUrl(filePath);

                finalAvatarUrl = publicUrlData.publicUrl;
            }

            if (isEditMode) {
                // --- PROSES EDIT ---
                const { error: updateError } = await supabase
                    .from('users')
                    .update({
                        full_name: fullName,
                        role: role,
                        nip: nip || null,
                        phone: phone || null,
                        address: address || null,
                        education: education || null,
                        avatar_url: finalAvatarUrl || null,
                    })
                    .eq('user_id', selectedUserId);

                if (updateError) throw new Error(updateError.message);
                setSuccessMsg('Data pengguna berhasil diperbarui!');

            } else {
                // --- PROSES TAMBAH ---
                const { data: authData, error: authError } = await supabase.auth.signUp({
                    email: email,
                    password: password,
                });

                if (authError) throw new Error('Gagal mendaftarkan Auth: ' + authError.message);
                if (!authData.user) throw new Error('Gagal membuat akun auth.');

                const generatedId = authData.user.id;

                const { error: insertError } = await supabase
                    .from('users')
                    .insert([{
                        user_id: generatedId,
                        tenant_id: tenantId,
                        full_name: fullName,
                        email: email,
                        role: role,
                        nip: nip || null,
                        phone: phone || null,
                        address: address || null,
                        education: education || null,
                        avatar_url: finalAvatarUrl || null,
                    }]);

                if (insertError) throw new Error('Gagal menyimpan profil: ' + insertError.message);
                setSuccessMsg('Pengguna baru berhasil ditambahkan!');
            }

            await fetchUsersList(tenantId);

            setTimeout(() => {
                setIsModalOpen(false);
                setSuccessMsg('');
            }, 1200);

        } catch (err: any) {
            setErrorMsg(err.message || 'Terjadi kesalahan.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteUser = async (userId: string, userEmail: string, userRole: string) => {
        if (userEmail === currentEmail) {
            alert('Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif!');
            return;
        }

        if (userRole === 'general admin') {
            alert('Akun General Admin utama tidak dapat dihapus.');
            return;
        }

        const confirmDel = window.confirm(`Yakin ingin menghapus pengguna ${userEmail}?`);
        if (!confirmDel) return;

        try {
            // Hapus data dari tabel users
            const { error } = await supabase
                .from('users')
                .delete()
                .eq('user_id', userId);

            if (error) throw new Error(error.message);

            alert('Pengguna berhasil dihapus dari sistem.');
            fetchUsersList(tenantId);

        } catch (err: any) {
            alert('Gagal menghapus pengguna: ' + err.message);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-blue-100 font-sans">
                <p className="text-xs font-bold text-blue-800 animate-pulse">Memuat User Management...</p>
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

                {/* HEADER & THEME SWITCHER */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => router.back()}
                        className="text-xs font-bold px-3 py-1.5 rounded-xl shadow border transition flex items-center gap-1 cursor-pointer"
                        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)', color: 'var(--text-main)' }}
                    >
                        <span>❮ Kembali</span>
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
                    className="rounded-2xl p-4 shadow-md border space-y-1"
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)' }}
                >
                    <div className="flex items-center justify-between">
                        <h1 className="font-extrabold text-base uppercase tracking-wide">User Management</h1>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold bg-blue-500/20 text-blue-500 border border-blue-500/30">
                            Tenant: {tenantType}
                        </span>
                    </div>
                    <p className="text-xs opacity-75">Kelola akun operasional.</p>
                </div>

                {/* ACTION BUTTON: TAMBAH USER */}
                <button
                    onClick={openAddModal}
                    className="w-full py-3 rounded-2xl font-extrabold text-xs tracking-wider uppercase bg-cyan-500 hover:bg-cyan-400 text-blue-950 shadow-md transition active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                    <span>+ Tambah Pengguna Baru</span>
                </button>

                {/* LIST USER DARI DATABASE */}
                <div className="space-y-3">

                    {/* SEARCH & FILTER BAR */}
                    <div className="flex flex-col sm:flex-row gap-2">
                        <input
                            type="text"
                            placeholder="Cari nama atau email..."
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            className="flex-1 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                            style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', borderColor: 'var(--border-theme)' }}
                        />
                        <select
                            value={selectedRoleFilter}
                            onChange={(e) => { setSelectedRoleFilter(e.target.value); setCurrentPage(1); }}
                            className="bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                            style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', borderColor: 'var(--border-theme)' }}
                        >
                            <option value="all" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>Semua Role</option>
                            {uniqueRoles.map((r) => (
                                <option key={r} value={r} style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>
                                    {r.charAt(0).toUpperCase() + r.slice(1)}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* HEADER INFO */}
                    <div className="text-[10px] font-bold uppercase tracking-wider opacity-60 px-1 flex items-center justify-between">
                        <span>Menampilkan {paginatedUsers.length} dari {filteredUsers.length} Akun (Total: {usersList.length})</span>
                        <span className="text-emerald-500 font-mono text-[9px] bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">Live Database</span>
                    </div>

                    {/* KUMPULAN CARD USER */}
                    {paginatedUsers.length === 0 ? (
                        <div className="text-center py-8 text-xs opacity-50 italic border border-dashed rounded-xl" style={{ borderColor: 'var(--border-theme)' }}>
                            Tidak ada data pengguna yang cocok.
                        </div>
                    ) : (
                        paginatedUsers.map((u) => (
                            <div
                                key={u.user_id}
                                className="p-3 rounded-xl border shadow-sm flex items-center justify-between transition-all gap-2"
                                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)' }}
                            >
                                <div className="space-y-0.5 overflow-hidden">
                                    <div className="font-bold text-xs truncate">{u.full_name}</div>
                                    <div className="text-[10px] opacity-70 truncate">{u.email} {u.nip ? `• NIP: ${u.nip}` : ''}</div>
                                    <div className="pt-1">
                                        <span className="text-[9px] font-extrabold px-2 py-0.5 rounded bg-blue-500/20 text-blue-500 border border-blue-500/30">
                                            {u.role}
                                        </span>
                                    </div>
                                </div>

                                {/* TOMBOL AKSI EDIT & DELETE */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                        onClick={() => openEditModal(u)}
                                        title="Edit Pengguna"
                                        className="w-8 h-8 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-500 flex items-center justify-center transition cursor-pointer text-xs font-bold"
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        onClick={() => handleDeleteUser(u.user_id, u.email, u.role)}
                                        title="Hapus Pengguna"
                                        className="w-8 h-8 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-500 flex items-center justify-center transition cursor-pointer text-xs font-bold"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        ))
                    )}

                    {/* PAGINATION CONTROLS */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between pt-2 px-1">
                            <button
                                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold border disabled:opacity-30 transition cursor-pointer"
                                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)', color: 'var(--text-main)' }}
                            >
                                ← Sebelumnya
                            </button>
                            <span className="text-xs font-mono opacity-80">
                                Hal {currentPage} dari {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold border disabled:opacity-30 transition cursor-pointer"
                                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)', color: 'var(--text-main)' }}
                            >
                                Berikutnya →
                            </button>
                        </div>
                    )}
                </div>

            </div>

            {/* MODAL FORM TAMBAH / EDIT PENGGUNA */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div
                        className="max-w-md w-full rounded-2xl p-5 shadow-2xl border space-y-4 my-auto max-h-[90vh] overflow-y-auto"
                        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)', color: 'var(--text-main)' }}
                    >
                        <div className="flex items-center justify-between border-b pb-2">
                            <h2 className="font-extrabold text-sm uppercase">
                                {isEditMode ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}
                            </h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-xs font-bold px-2 py-1 rounded-lg hover:bg-red-500/20 hover:text-red-500 transition"
                            >
                                ✕ Tutup
                            </button>
                        </div>

                        {errorMsg && (
                            <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-semibold">
                                {errorMsg}
                            </div>
                        )}

                        {successMsg && (
                            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-semibold">
                                {successMsg}
                            </div>
                        )}

                        <form onSubmit={handleSubmitForm} className="space-y-3">
                            <div>
                                <label className="block text-[11px] font-bold uppercase opacity-80 mb-1">Nama Lengkap *</label>
                                <input
                                    type="text"
                                    required
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="Misal: Siti Aminah, S.Pd."
                                    className="w-full px-3 py-2 rounded-xl text-xs border bg-transparent focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                    style={{ borderColor: 'var(--border-theme)' }}
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold uppercase opacity-80 mb-1">Email *</label>
                                <input
                                    type="email"
                                    required
                                    disabled={isEditMode}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="email@sekolah.com"
                                    className="w-full px-3 py-2 rounded-xl text-xs border bg-transparent focus:outline-none disabled:opacity-50"
                                    style={{ borderColor: 'var(--border-theme)' }}
                                />
                                {isEditMode && <span className="text-[9px] opacity-60 mt-0.5 block">Email tidak dapat diubah saat mode edit.</span>}
                            </div>

                            {!isEditMode && (
                                <div>
                                    <label className="block text-[11px] font-bold uppercase opacity-80 mb-1">Password Sementara *</label>
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Minimal 6 karakter"
                                        className="w-full px-3 py-2 rounded-xl text-xs border bg-transparent focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                        style={{ borderColor: 'var(--border-theme)' }}
                                    />
                                </div>
                            )}

                            {/* SELEKSI ROLE */}
                            <div>
                                <label className="block text-[11px] font-bold uppercase opacity-80 mb-1">Peran / Role *</label>
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl text-xs border bg-transparent focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                    style={{ borderColor: 'var(--border-theme)', backgroundColor: 'var(--bg-card)' }}
                                >
                                    {tenantType === 'individual' ? (
                                        <option value="teacher" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>Teacher</option>
                                    ) : (
                                        <>
                                            <option value="teacher" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>Teacher</option>
                                            <option value="admin" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>Admin</option>
                                            <option value="principal" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>Principal</option>
                                            <option value="finance" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>Finance</option>
                                            <option
                                                value="co-general-admin"
                                                disabled={hasCoGeneralAdmin}
                                                style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}
                                            >
                                                Co-General Admin {hasCoGeneralAdmin ? '(Sudah Terisi)' : ''}
                                            </option>
                                        </>
                                    )}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[10px] font-bold uppercase opacity-80 mb-1">NIP (Opsional)</label>
                                    <input
                                        type="text"
                                        value={nip}
                                        onChange={(e) => setNip(e.target.value)}
                                        placeholder="NIP Pegawai"
                                        className="w-full px-3 py-2 rounded-xl text-xs border bg-transparent focus:outline-none"
                                        style={{ borderColor: 'var(--border-theme)' }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold uppercase opacity-80 mb-1">No. Telepon</label>
                                    <input
                                        type="text"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="08123456789"
                                        className="w-full px-3 py-2 rounded-xl text-xs border bg-transparent focus:outline-none"
                                        style={{ borderColor: 'var(--border-theme)' }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold uppercase opacity-80 mb-1">Pendidikan Terakhir</label>
                                <input
                                    type="text"
                                    value={education}
                                    onChange={(e) => setEducation(e.target.value)}
                                    placeholder="Misal: S1 Pendidikan"
                                    className="w-full px-3 py-2 rounded-xl text-xs border bg-transparent focus:outline-none"
                                    style={{ borderColor: 'var(--border-theme)' }}
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold uppercase opacity-80 mb-1">Alamat</label>
                                <textarea
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    rows={2}
                                    placeholder="Alamat domisili..."
                                    className="w-full px-3 py-2 rounded-xl text-xs border bg-transparent focus:outline-none"
                                    style={{ borderColor: 'var(--border-theme)' }}
                                />
                            </div>

                            {/* INPUT FOTO PROFIL */}
                            <div>
                                <label className="block text-[11px] font-bold uppercase opacity-80 mb-1">Foto Profil (Opsional)</label>
                                <div className="flex items-center gap-3">
                                    {avatarPreview ? (
                                        <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-300 shrink-0 bg-white">
                                            <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                                        </div>
                                    ) : (
                                        <div className="w-12 h-12 rounded-xl border border-dashed border-slate-400 flex items-center justify-center text-xs opacity-50 shrink-0">
                                            📷
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                setAvatarFile(file);
                                                setAvatarPreview(URL.createObjectURL(file));
                                            }
                                        }}
                                        className="w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-cyan-500/20 file:text-cyan-500 hover:file:bg-cyan-500/30 cursor-pointer"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full py-3 rounded-xl font-extrabold text-xs tracking-wider uppercase bg-cyan-500 hover:bg-cyan-400 text-blue-950 shadow-md transition active:scale-95 cursor-pointer disabled:opacity-50 mt-2"
                            >
                                {submitting ? 'Menyimpan...' : (isEditMode ? 'Simpan Perubahan' : 'Simpan Pengguna Baru')}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <BottomNav />
        </div>
    );
}