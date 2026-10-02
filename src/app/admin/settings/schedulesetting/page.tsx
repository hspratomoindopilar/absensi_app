'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { scheduleService } from '@/services/scheduleService';
import '@/style/admin-theme.css';

const DAYS_ORDER = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

interface FormRow {
    id?: string;
    type: 'mapel' | 'non_mapel';
    subject_id: string;
    activity_name: string;
    teacher_id: string;
    start_time: string;
    end_time: string;
}

export default function ScheduleSettingPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [tenantId, setTenantId] = useState('');

    const [classList, setClassList] = useState<any[]>([]);
    const [allSubjects, setAllSubjects] = useState<any[]>([]);
    const [allTeachers, setAllTeachers] = useState<any[]>([]);
    const [classAssignments, setClassAssignments] = useState<any[]>([]);

    const [selectedClassId, setSelectedClassId] = useState('');
    const [activeDays, setActiveDays] = useState<string[]>([]);
    const [weeklySchedule, setWeeklySchedule] = useState<Record<string, any[]>>({});
    const [loadingSchedule, setLoadingSchedule] = useState(false);

    // State untuk mode Card Expand/Collapse
    const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

    const [editingDay, setEditingDay] = useState<string | null>(null);
    const [scheduleForm, setScheduleForm] = useState<FormRow[]>([]);
    const [saving, setSaving] = useState(false);

    const [dailySchedulesAllClasses, setDailySchedulesAllClasses] = useState<any[]>([]);

    const [activeAcademicYearName, setActiveAcademicYearName] = useState<string>('');

    

    useEffect(() => {
        const savedTheme = (localStorage.getItem('admin_active_theme') as 'light' | 'dark') || 'light';
        setTheme(savedTheme);

        async function init() {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.user?.email) return router.replace('/login');

                const { data: userData } = await supabase.from('users').select('tenant_id').eq('email', session.user.email).single();
                if (!userData?.tenant_id) return;

                setTenantId(userData.tenant_id);

                // Ambil tahun ajaran aktif untuk ditampilkan di header
                const { data: activeAy } = await supabase
                    .from('academic_years')
                    .select('year_name')
                    .eq('tenant_id', userData.tenant_id)
                    .eq('is_active', true)
                    .single();

                if (activeAy) {
                    setActiveAcademicYearName(activeAy.year_name);
                }

                const masterData = await scheduleService.fetchScheduleMasterData(userData.tenant_id);
                setClassList(masterData.classes);
                setAllSubjects(masterData.subjects);
                setAllTeachers(masterData.teachers);

            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        init();
    }, [router]);

    useEffect(() => {
        if (!tenantId || !selectedClassId) {
            setWeeklySchedule({});
            setActiveDays([]);
            setClassAssignments([]);
            setExpandedDays({});
            return;
        }

        async function loadClassData() {
            setLoadingSchedule(true);
            try {
                const days = await scheduleService.fetchActiveDaysForClass(tenantId, selectedClassId);
                const normalizedDays = days.map((d: string) => d.toLowerCase());
                setActiveDays(normalizedDays);

                const assignments = await scheduleService.fetchClassAssignments(tenantId, selectedClassId);
                setClassAssignments(assignments);

                const weeklyData: Record<string, any[]> = {};
                for (const day of DAYS_ORDER) {
                    if (normalizedDays.includes(day.toLowerCase())) {
                        const sched = await scheduleService.fetchScheduleByDay(tenantId, selectedClassId, day.toLowerCase());
                        weeklyData[day.toLowerCase()] = sched || [];
                    }
                }
                setWeeklySchedule(weeklyData);
            } catch (err) {
                console.error(err);
            } finally {
                setLoadingSchedule(false);
            }
        }
        loadClassData();
    }, [tenantId, selectedClassId]);

    const toggleExpandDay = (day: string) => {
        setExpandedDays(prev => ({
            ...prev,
            [day]: !prev[day]
        }));
    };

    const openBuilder = async (day: string) => {
        setEditingDay(day);

        const scheds = await scheduleService.fetchDailySchedulesAllClasses(tenantId, day);
        setDailySchedulesAllClasses(scheds);

        const existingData = weeklySchedule[day] || [];
        if (existingData.length > 0) {
            setScheduleForm(existingData.map(item => ({
                id: item.schedule_id,
                type: item.subject_id ? 'mapel' : 'non_mapel',
                subject_id: item.subject_id || '',
                activity_name: item.activity_name || '',
                teacher_id: item.teacher_id || '',
                start_time: item.start_time.substring(0, 5),
                end_time: item.end_time.substring(0, 5)
            })));
        } else {
            setScheduleForm([{
                type: 'mapel',
                subject_id: '',
                activity_name: '',
                teacher_id: '',
                start_time: '07:00',
                end_time: '07:45'
            }]);
        }
    };

    const closeBuilder = () => {
        setEditingDay(null);
        setScheduleForm([]);
    };

    const handleAddRow = () => {
        setScheduleForm(prev => {
            const lastRow = prev[prev.length - 1];
            return [...prev, {
                type: 'mapel',
                subject_id: '',
                activity_name: '',
                teacher_id: '',
                start_time: lastRow ? lastRow.end_time : '07:00',
                end_time: ''
            }];
        });
    };

    const handleRemoveRow = (index: number) => {
        setScheduleForm(prev => prev.filter((_, i) => i !== index));
    };

    const handleRowChange = (index: number, field: keyof FormRow, value: string) => {
        setScheduleForm(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };

            if (field === 'type') {
                updated[index].subject_id = '';
                updated[index].activity_name = '';
                updated[index].teacher_id = '';
            }
            if (field === 'subject_id') {
                updated[index].teacher_id = '';
            }
            return updated;
        });
    };

    const getTeacherOverlapInfo = (teacherId: string, rowStartTime: string, rowEndTime: string) => {
        if (!rowStartTime || !rowEndTime) return null;
        return dailySchedulesAllClasses.find(sched => {
            if (sched.teacher_id !== teacherId) return false;
            if (sched.class_id === selectedClassId) return false; 

            const dbStart = sched.start_time.substring(0, 5);
            const dbEnd = sched.end_time.substring(0, 5);

            return (rowStartTime < dbEnd) && (rowEndTime > dbStart);
        });
    };

    const handleSaveBuilder = async () => {
        if (!editingDay || !selectedClassId) return;

        const payload = [];
        for (let i = 0; i < scheduleForm.length; i++) {
            const row = scheduleForm[i];
            if (!row.start_time || !row.end_time) return alert(`Baris ke-${i + 1}: Jam Mulai dan Selesai wajib diisi.`);
            if (row.start_time >= row.end_time) return alert(`Baris ke-${i + 1}: Jam Selesai harus lebih besar dari Jam Mulai.`);
            if (row.type === 'mapel' && (!row.subject_id || !row.teacher_id)) return alert(`Baris ke-${i + 1}: Mapel dan Guru wajib dipilih.`);
            if (row.type === 'non_mapel' && !row.activity_name) return alert(`Baris ke-${i + 1}: Nama aktivitas wajib diisi.`);

            if (row.type === 'mapel' && row.teacher_id) {
                const overlap = getTeacherOverlapInfo(row.teacher_id, row.start_time, row.end_time);
                if (overlap) {
                    const overlapData = overlap as any;
                    const cName = Array.isArray(overlapData.classes) ? overlapData.classes[0]?.class_name : overlapData.classes?.class_name;
                    return alert(`BENTROK TERDETEKSI pada baris ke-${i + 1}!\nGuru ini sudah mengajar di kelas ${cName || 'Lainnya'} pada jam ${overlapData.start_time.substring(0, 5)} - ${overlapData.end_time.substring(0, 5)}.`);
                }
            }

            payload.push({
                subject_id: row.type === 'mapel' ? row.subject_id : null,
                teacher_id: row.type === 'mapel' ? row.teacher_id : null,
                activity_name: row.type === 'non_mapel' ? row.activity_name : null,
                start_time: row.start_time,
                end_time: row.end_time
            });
        }

        try {
            setSaving(true);
            await scheduleService.saveBatchScheduleDay(tenantId, selectedClassId, editingDay, payload);

            alert(`Jadwal hari ${editingDay.toUpperCase()} berhasil disimpan!`);
            const updatedDaySched = await scheduleService.fetchScheduleByDay(tenantId, selectedClassId, editingDay);
            setWeeklySchedule(prev => ({ ...prev, [editingDay]: updatedDaySched || [] }));
            closeBuilder();
        } catch (err: any) {
            alert('Gagal menyimpan jadwal: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><p className="text-xs font-bold animate-pulse">Memuat Modul Roster...</p></div>;

    // ========================================================================
    // TAMPILAN BUILDER MODE (CREATE / EDIT)
    // ========================================================================
    if (editingDay) {
        // Ambil nama kelas untuk ditampilkan di header
        const activeClassName = classList.find(c => c.class_id === selectedClassId)?.class_name || 'Kelas Tidak Diketahui';

        return (
            <div className="min-h-screen p-4 sm:p-6 pb-28 font-sans" style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}>
                <div className="max-w-6xl mx-auto space-y-4">
                    <div className="rounded-2xl p-4 shadow-md border flex justify-between items-center bg-blue-600 text-white">
                        <div>
                            {/* Menambahkan Nama Kelas di Header Builder */}
                            <h1 className="font-extrabold text-sm uppercase tracking-wide">
                                Builder Jadwal: Hari {editingDay} <span className="text-blue-200 ml-1">| KELAS {activeClassName}</span>
                            </h1>
                            <p className="text-[10px] opacity-80 mt-0.5">Menyusun blok waktu jadwal harian.</p>
                        </div>
                        <button onClick={closeBuilder} className="text-xs font-bold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition cursor-pointer">
                            ✕ Kembali
                        </button>
                    </div>

                    <div className="rounded-2xl p-4 shadow-md border bg-white text-slate-800 overflow-hidden">
                        <div className="overflow-x-auto w-full pb-4">
                            <table className="w-full min-w-[950px] text-left text-xs border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200">
                                        <th className="p-2 w-10 text-center">No</th>
                                        <th className="p-2 w-28">Mulai (Pilih Jam)</th>
                                        <th className="p-2 w-28">Selesai (Pilih Jam)</th>
                                        <th className="p-2 w-36">Jenis</th>
                                        <th className="p-2 w-48">Mata Pelajaran / Aktivitas</th>
                                        <th className="p-2 w-56">Guru Pengampu</th>
                                        <th className="p-2 w-12 text-center">Hapus</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {scheduleForm.map((row, idx) => {
                                        
                                        const assignedTeacherIds = classAssignments
                                            .filter(a => String(a.subject_id).trim() === String(row.subject_id).trim())
                                            .map(a => a.teacher_id);

                                        const assignedTeachers = allTeachers.filter(t => assignedTeacherIds.includes(t.user_id));
                                        const otherTeachers = allTeachers.filter(t => !assignedTeacherIds.includes(t.user_id));

                                        return (
                                            <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                                <td className="p-2 text-center font-bold text-slate-400">{idx + 1}</td>
                                                <td className="p-2 relative">
                                                    <input
                                                        type="time"
                                                        value={row.start_time}
                                                        onChange={(e) => handleRowChange(idx, 'start_time', e.target.value)}
                                                        className="w-full p-2 border border-slate-300 rounded outline-none cursor-pointer hover:border-blue-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-500 transition-all font-mono shadow-sm"
                                                        title="Klik ikon jam untuk mengatur waktu mulai"
                                                    />
                                                </td>
                                                <td className="p-2 relative">
                                                    <input
                                                        type="time"
                                                        value={row.end_time}
                                                        onChange={(e) => handleRowChange(idx, 'end_time', e.target.value)}
                                                        className="w-full p-2 border border-slate-300 rounded outline-none cursor-pointer hover:border-blue-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-500 transition-all font-mono shadow-sm"
                                                        title="Klik ikon jam untuk mengatur waktu selesai"
                                                    />
                                                </td>

                                                <td className="p-2">
                                                    <select
                                                        value={row.type}
                                                        onChange={(e) => handleRowChange(idx, 'type', e.target.value as 'mapel' | 'non_mapel')}
                                                        className="w-full p-2 border border-slate-300 rounded outline-none cursor-pointer bg-slate-50 hover:border-blue-400 transition-all shadow-sm"
                                                    >
                                                        <option value="mapel">📚 Mata Pelajaran</option>
                                                        <option value="non_mapel">☕ Non-Mapel (Istirahat)</option>
                                                    </select>
                                                </td>

                                                <td className="p-2">
                                                    {row.type === 'mapel' ? (
                                                        <select
                                                            value={row.subject_id}
                                                            onChange={(e) => handleRowChange(idx, 'subject_id', e.target.value)}
                                                            className="w-full p-2 border border-slate-300 rounded outline-none bg-white cursor-pointer hover:border-blue-400 transition-all shadow-sm"
                                                        >
                                                            <option value="">-- Pilih Mapel --</option>
                                                            {allSubjects.map(s => (
                                                                <option key={s.subject_id} value={s.subject_id}>{s.subject_name}</option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <input
                                                            type="text"
                                                            placeholder="Cth: Istirahat / Upacara"
                                                            value={row.activity_name}
                                                            onChange={(e) => handleRowChange(idx, 'activity_name', e.target.value)}
                                                            className="w-full p-2 border border-slate-300 rounded outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm"
                                                        />
                                                    )}
                                                </td>

                                                <td className="p-2">
                                                    {row.type === 'mapel' ? (
                                                        <select
                                                            value={row.teacher_id}
                                                            onChange={(e) => handleRowChange(idx, 'teacher_id', e.target.value)}
                                                            disabled={!row.subject_id}
                                                            className="w-full p-2 border border-slate-300 rounded outline-none bg-white cursor-pointer disabled:opacity-50 disabled:bg-slate-100 hover:border-blue-400 transition-all shadow-sm"
                                                        >
                                                            <option value="">-- Pilih Guru --</option>

                                                            {assignedTeachers.length > 0 ? (
                                                                <optgroup label="Sesuai Penugasan (Teacher Mappings)">
                                                                    {assignedTeachers.map(t => {
                                                                        const overlap = getTeacherOverlapInfo(t.user_id, row.start_time, row.end_time);
                                                                        const overlapData = overlap as any;
                                                                        const cName = overlapData ? (Array.isArray(overlapData.classes) ? overlapData.classes[0]?.class_name : overlapData.classes?.class_name) : '';
                                                                        return (
                                                                            <option key={t.user_id} value={t.user_id} disabled={!!overlap}>
                                                                                {t.full_name} {overlap ? `(❌ Bentrok di ${cName})` : ''}
                                                                            </option>
                                                                        );
                                                                    })}
                                                                </optgroup>
                                                            ) : row.subject_id ? (
                                                                <optgroup label="Sesuai Penugasan">
                                                                    <option value="" disabled>⚠️ Belum ada penugasan (Pilih Guru Lainnya)</option>
                                                                </optgroup>
                                                            ) : null}

                                                            <optgroup label="Guru Lainnya (Komponen Cadangan)">
                                                                {otherTeachers.map(t => {
                                                                    const overlap = getTeacherOverlapInfo(t.user_id, row.start_time, row.end_time);
                                                                    const overlapData = overlap as any;
                                                                    const cName = overlapData ? (Array.isArray(overlapData.classes) ? overlapData.classes[0]?.class_name : overlapData.classes?.class_name) : '';
                                                                    return (
                                                                        <option key={t.user_id} value={t.user_id} disabled={!!overlap}>
                                                                            {t.full_name} {overlap ? `(❌ Bentrok di ${cName})` : ''}
                                                                        </option>
                                                                    );
                                                                })}
                                                            </optgroup>
                                                        </select>
                                                    ) : (
                                                        <div className="text-[10px] p-2 bg-slate-100 text-slate-400 rounded border border-slate-200 text-center shadow-sm">
                                                            Tanpa Guru
                                                        </div>
                                                    )}
                                                </td>

                                                <td className="p-2 text-center">
                                                    <button onClick={() => handleRemoveRow(idx)} className="text-rose-500 font-bold hover:bg-rose-100 px-2 py-1 rounded transition cursor-pointer">✕</button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-between items-center pt-4 mt-2 border-t border-slate-200">
                            <button onClick={handleAddRow} className="text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 transition cursor-pointer">
                                + Tambah Jam Berikutnya
                            </button>
                            <button
                                onClick={handleSaveBuilder}
                                disabled={saving}
                                className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-xl shadow-lg disabled:opacity-50 transition cursor-pointer"
                            >
                                {saving ? 'Menyimpan...' : '💾 Simpan Jadwal'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ========================================================================
    // TAMPILAN UTAMA (VIEW MODE / REKAP MINGGUAN)
    // ========================================================================
    return (
        <div className="admin-theme-root min-h-screen font-sans flex flex-col justify-between select-none pb-28" data-theme={theme} style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}>
            <div className="max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-4">

                <div className="flex justify-start">
                    <button
                        onClick={() => router.push('/admin/settings/schoolsetting')}
                        className="text-xs font-bold px-3 py-1.5 rounded-xl shadow border transition flex items-center gap-1 cursor-pointer"
                        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)', color: 'var(--text-main)' }}
                    >
                        <span>← Kembali ke Pengaturan Sekolah</span>
                    </button>
                </div>

                <div className="rounded-2xl p-4 sm:p-5 shadow-md border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-theme)' }}>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="font-extrabold text-sm sm:text-base uppercase tracking-wide">Smart Roster Akademik</h1>
                            {activeAcademicYearName && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                    TA: {activeAcademicYearName}
                                </span>
                            )}
                        </div>
                        <p className="text-xs mt-0.5 opacity-80">Pantau dan kelola jadwal per kelas secara terpusat.</p>
                    </div>

                    <div className="w-full sm:w-72">
                        <label className="text-[10px] font-bold uppercase tracking-wider block mb-1 text-slate-500">Pilih Kelas untuk Dikelola:</label>
                        <select
                            value={selectedClassId}
                            onChange={(e) => setSelectedClassId(e.target.value)}
                            className="w-full p-2 rounded-xl border text-xs outline-none bg-slate-50 text-slate-800 cursor-pointer"
                        >
                            <option value="">-- Pilih Kelas --</option>
                            {classList.map(c => (
                                <option key={c.class_id} value={c.class_id}>{c.class_name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {!selectedClassId ? (
                    <div className="p-8 text-center border border-dashed rounded-2xl opacity-50">
                        <p className="text-xs font-bold">Silakan pilih kelas terlebih dahulu untuk melihat jadwal.</p>
                    </div>
                ) : loadingSchedule ? (
                    <div className="p-8 text-center rounded-2xl"><p className="text-xs font-bold animate-pulse">Memuat Jadwal Kelas & Validasi HES...</p></div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {DAYS_ORDER.map(day => {
                            const isDayActive = activeDays.includes(day.toLowerCase());
                            const daySched = weeklySchedule[day.toLowerCase()] || [];
                            
                            // Logika Expand Card
                            const isExpanded = expandedDays[day.toLowerCase()];
                            const displaySched = isExpanded ? daySched : daySched.slice(0, 3);
                            const hiddenCount = daySched.length - 3;

                            return (
                                <div key={day} className={`rounded-2xl shadow-md border overflow-hidden transition-all duration-300 ${!isDayActive ? 'opacity-60 bg-slate-100 grayscale' : 'bg-white hover:border-blue-300'}`}>
                                    <div className="p-3 border-b flex justify-between items-center bg-slate-50">
                                        <div>
                                            <h3 className="font-extrabold text-xs uppercase text-slate-800">{day}</h3>
                                            <p className="text-[9px] font-bold mt-0.5">
                                                {isDayActive ? <span className="text-emerald-600">HES Aktif</span> : <span className="text-rose-500">Hari Libur</span>}
                                            </p>
                                        </div>
                                        {isDayActive && (
                                            <button
                                                onClick={() => openBuilder(day.toLowerCase())}
                                                className="text-[10px] font-bold bg-blue-600 text-white px-3 py-1.5 rounded-lg shadow-sm hover:bg-blue-700 cursor-pointer"
                                            >
                                                {daySched.length > 0 ? 'Edit Jadwal' : '+ Buat Jadwal'}
                                            </button>
                                        )}
                                    </div>

                                    <div className="p-3 min-h-[150px] space-y-2">
                                        {!isDayActive ? (
                                            <p className="text-[10px] text-center mt-8 font-bold text-slate-400">Terkunci karena pengaturan HES.</p>
                                        ) : daySched.length === 0 ? (
                                            <p className="text-[10px] text-center mt-8 italic text-slate-400">Belum ada jadwal tersusun.</p>
                                        ) : (
                                            <>
                                                {displaySched.map((item, idx) => (
                                                    <div key={idx} className="flex gap-2 items-start border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                                                        <div className="w-16 shrink-0 bg-slate-100 text-slate-600 rounded text-center py-1 border border-slate-200">
                                                            <p className="text-[10px] font-mono font-bold leading-none">{item.start_time.substring(0, 5)}</p>
                                                            <p className="text-[8px] font-mono mt-0.5">{item.end_time.substring(0, 5)}</p>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-[11px] font-bold text-slate-800 truncate">
                                                                {item.subject_id ? item.subjects?.subject_name : item.activity_name}
                                                            </p>
                                                            {item.teacher_id && (
                                                                <p className="text-[9px] text-blue-600 font-bold truncate">👤 {item.users?.full_name}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                                
                                                {/* Tombol Lihat Full muncul jika data lebih dari 3 baris */}
                                                {hiddenCount > 0 && (
                                                    <button
                                                        onClick={() => toggleExpandDay(day.toLowerCase())}
                                                        className="w-full mt-2 py-1.5 text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-100 transition cursor-pointer"
                                                    >
                                                        {isExpanded ? 'Tutup Sebagian ∧' : `Lihat Full (${hiddenCount} Aktivitas Lainnya) ∨`}
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}