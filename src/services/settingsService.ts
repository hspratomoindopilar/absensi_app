import { supabase } from '@/lib/supabase';

export async function fetchSchoolAndClassInfo(userEmail: string) {
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('user_id, tenant_id, full_name')
    .eq('email', userEmail)
    .single();

  if (userError || !userData) return null;

  const { data: tenantData } = await supabase
    .from('tenants')
    .select('school_name')
    .eq('tenant_id', userData.tenant_id)
    .maybeSingle();

  // Ambil daftar kelas yang berelasi dengan tenant_id ini
  const { data: classDataList } = await supabase
    .from('classes')
    .select('class_id, class_name, academic_year')
    .eq('tenant_id', userData.tenant_id);

  // Ambil kelas pertama sebagai default jika ada banyak, atau null jika kosong
  const classData = classDataList && classDataList.length > 0 ? classDataList[0] : null;

  return {
    userId: userData.user_id,
    tenantId: userData.tenant_id,
    classId: classData?.class_id,
    schoolName: tenantData?.school_name || 'Sekolah',
    className: classData?.class_name || 'Kelas',
    teacherName: userData.full_name || 'Guru',
  };
}

export async function fetchTenantSettings(tenantId: string) {
  const { data, error } = await supabase
    .from('tenants')
    .select('school_name, school_days')
    .eq('tenant_id', tenantId)
    .single();

  if (error) return { school_name: 'Sekolah', school_days: 5 };
  return data;
}

export async function updateTenantSchoolDays(tenantId: string, schoolDays: number) {
  const { error } = await supabase
    .from('tenants')
    .update({ school_days: schoolDays })
    .eq('tenant_id', tenantId);

  if (error) throw new Error(error.message);
}

export async function fetchSchoolHolidays(tenantId: string) {
  const { data, error } = await supabase
    .from('school_holidays')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('start_date', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function addSchoolHoliday(tenantId: string, startDate: string, endDate: string, description: string) {
  const { error } = await supabase
    .from('school_holidays')
    .insert([{ tenant_id: tenantId, start_date: startDate, end_date: endDate, description }]);

  if (error) throw new Error(error.message);
}

export async function deleteSchoolHoliday(holidayId: string) {
  const { error } = await supabase
    .from('school_holidays')
    .delete()
    .eq('holiday_id', holidayId);

  if (error) throw new Error(error.message);
}

// ==================== HARI EFEKTIF FLEKSIBEL CUSTOM ====================

export async function fetchEffectiveDays(tenantId: string, classId?: string | null) {
  let query = supabase
    .from('tenant_effective_days')
    .select('*')
    .eq('tenant_id', tenantId);

  if (classId !== undefined && classId !== null && classId !== 'ALL') {
    query = query.eq('class_id', classId);
  } else {
    query = query.is('class_id', null);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Resolusi cerdas HES (Fallback Logic):
 * Mengecek apakah kelas memiliki HES spesifik. 
 * Jika ada dan aktif, gunakan itu. Jika tidak ada/kosong, otomatis fallback ke HES Global (class_id IS NULL).
 */
export async function resolveClassEffectiveDays(tenantId: string, classId: string) {
  // 1. Cek data spesifik kelas
  const specificDays = await fetchEffectiveDays(tenantId, classId);
  
  if (specificDays && specificDays.length > 0) {
    return {
      hasSpecificHES: true,
      days: specificDays
    };
  }

  // 2. Jika tidak ada, fallback ke Global (ALL)
  const globalDays = await fetchEffectiveDays(tenantId, null);
  return {
    hasSpecificHES: false,
    days: globalDays
  };
}

/**
 * Menyimpan konfigurasi hari efektif (bisa untuk Global/ALL jika classId = null, 
 * atau Spesifik Kelas jika classId diisi UUID kelas).
 */
export async function saveEffectiveDays(
  tenantId: string,
  classId: string | null,
  daysConfig: { day_of_week: string; is_active: boolean }[]
) {
  const records = daysConfig.map((item) => ({
    tenant_id: tenantId,
    class_id: classId === 'ALL' ? null : classId,
    day_of_week: item.day_of_week,
    is_active: item.is_active,
  }));

  const { error } = await supabase
    .from('tenant_effective_days')
    .upsert(records, { onConflict: 'tenant_id,class_id,day_of_week' });

  if (error) throw new Error(error.message);
}

/**
 * Menghapus pengaturan spesifik kelas agar kembali tunduk total ke HES Global (ALL).
 * (Mengubah status dari haveSpecificHES = true kembali ke false dengan menghapus override-nya).
 */
export async function clearClassEffectiveDays(tenantId: string, classId: string) {
  const { error } = await supabase
    .from('tenant_effective_days')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('class_id', classId);

  if (error) throw new Error(error.message);
}

// ==================== JADWAL KELAS & MAPEL ====================

export async function fetchClassSchedules(tenantId: string, classId?: string) {
  let query = supabase
    .from('class_schedules')
    .select(`
      schedule_id,
      tenant_id,
      class_id,
      day_of_week,
      start_time,
      end_time,
      subjects (
        subject_id,
        subject_name,
        subject_code
      ),
      classes (
        class_id,
        class_name
      )
    `)
    .eq('tenant_id', tenantId);

  if (classId && classId !== 'ALL') {
    query = query.eq('class_id', classId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function addClassSchedule(
  tenantId: string,
  classIds: string[], // Mendukung multi-select kelas atau ['ALL']
  subjectId: string,
  dayOfWeek: string,
  startTime: string,
  endTime: string
) {
  const records = [];

  for (const cid of classIds) {
    records.push({
      tenant_id: tenantId,
      class_id: cid === 'ALL' ? null : cid,
      subject_id: subjectId,
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
    });
  }

  const { error } = await supabase
    .from('class_schedules')
    .insert(records);

  if (error) throw new Error(error.message);
}

export async function deleteClassSchedule(scheduleId: string) {
  const { error } = await supabase
    .from('class_schedules')
    .delete()
    .eq('schedule_id', scheduleId);

  if (error) throw new Error(error.message);
}

