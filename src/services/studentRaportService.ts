import { supabase } from '@/lib/supabase';

// Mengambil profil singkat untuk header raport beserta tenant_id-nya
export async function getStudentReportProfile(studentId: string) {
    try {
        const { data, error } = await supabase
            .from('students')
            .select(`
                student_id,
                tenant_id,
                full_name,
                nis,
                gender,
                classes:class_id (
                    class_name
                )
            `)
            .eq('student_id', studentId)
            .single();

        if (error) throw error;
        return data;
    } catch (err) {
        console.error('Gagal mengambil data profil raport:', err);
        return null;
    }
}

// Mengambil riwayat absensi berdasarkan student_id dengan opsi filter rentang tanggal
export async function getStudentAttendance(studentId: string, startDate?: string, endDate?: string) {
    try {
        let query = supabase
            .from('attendance')
            .select('*')
            .eq('student_id', studentId);

        if (startDate && endDate) {
            query = query.gte('date', startDate).lte('date', endDate);
        }

        const { data, error } = await query.order('date', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Gagal mengambil riwayat absensi:', err);
        return [];
    }
}

// Mengambil data hari libur sekolah berdasarkan tenant_id dan rentang bulan
export async function getSchoolHolidays(tenantId: string, startDate: string, endDate: string) {
    try {
        const { data, error } = await supabase
            .from('school_holidays')
            .select('*')
            .eq('tenant_id', tenantId)
            .or(`start_date.lte.${endDate},end_date.gte.${startDate}`);

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Gagal mengambil data hari libur:', err);
        return [];
    }
}