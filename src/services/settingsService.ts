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
    .single();

  const { data: classData } = await supabase
    .from('classes')
    .select('class_id, class_name, academic_year')
    .eq('tenant_id', userData.tenant_id)
    .single();

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

// ==================== MANAJEMEN SISWA & IMPORT ====================

// Fungsi helper untuk auto-generate password sementara siswa (6 karakter)
function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Hilangkan karakter ambigu seperti O, 0, I, 1
  let pass = '';
  for (let i = 0; i < 6; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

export async function fetchStudentsManagement(tenantId: string, classId: string) {
  const { data, error } = await supabase
    .from('students')
    .select('student_id, nis, full_name, gender, password')
    .eq('tenant_id', tenantId)
    .eq('class_id', classId)
    .order('full_name', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function addSingleStudent(tenantId: string, classId: string, nis: string, fullName: string, gender: 'L' | 'P') {
  const tempPassword = generateTempPassword();

  const { error } = await supabase
    .from('students')
    .insert([{ 
      tenant_id: tenantId, 
      class_id: classId, 
      nis, 
      full_name: fullName, 
      gender,
      password: tempPassword, // Password auto-generate
      is_first_login: true
    }]);

  if (error) throw new Error(error.message);
}

export async function deleteStudent(studentId: string) {
  const { error } = await supabase
    .from('students')
    .delete()
    .eq('student_id', studentId);

  if (error) throw new Error(error.message);
}

export async function bulkUpsertStudents(
  tenantId: string, 
  classId: string, 
  students: { nis: string; full_name: string; gender?: 'L' | 'P' }[]
) {
  const records = students.map((s) => ({
    tenant_id: tenantId,
    class_id: classId,
    nis: s.nis || '',
    full_name: s.full_name,
    gender: s.gender || 'L',
    password: generateTempPassword(), // Auto-generate untuk setiap siswa baru
    is_first_login: true,
  }));

  const { error } = await supabase
    .from('students')
    .upsert(records, { onConflict: 'tenant_id,nis', ignoreDuplicates: false }); 
    // Catatan: Jika pakai upsert, pastikan password lama tidak tertimpa jika NIS sudah ada, atau sesuaikan kebutuhan.

  if (error) throw new Error(error.message);
}

export async function updateStudent(studentId: string, nis: string, fullName: string, gender: 'L' | 'P') {
  const { error } = await supabase
    .from('students')
    .update({ nis, full_name: fullName, gender })
    .eq('student_id', studentId);

  if (error) throw new Error(error.message);
}

