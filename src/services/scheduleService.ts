import { supabase } from '@/lib/supabase';

export interface ScheduleItemInput {
    id?: string;
    subject_id: string | null;
    subject_name?: string;
    teacher_id: string | null;
    activity_name: string | null;
    start_time: string;
    end_time: string;
}

export const scheduleService = {
    // Helper: Ambil academic_year_id yang sedang aktif (is_active = true) untuk tenant
    async getActiveAcademicYearId(tenantId: string): Promise<string | null> {
        const { data, error } = await supabase
            .from('academic_years')
            .select('academic_year_id')
            .eq('tenant_id', tenantId)
            .eq('is_active', true)
            .single();

        if (error || !data) return null;
        return data.academic_year_id;
    },

    // 1. GATE HES: Ambil daftar hari efektif untuk kelas tertentu
    async fetchActiveDaysForClass(tenantId: string, classId: string) {
        let { data, error } = await supabase
            .from('tenant_effective_days')
            .select('day_of_week, is_active')
            .eq('tenant_id', tenantId)
            .eq('class_id', classId)
            .eq('is_active', true);

        if (!data || data.length === 0) {
            const { data: globalData, error: globalError } = await supabase
                .from('tenant_effective_days')
                .select('day_of_week, is_active')
                .eq('tenant_id', tenantId)
                .is('class_id', null)
                .eq('is_active', true);

            if (globalError) throw globalError;
            data = globalData;
        } else if (error) {
            throw error;
        }

        return data?.map(d => d.day_of_week) || [];
    },

    // 2. SMART ROSTER: Ambil relasi Mapel & Guru khusus untuk kelas ini
    async fetchClassAssignments(tenantId: string, classId: string) {
        const { data, error } = await supabase
            .from('teacher_classes')
            .select(`
                subject_id,
                subject_name,
                teacher_id,
                class_id,
                users ( full_name )
            `)
            .eq('tenant_id', tenantId)
            .eq('class_id', classId);

        if (error) throw error;
        
        return data.map((item: any) => {
            const userData = Array.isArray(item.users) ? item.users[0] : item.users;
            return {
                subject_id: item.subject_id,
                subject_name: item.subject_name,
                teacher_id: item.teacher_id,
                class_id: item.class_id,
                teacher_name: userData?.full_name || 'Guru Tidak Ditemukan'
            };
        });
    },

    // 3. LOAD SCHEDULE: Ambil jadwal berdasarkan Kelas, Hari, dan Tahun Ajaran Aktif
    async fetchScheduleByDay(tenantId: string, classId: string, dayOfWeek: string) {
        const activeAyId = await this.getActiveAcademicYearId(tenantId);

        let query = supabase
            .from('class_schedules')
            .select(`
                schedule_id,
                subject_id,
                teacher_id,
                activity_name,
                start_time,
                end_time,
                academic_year_id,
                users ( full_name ),
                subjects ( subject_name )
            `)
            .eq('tenant_id', tenantId)
            .eq('class_id', classId)
            .eq('day_of_week', dayOfWeek);

        if (activeAyId) {
            query = query.eq('academic_year_id', activeAyId);
        }

        const { data, error } = await query.order('start_time', { ascending: true });

        if (error) throw error;
        return data;
    },

    // 4. ANTI-BENTROK: Validasi apakah guru sudah mengajar di kelas lain pada jam yang sama di tahun ajaran aktif
    async checkTeacherOverlap(tenantId: string, teacherId: string, dayOfWeek: string, startTime: string, endTime: string, currentClassId: string) {
        if (!teacherId) return null;
        const activeAyId = await this.getActiveAcademicYearId(tenantId);

        let query = supabase
            .from('class_schedules')
            .select('class_id, classes(class_name), start_time, end_time')
            .eq('tenant_id', tenantId)
            .eq('teacher_id', teacherId)
            .eq('day_of_week', dayOfWeek)
            .neq('class_id', currentClassId)
            .lt('start_time', endTime)
            .gt('end_time', startTime);

        if (activeAyId) {
            query = query.eq('academic_year_id', activeAyId);
        }

        const { data, error } = await query;

        if (error) throw error;

        if (data && data.length > 0) {
            return data[0]; 
        }
        return null;
    },

    // 5. BATCH SUBMISSION: Simpan seluruh rangkaian blok jadwal dengan menyertakan academic_year_id aktif
    async saveBatchScheduleDay(tenantId: string, classId: string, dayOfWeek: string, scheduleItems: ScheduleItemInput[]) {
        const activeAyId = await this.getActiveAcademicYearId(tenantId);
        if (!activeAyId) {
            throw new Error('Tidak dapat menyimpan jadwal karena belum ada Tahun Ajaran aktif.');
        }

        // Hapus jadwal lama berdasarkan tenant, class, day, dan academic_year_id
        const { error: deleteError } = await supabase
            .from('class_schedules')
            .delete()
            .eq('tenant_id', tenantId)
            .eq('class_id', classId)
            .eq('day_of_week', dayOfWeek)
            .eq('academic_year_id', activeAyId);

        if (deleteError) throw new Error('Gagal membersihkan jadwal lama: ' + deleteError.message);

        if (scheduleItems.length === 0) return true;

        const payload = scheduleItems.map(item => ({
            tenant_id: tenantId,
            class_id: classId,
            day_of_week: dayOfWeek,
            subject_id: item.subject_id || null,
            teacher_id: item.teacher_id || null,
            activity_name: item.activity_name || null,
            start_time: item.start_time,
            end_time: item.end_time,
            academic_year_id: activeAyId // Menyertakan relasi master academic_year_id
        }));

        const { error: insertError } = await supabase
            .from('class_schedules')
            .insert(payload);

        if (insertError) throw new Error('Gagal menyimpan jadwal baru: ' + insertError.message);

        return true;
    },

    // 6. MASTER DATA: Ambil data referensi (Kelas, Mapel, Guru) sekaligus
    async fetchScheduleMasterData(tenantId: string) {
        const [classesRes, subjectsRes, teachersRes] = await Promise.all([
            supabase.from('classes').select('class_id, class_name').eq('tenant_id', tenantId).order('class_name'),
            supabase.from('subjects').select('subject_id, subject_name').eq('tenant_id', tenantId).order('subject_name'),
            supabase.from('users').select('user_id, full_name').eq('tenant_id', tenantId)
        ]);

        if (classesRes.error) throw classesRes.error;
        if (subjectsRes.error) throw subjectsRes.error;
        if (teachersRes.error) throw teachersRes.error;

        return {
            classes: classesRes.data || [],
            subjects: subjectsRes.data || [],
            teachers: teachersRes.data || []
        };
    },

    // 7. RADAR DATA: Ambil seluruh jadwal tenant di hari tertentu lintas kelas berdasarkan tahun ajaran aktif
    async fetchDailySchedulesAllClasses(tenantId: string, dayOfWeek: string) {
        const activeAyId = await this.getActiveAcademicYearId(tenantId);

        let query = supabase
            .from('class_schedules')
            .select('class_id, teacher_id, start_time, end_time, classes(class_name)')
            .eq('tenant_id', tenantId)
            .eq('day_of_week', dayOfWeek);

        if (activeAyId) {
            query = query.eq('academic_year_id', activeAyId);
        }

        const { data, error } = await query;

        if (error) throw error;
        return data || [];
    }
};