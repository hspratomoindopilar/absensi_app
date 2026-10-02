'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import {
    fetchSchoolAndClassInfo,
    fetchTenantSettings,
    updateTenantSchoolDays,
    fetchSchoolHolidays,
    addSchoolHoliday,
    deleteSchoolHoliday,
    fetchEffectiveDays,
    saveEffectiveDays,
    academicYearService
} from '@/services/settingsService';
import { SchoolHoliday } from '@/types/database';
import BottomNav from '@/components/BottomNav';
import '@/style/admin-theme.css';

export default function SchoolSettingAdminPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [savingSettings, setSavingSettings] = useState(false);
    const [savingHoliday, setSavingHoliday] = useState(false);

    const [tenantId, setTenantId] = useState('');
    const [schoolDays, setSchoolDays] = useState<number>(5);
    const [theme, setTheme] = useState<'light' | 'dark'>('light');

    const [openSections, setOpenSections] = useState({
        globalHes: true,
        classHes: false,
        holiday: false,
        subjects: false,
    });

    // State HES Global & Safety Net Modal
    const [globalHesMode, setGlobalHesMode] = useState<'5' | '6' | 'custom'>('5');
    const [globalCustomDays, setGlobalCustomDays] = useState({
        senin: true, selasa: true, rabu: true, kamis: true, jumat: true, sabtu: false, minggu: false,
    });
    const [savingGlobalCustom, setSavingGlobalCustom] = useState(false);

    // State untuk modal konfirmasi preset global
    const [pendingPresetDays, setPendingPresetDays] = useState<number | null>(null);

    // State Spesifik Kelas & Mapping Status per Kelas
    const [classList, setClassList] = useState<{ class_id: string; class_name: string }[]>([]);
    const [classHesOverrides, setClassHesOverrides] = useState<Record<string, { isCustom: boolean; days: any }>>({});

    // State untuk expand card kelas di list status
    const [expandedStatusClass, setExpandedStatusClass] = useState<string | null>(null);

    const [selectedCustomClasses, setSelectedCustomClasses] = useState<string[]>([]);
    const [classSearchKeyword, setClassSearchKeyword] = useState<string>('');
    const [specificCustomDays, setSpecificCustomDays] = useState({
        senin: true, selasa: true, rabu: true, kamis: true, jumat: true, sabtu: false, minggu: false,
    });
    const [savingSpecificCustom, setSavingSpecificCustom] = useState(false);

    // Form libur
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [description, setDescription] = useState('');
    const [holidays, setHolidays] = useState<SchoolHoliday[]>([]);

    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    // State untuk manajemen Subjects (Referensi & Pendukung)
    const [subjects, setSubjects] = useState<any[]>([]);
    const [subjectCode, setSubjectCode] = useState('');
    const [subjectName, setSubjectName] = useState('');
    const [savingSubject, setSavingSubject] = useState(false);

    // State Academic Year
    const [academicYears, setAcademicYears] = useState<any[]>([]);
    const [activeAcademicYear, setActiveAcademicYear] = useState<any>(null);
    const [ayYearName, setAyYearName] = useState('');
    const [ayStartDate, setAyStartDate] = useState('');
    const [ayEndDate, setAyEndDate] = useState('');
    const [savingAy, setSavingAy] = useState(false);

    // State untuk konfirmasi aksi Tahun Ajaran
    const [pendingActionAy, setPendingActionAy] = useState<{ type: 'active' | 'delete'; id: string; name: string } | null>(null);

    // State untuk mode edit tahun ajaran
    const [editingAyId, setEditingAyId] = useState<string | null>(null);

    useEffect(() => {
        const savedTheme = (localStorage.getItem('admin_active_theme') as 'light' | 'dark') || 'light';
        setTheme(savedTheme);

        async function loadSettingsData() {
            try {
                setLoading(true);
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();

                if (sessionError || !session || !session.user.email) {
                    router.replace('/login');
                    return;
                }

                const info = await fetchSchoolAndClassInfo(session.user.email);
                if (!info || !info.tenantId) {
                    router.replace('/login');
                    return;
                }

                setTenantId(info.tenantId);

                const { data: classesData } = await supabase
                    .from('classes')
                    .select('class_id, class_name')
                    .eq('tenant_id', info.tenantId);
                const loadedClasses = classesData || [];
                setClassList(loadedClasses);

                const [settings, holidayList, globalEffectiveDays, subjectsData, ayData, activeAyData] = await Promise.all([
                    fetchTenantSettings(info.tenantId),
                    fetchSchoolHolidays(info.tenantId),
                    fetchEffectiveDays(info.tenantId, null),
                    supabase.from('subjects').select('*').eq('tenant_id', info.tenantId).order('subject_name', { ascending: true }),
                    academicYearService.fetchAcademicYears(info.tenantId), // Fetch semua tahun ajaran
                    academicYearService.getActiveAcademicYear(info.tenantId) // Fetch tahun ajaran aktif
                ]);

                setSchoolDays(settings.school_days);
                setHolidays(holidayList);
                setSubjects(subjectsData.data || []);
                setAcademicYears(ayData || []);
                setActiveAcademicYear(activeAyData);

                const defaultDaysState = { senin: true, selasa: true, rabu: true, kamis: true, jumat: true, sabtu: false, minggu: false };

                if (globalEffectiveDays && globalEffectiveDays.length > 0) {
                    const mappedDays: any = { ...defaultDaysState };
                    globalEffectiveDays.forEach((item: any) => {
                        mappedDays[item.day_of_week] = item.is_active;
                    });
                    setGlobalCustomDays(mappedDays);

                    // Cek apakah data global ini dulunya disimpan via preset standard 5/6 hari 
                    // atau benar-benar custom global. 
                    // (Atau bisa langsung sinkronkan dengan settings.school_days jika memang basisnya itu)
                    if (settings.school_days === 5 || settings.school_days === 6) {
                        setGlobalHesMode(settings.school_days.toString() as '5' | '6');
                    } else {
                        setGlobalHesMode('custom');
                    }
                } else {
                    setGlobalHesMode(settings.school_days === 6 ? '6' : '5');
                }
                const overridesMap: Record<string, { isCustom: boolean; days: any }> = {};
                for (const cls of loadedClasses) {
                    const cDays = await fetchEffectiveDays(info.tenantId, cls.class_id);
                    if (cDays && cDays.length > 0) {
                        const mapped: any = { ...defaultDaysState };
                        cDays.forEach((item: any) => {
                            mapped[item.day_of_week] = item.is_active;
                        });
                        overridesMap[cls.class_id] = { isCustom: true, days: mapped };
                    } else {
                        overridesMap[cls.class_id] = { isCustom: false, days: defaultDaysState };
                    }
                }
                setClassHesOverrides(overridesMap);



            } catch (err: any) {
                console.error('Gagal memuat pengaturan:', err);
                setErrorMsg('Gagal memuat data konfigurasi.');
            } finally {
                setLoading(false);
            }
        }

        loadSettingsData();
    }, [router]);

    const handleSwitchTheme = (newTheme: 'light' | 'dark') => {
        setTheme(newTheme);
        localStorage.setItem('admin_active_theme', newTheme);
    };

    const toggleSection = (section: 'globalHes' | 'classHes' | 'holiday') => {
        setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const confirmAndApplyStandardPreset = async () => {
        if (pendingPresetDays === null) return;
        const days = pendingPresetDays;
        setPendingPresetDays(null);

        try {
            setSavingSettings(true);
            setErrorMsg('');
            setSuccessMsg('');

            await updateTenantSchoolDays(tenantId, days);
            setSchoolDays(days);
            setGlobalHesMode(days === 6 ? '6' : '5');

            const defaultDays = days === 6
                ? { senin: true, selasa: true, rabu: true, kamis: true, jumat: true, sabtu: true, minggu: false }
                : { senin: true, selasa: true, rabu: true, kamis: true, jumat: true, sabtu: false, minggu: false };

            const payload = Object.entries(defaultDays).map(([day_of_week, is_active]) => ({ day_of_week, is_active }));
            await saveEffectiveDays(tenantId, null, payload);
            setGlobalCustomDays(defaultDays);

            setSuccessMsg(`Berhasil mengubah sistem Global ke ${days} Hari Sekolah.`);
            setTimeout(() => setSuccessMsg(''), 4000);
        } catch (err: any) {
            setErrorMsg('Gagal menyimpan pengaturan: ' + err.message);
        } finally {
            setSavingSettings(false);
        }
    };

    const handleSaveGlobalCustomDays = async () => {
        try {
            setSavingGlobalCustom(true);
            setErrorMsg('');
            setSuccessMsg('');

            const payload = Object.entries(globalCustomDays).map(([day_of_week, is_active]) => ({
                day_of_week,
                is_active,
            }));

            await saveEffectiveDays(tenantId, null, payload);
            setGlobalHesMode('custom');
            setSuccessMsg('Berhasil menyimpan hari efektif Global (ALL) Custom.');
            setTimeout(() => setSuccessMsg(''), 4000);
        } catch (err: any) {
            setErrorMsg('Gagal menyimpan Global Custom: ' + err.message);
        } finally {
            setSavingGlobalCustom(false);
        }
    };

    const handleSaveSpecificCustomDays = async () => {
        try {
            setSavingSpecificCustom(true);
            setErrorMsg('');
            setSuccessMsg('');

            if (selectedCustomClasses.length === 0) {
                setErrorMsg('Pilih minimal satu kelas target.');
                setSavingSpecificCustom(false);
                return;
            }

            const payload = Object.entries(specificCustomDays).map(([day_of_week, is_active]) => ({
                day_of_week,
                is_active,
            }));

            const updatedOverrides = { ...classHesOverrides };
            for (const classId of selectedCustomClasses) {
                await saveEffectiveDays(tenantId, classId, payload);
                updatedOverrides[classId] = { isCustom: true, days: { ...specificCustomDays } };
            }

            setClassHesOverrides(updatedOverrides);
            setSuccessMsg(`Berhasil memperbarui override untuk ${selectedCustomClasses.length} kelas.`);
            setTimeout(() => setSuccessMsg(''), 4000);
        } catch (err: any) {
            setErrorMsg('Gagal menyimpan override kelas: ' + err.message);
        } finally {
            setSavingSpecificCustom(false);
        }
    };

    const handleDisableClassOverride = async (classId: string) => {
        try {
            setErrorMsg('');
            setSuccessMsg('');
            await saveEffectiveDays(tenantId, classId, []);

            setClassHesOverrides(prev => ({
                ...prev,
                [classId]: { isCustom: false, days: globalCustomDays }
            }));

            setSuccessMsg('Kelas berhasil dikembalikan mengikuti aturan Global (ALL).');
            setTimeout(() => setSuccessMsg(''), 4000);
        } catch (err: any) {
            setErrorMsg('Gagal mereset status kelas: ' + err.message);
        }
    };

    const handleAddHoliday = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!startDate || !endDate || !description) {
            setErrorMsg('Semua field form libur harus diisi!');
            return;
        }

        if (startDate > endDate) {
            setErrorMsg('Tanggal mulai tidak boleh lebih besar dari tanggal selesai!');
            return;
        }

        try {
            setSavingHoliday(true);
            setErrorMsg('');
            setSuccessMsg('');

            await addSchoolHoliday(tenantId, startDate, endDate, description);
            const updatedHolidays = await fetchSchoolHolidays(tenantId);
            setHolidays(updatedHolidays);

            setStartDate('');
            setEndDate('');
            setDescription('');
            setSuccessMsg('Berhasil menambahkan kalender libur baru.');
            setTimeout(() => setSuccessMsg(''), 4000);
        } catch (err: any) {
            setErrorMsg('Gagal menambah libur: ' + err.message);
        } finally {
            setSavingHoliday(false);
        }
    };

    const handleDeleteHoliday = async (holidayId: string) => {
        if (!confirm('Apakah Anda yakin ingin menghapus jadwal libur ini?')) return;

        try {
            setErrorMsg('');
            await deleteSchoolHoliday(holidayId);
            setHolidays(holidays.filter((h) => h.holiday_id !== holidayId));
            setSuccessMsg('Jadwal libur berhasil dihapus.');
            setTimeout(() => setSuccessMsg(''), 4000);
        } catch (err: any) {
            setErrorMsg('Gagal menghapus libur: ' + err.message);
        }
    };

    const handleAddSubject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!subjectName.trim()) {
            setErrorMsg('Nama mata pelajaran harus diisi!');
            return;
        }

        try {
            setSavingSubject(true);
            setErrorMsg('');
            setSuccessMsg('');

            const { error } = await supabase.from('subjects').insert([
                {
                    tenant_id: tenantId,
                    subject_code: subjectCode.trim() || null,
                    subject_name: subjectName.trim(),
                }
            ]);

            if (error) throw error;

            // Refresh data subjects
            const { data: updated } = await supabase.from('subjects').select('*').eq('tenant_id', tenantId).order('subject_name', { ascending: true });
            setSubjects(updated || []);

            setSubjectCode('');
            setSubjectName('');
            setSuccessMsg('Mata pelajaran berhasil ditambahkan.');
            setTimeout(() => setSuccessMsg(''), 4000);
        } catch (err: any) {
            setErrorMsg('Gagal menambah mata pelajaran: ' + err.message);
        } finally {
            setSavingSubject(false);
        }
    };

    const handleDeleteSubject = async (subjectId: string) => {
        if (!confirm('Apakah Anda yakin ingin menghapus mata pelajaran ini?')) return;

        try {
            setErrorMsg('');
            const { error } = await supabase.from('subjects').delete().eq('subject_id', subjectId);
            if (error) throw error;

            setSubjects(subjects.filter(s => s.subject_id !== subjectId));
            setSuccessMsg('Mata pelajaran berhasil dihapus.');
            setTimeout(() => setSuccessMsg(''), 4000);
        } catch (err: any) {
            setErrorMsg('Gagal menghapus mata pelajaran: ' + err.message);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-blue-100 font-sans">
                <p className="text-xs font-bold text-blue-800 animate-pulse">Memuat Pengaturan Sekolah...</p>
            </div>
        );
    }

    // Handler Tambah Tahun Ajaran Baru
    const handleSaveAcademicYear = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!ayYearName.trim()) {
            setErrorMsg('Nama Tahun Ajaran wajib diisi!');
            return;
        }

        try {
            setSavingAy(true);
            setErrorMsg('');
            setSuccessMsg('');

            if (editingAyId) {
                // Mode Update
                await academicYearService.updateAcademicYear(editingAyId, tenantId, {
                    year_name: ayYearName.trim(),
                    start_date: ayStartDate || null,
                    end_date: ayEndDate || null,
                });
                setSuccessMsg('Tahun Ajaran berhasil diperbarui.');
            } else {
                // Mode Tambah Baru
                await academicYearService.createAcademicYear({
                    tenant_id: tenantId,
                    year_name: ayYearName.trim(),
                    start_date: ayStartDate || undefined,
                    end_date: ayEndDate || undefined,
                    is_active: false
                });
                setSuccessMsg('Tahun Ajaran berhasil ditambahkan.');
            }

            // Reset Form & Refresh Data
            setEditingAyId(null);
            setAyYearName('');
            setAyStartDate('');
            setAyEndDate('');

            const updatedList = await academicYearService.fetchAcademicYears(tenantId);
            setAcademicYears(updatedList || []);
            setTimeout(() => setSuccessMsg(''), 4000);
        } catch (err: any) {
            setErrorMsg('Gagal menyimpan Tahun Ajaran: ' + err.message);
        } finally {
            setSavingAy(false);
        }
    };

    // Handler Set Active Tahun Ajaran
    const handleSetActiveAcademicYear = async (id: string) => {
        try {
            setErrorMsg('');
            setSuccessMsg('');

            await academicYearService.setAsActive(id, tenantId);

            // Refresh data
            const [updatedList, updatedActive] = await Promise.all([
                academicYearService.fetchAcademicYears(tenantId),
                academicYearService.getActiveAcademicYear(tenantId)
            ]);
            setAcademicYears(updatedList || []);
            setActiveAcademicYear(updatedActive);

            setSuccessMsg('Tahun Ajaran aktif berhasil diubah.');
            setTimeout(() => setSuccessMsg(''), 4000);
        } catch (err: any) {
            setErrorMsg('Gagal mengaktifkan Tahun Ajaran: ' + err.message);
        }
    };

    // Handler Hapus Tahun Ajaran
    const handleDeleteAcademicYear = async (id: string) => {
        if (!confirm('Apakah Anda yakin ingin menghapus Tahun Ajaran ini?')) return;

        try {
            setErrorMsg('');
            await academicYearService.deleteAcademicYear(id);

            // Refresh data
            const updatedList = await academicYearService.fetchAcademicYears(tenantId);
            setAcademicYears(updatedList || []);

            setSuccessMsg('Tahun Ajaran berhasil dihapus.');
            setTimeout(() => setSuccessMsg(''), 4000);
        } catch (err: any) {
            setErrorMsg('Gagal menghapus Tahun Ajaran: ' + err.message);
        }
    };


    return (
        <div
            className="admin-theme-root min-h-screen font-sans flex flex-col justify-between select-none transition-colors duration-300 pb-28"
            data-theme={theme}
            style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}
        >
            <div
                className="sticky top-0 z-30 backdrop-blur-md border-b px-4 py-3 max-w-md mx-auto w-full shadow-xs"
                style={{ backgroundColor: 'var(--bg-header)', borderColor: 'var(--border-theme)' }}
            >
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="font-bold text-sm text-white">Konfigurasi Sekolah</h1>
                        <p className="text-[10px] text-blue-100">Kelola hari efektif dan hari libur</p>
                    </div>

                    <button
                        onClick={() => handleSwitchTheme(theme === 'light' ? 'dark' : 'light')}
                        className="text-[10px] font-bold px-2.5 py-1.5 rounded-xl shadow border transition flex items-center gap-1 cursor-pointer bg-white/20 text-white border-white/30 hover:bg-white/30"
                    >
                        <span>{theme === 'light' ? '🌙 Dark' : '☀️ Light'}</span>
                    </button>
                </div>
            </div>

            <main className="max-w-md w-full mx-auto p-4 space-y-3 flex-1">
                {successMsg && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium rounded-xl shadow-xs">
                        ✨ {successMsg}
                    </div>
                )}
                {errorMsg && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-xl shadow-xs">
                        ⚠️ {errorMsg}
                    </div>
                )}

                {/* ACCORDION 1: GLOBAL DENGAN SAFETY NET */}
                <div
                    className="border rounded-2xl overflow-hidden transition-all shadow-xs hover:border-[var(--border-hover-theme)]"
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)' }}
                >
                    <button
                        type="button"
                        onClick={() => toggleSection('globalHes')}
                        className="w-full p-4 border-b flex items-center justify-between text-left cursor-pointer"
                        style={{ borderColor: 'var(--border-theme)', backgroundColor: 'var(--bg-card)' }}
                    >
                        <div>
                            <h2 className="font-bold text-xs uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>1. Hari Efektif Global (ALL)</h2>
                            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Pengaturan standar atau custom untuk seluruh institusi.</p>
                        </div>
                        <span className="text-xs font-bold text-blue-600">{openSections.globalHes ? '▲' : '▼'}</span>
                    </button>

                    {openSections.globalHes && (
                        <div className="p-4 space-y-3 animate-fadeIn">
                            {/* BLOK CURRENT ACADEMIC YEAR (INFO SAJA) */}
                            <div
                                className="p-3.5 rounded-xl border flex items-center justify-between shadow-sm transition-colors"
                                style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-theme)' }}
                            >
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>
                                        Tahun Ajaran Berjalan
                                    </p>
                                    <h3 className="text-sm font-extrabold" style={{ color: 'var(--text-main)' }}>
                                        {activeAcademicYear ? activeAcademicYear.year_name : 'Belum Ditentukan'}
                                    </h3>
                                    {activeAcademicYear && (
                                        <p className="text-[10px] font-medium opacity-80 mt-0.5" style={{ color: 'var(--text-main)' }}>
                                            {activeAcademicYear.start_date || '?'} s/d {activeAcademicYear.end_date || '?'}
                                        </p>
                                    )}
                                </div>
                                <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg" style={{ backgroundColor: 'var(--bg-card-hover)', color: 'var(--text-main)' }}>
                                    🎓
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setPendingPresetDays(5)}
                                    disabled={savingSettings}
                                    className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer relative ${globalHesMode === '5'
                                        ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/10 font-bold'
                                        : 'border-[var(--border-theme)] font-medium'
                                        }`}
                                    style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}
                                >
                                    <div className="flex justify-between items-center w-full mb-1">
                                        <span className="text-sm">📅</span>
                                        {globalHesMode === '5' && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>}
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-bold leading-tight">Standard</p>
                                        <p className="text-[9px] font-normal" style={{ color: 'var(--text-muted)' }}>5 Hari</p>
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setPendingPresetDays(6)}
                                    disabled={savingSettings}
                                    className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer relative ${globalHesMode === '6'
                                        ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/10 font-bold'
                                        : 'border-[var(--border-theme)] font-medium'
                                        }`}
                                    style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}
                                >
                                    <div className="flex justify-between items-center w-full mb-1">
                                        <span className="text-sm">📅</span>
                                        {globalHesMode === '6' && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>}
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-bold leading-tight">Standard</p>
                                        <p className="text-[9px] font-normal" style={{ color: 'var(--text-muted)' }}>6 Hari</p>
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setGlobalHesMode('custom')}
                                    className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer relative ${globalHesMode === 'custom'
                                        ? 'border-purple-500 ring-1 ring-purple-500 bg-purple-50/10 font-bold'
                                        : 'border-[var(--border-theme)] font-medium'
                                        }`}
                                    style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}
                                >
                                    <div className="flex justify-between items-center w-full mb-1">
                                        <span className="text-sm">⚙️</span>
                                        {globalHesMode === 'custom' && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>}
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-bold leading-tight">Custom ALL</p>
                                        <p className="text-[9px] font-normal" style={{ color: 'var(--text-muted)' }}>Atur bebas</p>
                                    </div>
                                </button>
                            </div>

                            {globalHesMode === 'custom' && (
                                <div className="space-y-2 pt-1 animate-fadeIn">
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                                        {Object.entries(globalCustomDays).map(([day, active]) => (
                                            <label
                                                key={day}
                                                className="flex items-center justify-between p-2 rounded-xl border text-xs capitalize cursor-pointer bg-white text-slate-800 shadow-xs"
                                            >
                                                <span>{day}</span>
                                                <input
                                                    type="checkbox"
                                                    checked={active}
                                                    onChange={(e) => setGlobalCustomDays({ ...globalCustomDays, [day]: e.target.checked })}
                                                    className="rounded text-blue-600 w-4 h-4 cursor-pointer"
                                                />
                                            </label>
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        disabled={savingGlobalCustom}
                                        onClick={handleSaveGlobalCustomDays}
                                        className="w-full bg-slate-700 hover:bg-slate-800 text-white font-bold py-2 px-3 rounded-xl text-xs transition shadow-xs cursor-pointer tracking-wider uppercase"
                                    >
                                        {savingGlobalCustom ? 'Menyimpan...' : 'Simpan Pengaturan Global (ALL)'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ACCORDION 2: PENGECUALIAN KELAS */}
                <div
                    className="border rounded-2xl overflow-hidden transition-all shadow-xs hover:border-[var(--border-hover-theme)]"
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)' }}
                >
                    <button
                        type="button"
                        onClick={() => toggleSection('classHes')}
                        className="w-full p-4 border-b flex items-center justify-between text-left cursor-pointer"
                        style={{ borderColor: 'var(--border-theme)', backgroundColor: 'var(--bg-card)' }}
                    >
                        <div>
                            <h2 className="font-bold text-xs uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>2. Pengecualian Spesifik Kelas (Override)</h2>
                            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Status & pengaturan khusus hari efektif per kelas.</p>
                        </div>
                        <span className="text-xs font-bold text-blue-600">{openSections.classHes ? '▲' : '▼'}</span>
                    </button>

                    {openSections.classHes && (
                        <div className="p-4 space-y-4 animate-fadeIn">
                            <div className="space-y-2">
                                <p className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>📋 Status HES Masing-Masing Kelas (Klik untuk Detail)</p>
                                <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                                    {classList.map(cls => {
                                        const status = classHesOverrides[cls.class_id] || { isCustom: false, days: globalCustomDays };
                                        const isExpanded = expandedStatusClass === cls.class_id;

                                        return (
                                            <div
                                                key={cls.class_id}
                                                className="rounded-xl border bg-white text-slate-800 shadow-xs overflow-hidden transition"
                                            >
                                                <div
                                                    onClick={() => setExpandedStatusClass(isExpanded ? null : cls.class_id)}
                                                    className="p-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-50"
                                                >
                                                    <div>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-bold text-xs">{cls.class_name}</span>
                                                            <span className="text-[10px] text-slate-400">{isExpanded ? '▲' : '▼'}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1 mt-0.5">
                                                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${status.isCustom ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'
                                                                }`}>
                                                                {status.isCustom ? '⚙️ Custom Override' : '🌐 Mengikuti Global (ALL)'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {status.isCustom && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDisableClassOverride(cls.class_id);
                                                            }}
                                                            className="text-[10px] bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold px-2 py-1 rounded-lg transition cursor-pointer"
                                                        >
                                                            Disable / Reset
                                                        </button>
                                                    )}
                                                </div>

                                                {isExpanded && (
                                                    <div className="px-3 pb-3 pt-1 bg-slate-50 border-t border-slate-100 animate-fadeIn space-y-2">
                                                        <p className="text-[10px] font-bold text-slate-500">Detail Hari Efektif Kelas Ini:</p>
                                                        <div className="grid grid-cols-4 gap-1">
                                                            {Object.entries(status.days || {}).map(([day, active]) => (
                                                                <div
                                                                    key={day}
                                                                    className={`px-2 py-1 rounded-lg text-[10px] capitalize text-center border font-medium ${active
                                                                        ? 'bg-blue-50 border-blue-200 text-blue-700'
                                                                        : 'bg-slate-100 border-slate-200 text-slate-400 line-through'
                                                                        }`}
                                                                >
                                                                    {day}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <hr className="border-slate-200" />

                            <div className="space-y-3">
                                <div>
                                    <p className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>⚙️ Atur Override Kelas Baru</p>
                                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Pilih kelas dan tentukan hari operasional khususnya.</p>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>Pilih Kelas Target (Multi-Select):</label>
                                    <input
                                        type="text"
                                        placeholder="Cari kelas..."
                                        value={classSearchKeyword}
                                        onChange={(e) => setClassSearchKeyword(e.target.value)}
                                        className="w-full px-3 py-1.5 rounded-xl border text-xs bg-white text-slate-800"
                                    />
                                    <div className="max-h-28 overflow-y-auto p-2 rounded-xl border bg-white space-y-1 shadow-inner">
                                        {classList
                                            .filter(cls => cls.class_name.toLowerCase().includes(classSearchKeyword.toLowerCase()))
                                            .map(cls => {
                                                const isChecked = selectedCustomClasses.includes(cls.class_id);
                                                return (
                                                    <label
                                                        key={cls.class_id}
                                                        className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer text-xs font-medium text-slate-800"
                                                    >
                                                        <span>{cls.class_name}</span>
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setSelectedCustomClasses([...selectedCustomClasses, cls.class_id]);
                                                                } else {
                                                                    setSelectedCustomClasses(selectedCustomClasses.filter(id => id !== cls.class_id));
                                                                }
                                                            }}
                                                            className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                                                        />
                                                    </label>
                                                );
                                            })}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
                                    {Object.entries(specificCustomDays).map(([day, active]) => (
                                        <label
                                            key={day}
                                            className="flex items-center justify-between p-2 rounded-xl border text-xs capitalize cursor-pointer bg-white text-slate-800 shadow-xs"
                                        >
                                            <span>{day}</span>
                                            <input
                                                type="checkbox"
                                                checked={active}
                                                onChange={(e) => setSpecificCustomDays({ ...specificCustomDays, [day]: e.target.checked })}
                                                className="rounded text-blue-600 w-4 h-4 cursor-pointer"
                                            />
                                        </label>
                                    ))}
                                </div>

                                <button
                                    type="button"
                                    disabled={savingSpecificCustom}
                                    onClick={handleSaveSpecificCustomDays}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-xl text-xs transition shadow-xs cursor-pointer tracking-wider uppercase"
                                >
                                    {savingSpecificCustom ? 'Menyimpan...' : 'Simpan Override Kelas Terpilih'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* MENU BUTTON LINK KE HALAMAN KHUSUS JADWAL */}
                <div
                    className="border rounded-2xl p-4 transition-all shadow-xs flex items-center justify-between hover:border-[var(--border-hover-theme)] cursor-pointer"
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)' }}
                    onClick={() => router.push('/admin/settings/schedulesetting')} // Sesuaikan rute target halaman jadwal nantinya
                >
                    <div>
                        <h2 className="font-bold text-xs uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>3. Jadwal Belajar Kelas & Mapel</h2>
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Kelola roster, jam pelajaran, dan matriks jadwal.</p>
                    </div>
                    <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-blue-600 text-white shadow-xs">Buka &rarr;</span>
                </div>

                {/* ACCORDION 4: LIBUR */}
                <div
                    className="border rounded-2xl overflow-hidden transition-all shadow-xs hover:border-[var(--border-hover-theme)]"
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)' }}
                >
                    <button
                        type="button"
                        onClick={() => toggleSection('holiday')}
                        className="w-full p-4 border-b flex items-center justify-between text-left cursor-pointer"
                        style={{ borderColor: 'var(--border-theme)', backgroundColor: 'var(--bg-card)' }}
                    >
                        <div>
                            <h2 className="font-bold text-xs uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>4. Kalender Libur & Cuti</h2>
                            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Input rentang tanggal libur nasional atau semester.</p>
                        </div>
                        <span className="text-xs font-bold text-blue-600">{openSections.holiday ? '▲' : '▼'}</span>
                    </button>

                    {openSections.holiday && (
                        <div className="p-4 space-y-3 animate-fadeIn">
                            <form onSubmit={handleAddHoliday} className="space-y-2.5">
                                <div>
                                    <label className="block text-[10px] font-bold mb-1" style={{ color: 'var(--text-muted)' }}>Keterangan Libur / Acara</label>
                                    <input
                                        type="text"
                                        placeholder="Misal: Libur Semester Genap / Hari Raya"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-theme)', color: 'var(--text-main)' }}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[10px] font-bold mb-1" style={{ color: 'var(--text-muted)' }}>Dari Tanggal</label>
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-theme)', color: 'var(--text-main)' }}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold mb-1" style={{ color: 'var(--text-muted)' }}>Sampai Tanggal</label>
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-theme)', color: 'var(--text-main)' }}
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={savingHoliday}
                                    className="w-full mt-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    {savingHoliday ? 'Menyimpan...' : '➕ Tambahkan Jadwal Libur'}
                                </button>
                            </form>

                            <div className="pt-2 border-t space-y-2" style={{ borderColor: 'var(--border-theme)' }}>
                                <h3 className="text-[11px] font-bold" style={{ color: 'var(--text-muted)' }}>Daftar Libur Terdaftar ({holidays.length})</h3>

                                {holidays.length === 0 ? (
                                    <p className="text-[10px] italic text-center py-3 rounded-xl" style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-muted)' }}>Belum ada kalender libur yang ditambahkan.</p>
                                ) : (
                                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                        {holidays.map((h) => (
                                            <div
                                                key={h.holiday_id}
                                                className="group/item p-2.5 rounded-xl border transition flex items-center justify-between text-xs hover:border-[var(--border-hover-theme)]"
                                                style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-theme)' }}
                                            >
                                                <div>
                                                    <p className="font-bold leading-tight" style={{ color: 'var(--text-main)' }}>{h.description}</p>
                                                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                                        {h.start_date === h.end_date ? h.start_date : `${h.start_date} s.d. ${h.end_date}`}
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteHoliday(h.holiday_id)}
                                                    className="text-rose-500 hover:text-rose-700 font-bold text-[10px] bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded-lg border border-rose-200 transition cursor-pointer"
                                                >
                                                    Hapus
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ACCORDION 5: REFERENSI & PENDUKUNG (SUBJECTS & ACADEMIC YEARS) */}
                    <div
                        className="border rounded-2xl overflow-hidden transition-all shadow-xs hover:border-[var(--border-hover-theme)]"
                        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)' }}
                    >
                        <button
                            type="button"
                            onClick={() => toggleSection('subjects' as any)}
                            className="w-full p-4 border-b flex items-center justify-between text-left cursor-pointer"
                            style={{ borderColor: 'var(--border-theme)', backgroundColor: 'var(--bg-card)' }}
                        >
                            <div>
                                <h2 className="font-bold text-xs uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>5. Referensi & Pendukung (Mata Pelajaran)</h2>
                                <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Kelola master data mata pelajaran institusi.</p>
                            </div>
                            <span className="text-xs font-bold text-blue-600">{openSections.subjects ? '▲' : '▼'}</span>
                        </button>

                        {openSections.subjects && (
                            <div className="p-4 space-y-3 animate-fadeIn">
                                {/* --- BAGIAN TAHUN AJARAN --- */}
                                <div className="space-y-3">
                                    <h3 className="text-xs font-extrabold uppercase tracking-wider border-b pb-1" style={{ color: 'var(--text-main)', borderColor: 'var(--border-theme)' }}>
                                        Master Tahun Ajaran
                                    </h3>

                                    {/* FORM TAMBAH TAHUN AJARAN */}
                                    <form onSubmit={handleSaveAcademicYear} className="space-y-2.5 p-3 rounded-xl border shadow-sm transition-colors" style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-theme)' }}>
                                        <div>
                                            <label className="block text-[10px] font-bold mb-1 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Tahun Ajaran <span className="text-rose-500">*</span></label>
                                            <input
                                                type="text"
                                                placeholder="Cth: 2026/2027"
                                                value={ayYearName}
                                                onChange={(e) => setAyYearName(e.target.value)}
                                                className="w-full px-3 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-transparent transition-colors"
                                                style={{ borderColor: 'var(--border-theme)', color: 'var(--text-main)' }}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-[10px] font-bold mb-1 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Mulai (Opsional)</label>
                                                <input
                                                    type="date"
                                                    value={ayStartDate}
                                                    onChange={(e) => setAyStartDate(e.target.value)}
                                                    className="w-full px-3 py-1.5 rounded-lg border text-xs outline-none bg-transparent transition-colors"
                                                    style={{ borderColor: 'var(--border-theme)', color: 'var(--text-main)' }}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold mb-1 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Selesai (Opsional)</label>
                                                <input
                                                    type="date"
                                                    value={ayEndDate}
                                                    onChange={(e) => setAyEndDate(e.target.value)}
                                                    className="w-full px-3 py-1.5 rounded-lg border text-xs outline-none bg-transparent transition-colors"
                                                    style={{ borderColor: 'var(--border-theme)', color: 'var(--text-main)' }}
                                                />
                                            </div>
                                        </div>
                                        
                                        <div className="flex gap-2 mt-1">
                                            <button type="submit" disabled={savingAy} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold shadow-sm active:scale-95 transition cursor-pointer">
                                                {savingAy ? 'Menyimpan...' : (editingAyId ? '💾 Simpan Perubahan' : '➕ Tambah Master Tahun Ajaran')}
                                            </button>
                                            {editingAyId && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEditingAyId(null);
                                                        setAyYearName('');
                                                        setAyStartDate('');
                                                        setAyEndDate('');
                                                    }}
                                                    className="px-3 py-2 bg-slate-500 hover:bg-slate-600 text-white rounded-lg text-[11px] font-bold transition cursor-pointer"
                                                >
                                                    Batal
                                                </button>
                                            )}
                                        </div>
                                    </form>

                                    {/* DAFTAR TAHUN AJARAN */}
                                    <div className="max-h-40 overflow-y-auto pr-1 space-y-1.5 pt-1">
                                        {academicYears.map((ay) => (
                                            <div
                                                key={ay.academic_year_id}
                                                className="p-2.5 rounded-xl border flex items-center justify-between text-xs transition shadow-sm hover:border-[var(--border-hover-theme)]"
                                                style={{
                                                    backgroundColor: ay.is_active ? 'var(--bg-card-hover)' : 'var(--bg-card)',
                                                    borderColor: ay.is_active ? 'var(--accent-btn)' : 'var(--border-theme)'
                                                }}
                                            >
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold" style={{ color: ay.is_active ? 'var(--accent-btn)' : 'var(--text-main)' }}>{ay.year_name}</span>
                                                        {ay.is_active && <span className="text-[8px] bg-emerald-500 text-white px-1.5 py-0.5 rounded-md font-bold uppercase tracking-widest shadow-sm">Active</span>}
                                                    </div>
                                                    <span className="text-[9px] font-medium mt-0.5 block" style={{ color: 'var(--text-muted)' }}>
                                                        {ay.start_date || '-'} s/d {ay.end_date || '-'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    {!ay.is_active && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setPendingActionAy({ type: 'active', id: ay.academic_year_id, name: ay.year_name })}
                                                            className="text-[10px] font-bold px-2 py-1 rounded-md transition border cursor-pointer hover:opacity-80"
                                                            style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-theme)', color: 'var(--text-main)' }}
                                                        >
                                                            Set Active
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setEditingAyId(ay.academic_year_id);
                                                            setAyYearName(ay.year_name);
                                                            setAyStartDate(ay.start_date || '');
                                                            setAyEndDate(ay.end_date || '');
                                                        }}
                                                        className="text-[10px] bg-blue-50 hover:bg-blue-100 text-blue-600 px-2 py-1 rounded-md transition border border-blue-200 font-bold cursor-pointer"
                                                    >
                                                        Edit
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <hr className="border-slate-200" style={{ borderColor: 'var(--border-theme)' }} />

                                <div className="space-y-3">
                                    <h3 className="text-xs font-extrabold uppercase tracking-wider border-b pb-1" style={{ color: 'var(--text-main)', borderColor: 'var(--border-theme)' }}>
                                        Master Mata Pelajaran
                                    </h3>

                                    <form onSubmit={handleAddSubject} className="space-y-2.5 p-3 rounded-xl border shadow-sm transition-colors" style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-theme)' }}>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="col-span-1">
                                                <label className="block text-[10px] font-bold mb-1 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Kode (Opsional)</label>
                                                <input
                                                    type="text"
                                                    placeholder="Cth: MAT"
                                                    value={subjectCode}
                                                    onChange={(e) => setSubjectCode(e.target.value)}
                                                    className="w-full px-3 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-transparent transition-colors"
                                                    style={{ borderColor: 'var(--border-theme)', color: 'var(--text-main)' }}
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="block text-[10px] font-bold mb-1 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Nama Mata Pelajaran</label>
                                                <input
                                                    type="text"
                                                    placeholder="Cth: Matematika Lanjutan"
                                                    value={subjectName}
                                                    onChange={(e) => setSubjectName(e.target.value)}
                                                    className="w-full px-3 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-transparent transition-colors"
                                                    style={{ borderColor: 'var(--border-theme)', color: 'var(--text-main)' }}
                                                />
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={savingSubject}
                                            className="w-full mt-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg text-[11px] shadow-sm active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer"
                                        >
                                            {savingSubject ? 'Menyimpan...' : '➕ Tambahkan Mata Pelajaran'}
                                        </button>
                                    </form>
                                </div>

                                <div className="pt-2 border-t space-y-2" style={{ borderColor: 'var(--border-theme)' }}>
                                    <h3 className="text-[11px] font-bold" style={{ color: 'var(--text-muted)' }}>Daftar Mata Pelajaran ({subjects.length})</h3>

                                    {subjects.length === 0 ? (
                                        <p className="text-[10px] italic text-center py-3 rounded-xl" style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-muted)' }}>Belum ada mata pelajaran terdaftar.</p>
                                    ) : (
                                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                            {subjects.map((sub) => (
                                                <div
                                                    key={sub.subject_id}
                                                    className="group/item p-2.5 rounded-xl border transition flex items-center justify-between text-xs hover:border-[var(--border-hover-theme)]"
                                                    style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-theme)' }}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        {sub.subject_code && (
                                                            <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 font-bold text-[10px]">
                                                                {sub.subject_code}
                                                            </span>
                                                        )}
                                                        <p className="font-bold leading-tight" style={{ color: 'var(--text-main)' }}>{sub.subject_name}</p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteSubject(sub.subject_id)}
                                                        className="text-rose-500 hover:text-rose-700 font-bold text-[10px] bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded-lg border border-rose-200 transition cursor-pointer"
                                                    >
                                                        Hapus
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            </main>

            {/* MODAL SAFETY NET / KONFIRMASI PRESET GLOBAL */}
            {pendingPresetDays !== null && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
                    <div
                        className="w-full max-w-xs rounded-2xl p-4 space-y-3 shadow-xl border animate-scaleUp"
                        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)' }}
                    >
                        <div className="text-center space-y-1">
                            <span className="text-2xl">⚠️</span>
                            <h3 className="font-bold text-xs uppercase tracking-wider text-rose-500">Konfirmasi Perubahan Global</h3>
                            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                                Anda akan mengubah standar hari efektif global menjadi <strong className="text-blue-500">{pendingPresetDays} Hari Sekolah</strong> untuk seluruh institusi. Tindakan ini akan berdampak sistemik.
                            </p>
                        </div>

                        <div className="flex gap-2 pt-1">
                            <button
                                type="button"
                                onClick={() => setPendingPresetDays(null)}
                                className="flex-1 py-2 rounded-xl border text-xs font-bold cursor-pointer transition"
                                style={{ borderColor: 'var(--border-theme)', color: 'var(--text-main)' }}
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={confirmAndApplyStandardPreset}
                                className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer transition shadow-xs"
                            >
                                Ya, Ubah Sistem
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL SAFETY NET / KONFIRMASI TAHUN AJARAN */}
            {pendingActionAy !== null && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
                    <div
                        className="w-full max-w-xs rounded-2xl p-4 space-y-3 shadow-xl border animate-scaleUp"
                        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)' }}
                    >
                        <div className="text-center space-y-1">
                            <span className="text-2xl">⚠️</span>
                            <h3 className="font-bold text-xs uppercase tracking-wider text-rose-500">
                                {pendingActionAy.type === 'active' ? 'Konfirmasi Beralih Tahun Ajaran' : 'Konfirmasi Hapus Tahun Ajaran'}
                            </h3>
                            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                                {pendingActionAy.type === 'active' ? (
                                    <>Peringatan! Anda hendak Ubah / Beralih Tahun Ajaran ke <strong className="text-blue-500">{pendingActionAy.name}</strong>?</>
                                ) : (
                                    <>Peringatan! Anda hendak menghapus Tahun Ajaran <strong className="text-rose-500">{pendingActionAy.name}</strong>? Tindakan ini dapat berdampak sistemik jika masih ada data kelas yang terikat.</>
                                )}
                            </p>
                        </div>

                        <div className="flex gap-2 pt-1">
                            <button
                                type="button"
                                onClick={() => setPendingActionAy(null)}
                                className="flex-1 py-2 rounded-xl border text-xs font-bold cursor-pointer transition"
                                style={{ borderColor: 'var(--border-theme)', color: 'var(--text-main)' }}
                            >
                                Tidak
                            </button>
                            <button
                                type="button"
                                onClick={async () => {
                                    const action = pendingActionAy;
                                    setPendingActionAy(null);
                                    if (action.type === 'active') {
                                        await handleSetActiveAcademicYear(action.id);
                                    } else {
                                        await handleDeleteAcademicYear(action.id);
                                    }
                                }}
                                className={`flex-1 py-2 rounded-xl text-white text-xs font-bold cursor-pointer transition shadow-xs ${pendingActionAy.type === 'active' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-rose-600 hover:bg-rose-700'
                                    }`}
                            >
                                Ya
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <BottomNav />
        </div>
    );
}