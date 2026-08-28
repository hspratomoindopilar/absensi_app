import { supabase } from '@/lib/supabase';

export async function fetchSchoolAndClassInfo(userEmail: string) {
  // 1. Ambil tenant_id, user_id, & full_name dari tabel users berdasarkan email login
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('user_id, tenant_id, full_name')
    .eq('email', userEmail)
    .single();

  if (userError || !userData) return null;

  // 2. Ambil nama sekolah dari tabel tenants
  const { data: tenantData } = await supabase
    .from('tenants')
    .select('school_name')
    .eq('tenant_id', userData.tenant_id)
    .single();

  // 3. Ambil nama kelas dari tabel classes
  const { data: classData } = await supabase
    .from('classes')
    .select('class_id, class_name, academic_year')
    .eq('tenant_id', userData.tenant_id)
    .single();

  return {
    userId: userData.user_id, // Penting untuk recorded_by
    tenantId: userData.tenant_id,
    classId: classData?.class_id,
    schoolName: tenantData?.school_name || 'Sekolah',
    className: classData?.class_name || 'Kelas',
    teacherName: userData.full_name || 'Guru',
  };
}

// fungsi untuk mengambil pengaturan tenant (school_days)
export async function fetchTenantSettings(tenantId: string) {
  const { data, error } = await supabase
    .from('tenants')
    .select('school_name, school_days')
    .eq('tenant_id', tenantId)
    .single();

  if (error) return { school_name: 'Sekolah', school_days: 5 }; // Fallback default 5 hari
  return data;
}

// fungsi untuk update pengaturan tenant
export async function updateTenantSchoolDays(tenantId: string, schoolDays: number) {
  const { error } = await supabase
    .from('tenants')
    .update({ school_days: schoolDays })
    .eq('tenant_id', tenantId);

  if (error) throw new Error(error.message);
}

// fungsi untuk mengambil daftar hari libur tenant
export async function fetchSchoolHolidays(tenantId: string) {
  const { data, error } = await supabase
    .from('school_holidays')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('start_date', { ascending: true });

  if (error) throw error;
  return data || [];
}

// fungsi untuk menambah hari libur (bisa bulk/rentang)
export async function addSchoolHoliday(tenantId: string, startDate: string, endDate: string, description: string) {
  const { error } = await supabase
    .from('school_holidays')
    .insert([{ tenant_id: tenantId, start_date: startDate, end_date: endDate, description }]);

  if (error) throw new Error(error.message);
}

// fungsi untuk menghapus hari libur
export async function deleteSchoolHoliday(holidayId: string) {
  const { error } = await supabase
    .from('school_holidays')
    .delete()
    .eq('holiday_id', holidayId);

  if (error) throw new Error(error.message);
}

// ==================== MANAJEMEN SISWA & IMPORT ====================

// 1. Ambil daftar siswa untuk pengaturan/manajemen
export async function fetchStudentsManagement(tenantId: string, classId: string) {
  const { data, error } = await supabase
    .from('students')
    .select('student_id, nis, full_name')
    .eq('tenant_id', tenantId)
    .eq('class_id', classId)
    .order('full_name', { ascending: true });

  if (error) throw error;
  return data || [];
}

// 2. Tambah satu siswa secara manual
export async function addSingleStudent(tenantId: string, classId: string, nis: string, fullName: string) {
  const { error } = await supabase
    .from('students')
    .insert([{ tenant_id: tenantId, class_id: classId, nis, full_name: fullName }]);

  if (error) throw new Error(error.message);
}

// 3. Hapus siswa
export async function deleteStudent(studentId: string) {
  const { error } = await supabase
    .from('students')
    .delete()
    .eq('student_id', studentId);

  if (error) throw new Error(error.message);
}

// 4. Import / Upsert banyak siswa sekaligus (Cocok untuk data dari Excel/CSV)
export async function bulkUpsertStudents(
  tenantId: string, 
  classId: string, 
  students: { nis: string; full_name: string }[]
) {
  const records = students.map((s) => ({
    tenant_id: tenantId,
    class_id: classId,
    nis: s.nis || '',
    full_name: s.full_name,
  }));

  // Menggunakan upsert berdasarkan tenant_id & nis (atau student_id jika ada)
  const { error } = await supabase
    .from('students')
    .upsert(records, { onConflict: 'tenant_id,nis' });

  if (error) throw new Error(error.message);
}

// 5. Update data siswa (Edit Nama / NIS)
export async function updateStudent(studentId: string, nis: string, fullName: string) {
  const { error } = await supabase
    .from('students')
    .update({ nis, full_name: fullName })
    .eq('student_id', studentId);

  if (error) throw new Error(error.message);
}