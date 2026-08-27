import { supabase } from '@/lib/supabase';
import { Student, AttendanceRecordPayload } from '@/types/database';

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

export async function fetchStudentsByTenant(tenantId: string, classId: string): Promise<Student[]> {
  const { data, error } = await supabase
    .from('students')
    .select('student_id, nis, full_name')
    .eq('tenant_id', tenantId)
    .eq('class_id', classId);

  if (error) throw error;

  return (data || []).map((s) => ({
    ...s,
    status: 'H', // Default status Hadir
  }));
}

export async function saveAttendanceRecords(
  tenantId: string,
  students: Student[],
  userId: string
): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD

  const records: AttendanceRecordPayload[] = students.map((student) => ({
    tenant_id: tenantId,
    student_id: student.student_id,
    date: today,
    status: student.status || 'H',
    recorded_by: userId,
  }));

  const { error } = await supabase
    .from('attendance')
    .upsert(records, { 
      onConflict: 'student_id,date' 
    });

  if (error) {
    console.error('Gagal menyimpan absensi:', error.message);
    throw error;
  }

  return true;
}