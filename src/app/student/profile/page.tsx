'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import NavBottomStudent from '@/components/NavBottomStudent';
import Link from 'next/link';
import { getStudentCompleteProfile, updateStudentProfile } from '@/services/studentProfileService';
import { supabase } from '@/lib/supabase';

export default function StudentProfilePage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [currentTheme, setCurrentTheme] = useState('default');

    const [profile, setProfile] = useState<any>({
        full_name: '',
        nis: '',
        gender: 'L',
        pob: '',
        dob: '',
        address: '',
        phone: '',
        hobbies: [],
        social_media: { instagram: '', tiktok: '', discord: '', youtube: '', twitter: '' },
        avatar_url: '',
        classes: null,
        stats: { total_exp: 0, total_coins: 0 }
    });

    const [hobbyInput, setHobbyInput] = useState('');
    const router = useRouter();

    useEffect(() => {
        async function loadProfile() {
            try {
                setLoading(true);
                // Muat tema aktif dari localStorage
                const savedTheme = localStorage.getItem('student_active_theme') || 'default';
                setCurrentTheme(savedTheme);

                const rawSession = localStorage.getItem('kelasyik_student_session') || localStorage.getItem('current_student');
                if (!rawSession) {
                    router.replace('/login');
                    return;
                }

                const session = JSON.parse(rawSession!);
                const studentId = session.studentId || session.student_id;
                if (!studentId) {
                    router.replace('/login');
                    return;
                }

                const data = await getStudentCompleteProfile(String(studentId));
                if (data) {
                    setProfile({
                        ...data,
                        hobbies: data.hobbies || [],
                        social_media: data.social_media || { instagram: '', tiktok: '', discord: '', youtube: '', twitter: '' }
                    });
                }
            } catch (err) {
                console.error('Gagal memuat profil:', err);
            } finally {
                setLoading(false);
            }
        }

        loadProfile();
    }, [router]);

    // Handle Upload Foto ke Supabase Storage (atau konversi aman)
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const currentExp = profile.stats?.total_exp || 0;
        if (currentExp < 500) {
            alert('Fitur kustomisasi foto terkunci! Kumpulkan minimal 500 EXP.');
            return;
        }

        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            alert('Ukuran file terlalu besar! Maksimal 2MB.');
            return;
        }

        try {
            setUploadingImage(true);
            const fileExt = file.name.split('.').pop();
            const fileName = `avatar_${Math.random()}.${fileExt}`;
            const filePath = `avatars/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setProfile({ ...profile, avatar_url: reader.result as string });
                    setUploadingImage(false);
                };
                reader.readAsDataURL(file);
                return;
            }

            const { data: publicURLData } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            setProfile({ ...profile, avatar_url: publicURLData.publicUrl });
        } catch (err: any) {
            console.error('Gagal upload:', err);
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfile({ ...profile, avatar_url: reader.result as string });
                setUploadingImage(false);
            };
            reader.readAsDataURL(file);
        } finally {
            setUploadingImage(false);
        }
    };

    const handleAddHobby = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && hobbyInput.trim() !== '') {
            e.preventDefault();
            if (!profile.hobbies.includes(hobbyInput.trim())) {
                setProfile({
                    ...profile,
                    hobbies: [...profile.hobbies, hobbyInput.trim()]
                });
            }
            setHobbyInput('');
        }
    };

    const handleRemoveHobby = (hobbyToRemove: string) => {
        setProfile({
            ...profile,
            hobbies: profile.hobbies.filter((h: string) => h !== hobbyToRemove)
        });
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSaving(true);
            const rawSession = localStorage.getItem('kelasyik_student_session') || localStorage.getItem('current_student');
            const session = JSON.parse(rawSession!);
            const studentId = session.studentId || session.student_id;

            await updateStudentProfile(String(studentId), {
                pob: profile.pob,
                dob: profile.dob,
                address: profile.address,
                phone: profile.phone,
                hobbies: profile.hobbies,
                social_media: profile.social_media,
                avatar_url: profile.avatar_url
            });

            alert('Profil berhasil diperbarui! 🎉');
            setIsEditing(false);
        } catch (err: any) {
            alert('Gagal menyimpan: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div 
                className="student-theme-root min-h-screen flex items-center justify-center"
                data-theme={currentTheme}
                style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}
            >
                <p className="text-sm font-medium animate-pulse" style={{ color: 'var(--badge-text)' }}>Memuat Data Profil...</p>
            </div>
        );
    }

    return (
        <div 
            className="student-theme-root min-h-screen font-sans flex flex-col pb-28 transition-colors duration-300"
            data-theme={currentTheme}
            style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}
        >
            {/* Header Profil */}
            <div 
                className="px-6 pt-6 pb-8 rounded-b-3xl border-b relative shadow-xl"
                style={{ backgroundColor: 'var(--bg-header)', borderColor: 'var(--border-light)' }}
            >
                <div 
                    className="absolute top-0 left-0 right-0 h-1 shadow-[0_0_12px_var(--hover-shadow)]"
                    style={{ background: 'var(--accent-gradient)' }}
                ></div>
                <div className="max-w-2xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div 
                            className="relative w-18 h-18 rounded-2xl border-2 shadow-[0_0_12px_var(--border-theme)] overflow-hidden flex items-center justify-center p-1 shrink-0"
                            style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-theme)' }}
                        >
                            <img
                                src={profile.avatar_url || (profile.gender === 'P' ? '/icon/females-student.png' : '/icon/male-student.png')}
                                alt="Avatar"
                                className="w-full h-full object-cover rounded-xl"
                            />
                        </div>
                        <div>
                            <span 
                                className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase border"
                                style={{ 
                                    backgroundColor: 'var(--badge-bg)', 
                                    color: 'var(--badge-text)', 
                                    borderColor: 'var(--badge-border)' 
                                }}
                            >
                                {profile.classes?.class_name || 'Kelas Siswa'}
                            </span>
                            <h1 className="text-lg font-black mt-1" style={{ color: 'var(--text-main)' }}>{profile.full_name}</h1>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>NIS: {profile.nis || '-'}</p>
                        </div>
                    </div>

                    {!isEditing && (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="px-4 py-2 font-bold text-xs rounded-xl shadow-[0_0_10px_var(--hover-shadow)] transition cursor-pointer flex items-center gap-1.5 border"
                            style={{ 
                                backgroundColor: 'var(--bg-card)', 
                                color: 'var(--text-main)', 
                                borderColor: 'var(--border-theme)' 
                            }}
                        >
                            <span>✏️</span> Edit Profil
                        </button>
                    )}
                </div>
            </div>

            {/* Konten Utama */}
            <div className="max-w-2xl mx-auto w-full px-5 mt-5">
                {!isEditing ? (
                    /* --- VIEW MODE --- */
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div 
                                className="border p-4 rounded-2xl flex items-center gap-3 shadow-lg"
                                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}
                            >
                                <img
                                    src="/icon/exp.png"
                                    alt="EXP"
                                    className="w-8 h-8 object-contain drop-shadow-[0_0_6px_var(--hover-shadow)]"
                                />
                                <div>
                                    <p className="text-[10px] uppercase font-bold tracking-wider" style={{ color: 'var(--text-muted)' }}>Total EXP</p>
                                    <p className="text-base font-black text-amber-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]">{profile.stats?.total_exp || 0} EXP</p>
                                </div>
                            </div>
                            <div 
                                className="border p-4 rounded-2xl flex items-center gap-3 shadow-lg"
                                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}
                            >
                                <img
                                    src="/icon/coin.png"
                                    alt="Koin"
                                    className="w-8 h-8 object-contain drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]"
                                />
                                <div>
                                    <p className="text-[10px] uppercase font-bold tracking-wider" style={{ color: 'var(--text-muted)' }}>Total Koin</p>
                                    <p className="text-base font-black text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]">{profile.stats?.total_coins || 0} Koin</p>
                                </div>
                            </div>
                        </div>

                        <div 
                            className="border p-5 rounded-2xl space-y-3 shadow-xl"
                            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}
                        >
                            <h3 
                                className="text-xs font-black uppercase tracking-wider border-b pb-2"
                                style={{ color: 'var(--badge-text)', borderColor: 'var(--border-light)' }}
                            >
                                Informasi Pribadi & Kontak
                            </h3>
                            <div className="grid grid-cols-2 gap-4 text-xs">
                                <div>
                                    <p style={{ color: 'var(--text-muted)' }}>Tempat, Tanggal Lahir</p>
                                    <p className="font-semibold mt-0.5" style={{ color: 'var(--text-main)' }}>{profile.pob || '-' }, {profile.dob || '-'}</p>
                                </div>
                                <div>
                                    <p style={{ color: 'var(--text-muted)' }}>Nomor HP / WhatsApp</p>
                                    <p className="font-semibold mt-0.5" style={{ color: 'var(--text-main)' }}>{profile.phone || '-'}</p>
                                </div>
                                <div className="col-span-2">
                                    <p style={{ color: 'var(--text-muted)' }}>Alamat Domisili</p>
                                    <p className="font-semibold mt-0.5" style={{ color: 'var(--text-main)' }}>{profile.address || '-'}</p>
                                </div>
                            </div>
                        </div>

                        <div 
                            className="border p-5 rounded-2xl space-y-3 shadow-xl"
                            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}
                        >
                            <h3 
                                className="text-xs font-black uppercase tracking-wider border-b pb-2"
                                style={{ color: 'var(--badge-text)', borderColor: 'var(--border-light)' }}
                            >
                                Hobi & Ketertarikan
                            </h3>
                            <div className="flex flex-wrap gap-1.5 pt-1">
                                {profile.hobbies && profile.hobbies.length > 0 ? (
                                    profile.hobbies.map((hobby: string, idx: number) => (
                                        <span 
                                            key={idx} 
                                            className="text-xs px-3 py-1 rounded-full font-semibold border"
                                            style={{ 
                                                backgroundColor: 'var(--badge-bg)', 
                                                color: 'var(--badge-text)', 
                                                borderColor: 'var(--badge-border)' 
                                            }}
                                        >
                                            {hobby}
                                        </span>
                                    ))
                                ) : (
                                    <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>Belum ada hobi yang ditambahkan.</p>
                                )}
                            </div>
                        </div>

                        <div 
                            className="border p-5 rounded-2xl space-y-3 shadow-xl"
                            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}
                        >
                            <h3 
                                className="text-xs font-black uppercase tracking-wider border-b pb-2"
                                style={{ color: 'var(--badge-text)', borderColor: 'var(--border-light)' }}
                            >
                                Tautan Sosial Media
                            </h3>
                            <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                                <div>
                                    <p style={{ color: 'var(--text-muted)' }}>Instagram</p>
                                    <p className="font-semibold mt-0.5" style={{ color: 'var(--text-main)' }}>{profile.social_media?.instagram ? `@${profile.social_media.instagram}` : '-'}</p>
                                </div>
                                <div>
                                    <p style={{ color: 'var(--text-muted)' }}>TikTok</p>
                                    <p className="font-semibold mt-0.5" style={{ color: 'var(--text-main)' }}>{profile.social_media?.tiktok ? `@${profile.social_media.tiktok}` : '-'}</p>
                                </div>
                                <div>
                                    <p style={{ color: 'var(--text-muted)' }}>Discord</p>
                                    <p className="font-semibold mt-0.5" style={{ color: 'var(--text-main)' }}>{profile.social_media?.discord || '-'}</p>
                                </div>
                                <div>
                                    <p style={{ color: 'var(--text-muted)' }}>YouTube / GitHub</p>
                                    <p className="font-semibold mt-0.5" style={{ color: 'var(--text-main)' }}>{profile.social_media?.youtube || '-'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* --- EDIT MODE (FORM) --- */
                    <form onSubmit={handleSave} className="space-y-4">
                        {(() => {
                            const currentExp = profile.stats?.total_exp || 0;
                            const isAvatarLocked = currentExp < 500;
                            const expNeeded = 500 - currentExp;

                            return (
                                <div 
                                    className="border p-4 rounded-2xl space-y-3 shadow-xl relative overflow-hidden"
                                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}
                                >
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--badge-text)' }}>Unggah Foto Profil / Avatar</h3>
                                        <span className={`text-[9px] px-2 py-0.5 rounded-md font-bold border ${isAvatarLocked
                                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                            }`}>
                                            {isAvatarLocked ? `🔒 Terkunci (Butuh ${expNeeded} EXP lagi)` : 'Unlocked 🔓'}
                                        </span>
                                    </div>
                                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                        {isAvatarLocked
                                            ? `Kumpulkan minimal 500 Total EXP (saat ini ${currentExp} EXP) untuk membuka kustomisasi foto profil.`
                                            : 'Pilih foto dari perangkatmu (Format JPG/PNG, Maks. 2MB).'}
                                    </p>

                                    <div className="flex items-center gap-3">
                                        <div 
                                            className="w-14 h-14 rounded-xl border overflow-hidden shrink-0 flex items-center justify-center p-1"
                                            style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-theme)' }}
                                        >
                                            <img
                                                src={profile.avatar_url || (profile.gender === 'P' ? '/icon/females-student.png' : '/icon/male-student.png')}
                                                alt="Preview"
                                                className="w-full h-full object-cover rounded-lg"
                                            />
                                        </div>

                                        {isAvatarLocked ? (
                                            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-amber-500/30 rounded-xl py-3 px-4 text-center" style={{ backgroundColor: 'var(--bg-main)' }}>
                                                <span className="text-xs font-bold text-amber-300">Fitur Terkunci 🔒</span>
                                                <span className="text-[9px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Selesaikan misi game & ujian untuk menambah EXP!</span>
                                            </div>
                                        ) : (
                                            <label 
                                                className="flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-xl py-3 px-4 cursor-pointer transition"
                                                style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-theme)' }}
                                            >
                                                <span className="text-xs font-semibold" style={{ color: 'var(--text-main)' }}>
                                                    {uploadingImage ? 'Memproses Foto...' : '📁 Pilih Berkas Foto...'}
                                                </span>
                                                <span className="text-[9px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Format JPG/PNG (Maks. 2MB)</span>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleFileChange}
                                                    className="hidden"
                                                />
                                            </label>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}

                        <div 
                            className="border p-4 rounded-2xl space-y-3 shadow-xl"
                            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}
                        >
                            <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--badge-text)' }}>Edit Informasi Pribadi</h3>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>Tempat Lahir</label>
                                    <input
                                        type="text"
                                        value={profile.pob || ''}
                                        onChange={(e) => setProfile({ ...profile, pob: e.target.value })}
                                        className="w-full mt-1 border rounded-xl px-3 py-2 text-xs focus:outline-none"
                                        style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>Tanggal Lahir</label>
                                    <input
                                        type="date"
                                        value={profile.dob || ''}
                                        onChange={(e) => setProfile({ ...profile, dob: e.target.value })}
                                        className="w-full mt-1 border rounded-xl px-3 py-2 text-xs focus:outline-none"
                                        style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>Nomor HP / WhatsApp</label>
                                <input
                                    type="text"
                                    value={profile.phone || ''}
                                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                    className="w-full mt-1 border rounded-xl px-3 py-2 text-xs focus:outline-none"
                                    style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>Alamat Domisili</label>
                                <textarea
                                    rows={2}
                                    value={profile.address || ''}
                                    onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                                    className="w-full mt-1 border rounded-xl px-3 py-2 text-xs focus:outline-none resize-none"
                                    style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}
                                />
                            </div>
                        </div>

                        <div 
                            className="border p-4 rounded-2xl space-y-3 shadow-xl"
                            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}
                        >
                            <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--badge-text)' }}>Edit Hobi & Ketertarikan</h3>
                            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Ketik hobi lalu tekan <span style={{ color: 'var(--text-main)' }} className="font-bold">Enter</span>.</p>

                            <div className="flex flex-wrap gap-1.5 mb-2">
                                {profile.hobbies.map((hobby: string, idx: number) => (
                                    <span 
                                        key={idx} 
                                        className="text-xs px-2.5 py-1 rounded-full flex items-center gap-1 font-semibold border"
                                        style={{ backgroundColor: 'var(--badge-bg)', color: 'var(--badge-text)', borderColor: 'var(--badge-border)' }}
                                    >
                                        {hobby}
                                        <button type="button" onClick={() => handleRemoveHobby(hobby)} className="text-rose-400 hover:text-rose-200 font-bold ml-1 cursor-pointer">×</button>
                                    </span>
                                ))}
                            </div>

                            <input
                                type="text"
                                value={hobbyInput}
                                onChange={(e) => setHobbyInput(e.target.value)}
                                onKeyDown={handleAddHobby}
                                placeholder="Cth: Gaming, Membaca (Tekan Enter)"
                                className="w-full border rounded-xl px-3 py-2 text-xs focus:outline-none"
                                style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}
                            />
                        </div>

                        <div 
                            className="border p-4 rounded-2xl space-y-3 shadow-xl"
                            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-light)' }}
                        >
                            <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--badge-text)' }}>Edit Sosial Media Populer</h3>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>Instagram</label>
                                    <input
                                        type="text"
                                        value={profile.social_media?.instagram || ''}
                                        onChange={(e) => setProfile({
                                            ...profile,
                                            social_media: { ...profile.social_media, instagram: e.target.value }
                                        })}
                                        placeholder="username"
                                        className="w-full mt-1 border rounded-xl px-3 py-2 text-xs focus:outline-none"
                                        style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>TikTok</label>
                                    <input
                                        type="text"
                                        value={profile.social_media?.tiktok || ''}
                                        onChange={(e) => setProfile({
                                            ...profile,
                                            social_media: { ...profile.social_media, tiktok: e.target.value }
                                        })}
                                        placeholder="username"
                                        className="w-full mt-1 border rounded-xl px-3 py-2 text-xs focus:outline-none"
                                        style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>Discord Tag</label>
                                    <input
                                        type="text"
                                        value={profile.social_media?.discord || ''}
                                        onChange={(e) => setProfile({
                                            ...profile,
                                            social_media: { ...profile.social_media, discord: e.target.value }
                                        })}
                                        placeholder="username#0000"
                                        className="w-full mt-1 border rounded-xl px-3 py-2 text-xs focus:outline-none"
                                        style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>YouTube / GitHub</label>
                                    <input
                                        type="text"
                                        value={profile.social_media?.youtube || ''}
                                        onChange={(e) => setProfile({
                                            ...profile,
                                            social_media: { ...profile.social_media, youtube: e.target.value }
                                        })}
                                        placeholder="channel / profil"
                                        className="w-full mt-1 border rounded-xl px-3 py-2 text-xs focus:outline-none"
                                        style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-light)', color: 'var(--text-main)' }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setIsEditing(false)}
                                className="w-1/3 py-3 rounded-2xl border font-bold text-xs uppercase cursor-pointer transition"
                                style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-theme)', color: 'var(--text-muted)' }}
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="w-2/3 py-3 rounded-2xl text-white font-black text-xs uppercase tracking-wider shadow-[0_0_15px_var(--hover-shadow)] cursor-pointer transition hover:opacity-90 disabled:opacity-50"
                                style={{ background: 'var(--accent-gradient)' }}
                            >
                                {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                            </button>
                        </div>
                    </form>
                )}
            </div>

            {/* Komponen Navigasi Bawah Global */}
            <NavBottomStudent />
        </div>
    );
}