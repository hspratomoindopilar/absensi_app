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
    .select('student_id, nis, full_name, gender')
    .eq('tenant_id', tenantId)
    .eq('class_id', classId)
    .order('full_name', { ascending: true });

  if (error) throw error;

  return (data || []).map((s) => ({
    ...s,
    status: 'H', // Default status Hadir
  }));
}

export async function saveAttendanceRecords(tenantId: string, students: Student[], userId: string, targetDate: string) {
  const records = students.map((student) => ({
    tenant_id: tenantId,
    student_id: student.student_id,
    date: targetDate, // Tanggal unik per hari
    status: student.status || 'H',
    recorded_by: userId,
  }));

  const { error } = await supabase
    .from('attendance')
    .upsert(records, { onConflict: 'tenant_id,student_id,date' }); // <-- Kunci komposit agar tanggal lain tidak tertimpa

  if (error) {
    throw new Error(error.message);
  }
}

export async function fetchTodayAttendance(tenantId: string, classId: string): Promise<Record<string, string> | null> {
  const today = new Date().toISOString().split('T')[0];

  // Ambil data siswa di kelas ini terlebih dahulu untuk mendapatkan student_id
  const { data: students, error: studentError } = await supabase
    .from('students')
    .select('student_id')
    .eq('tenant_id', tenantId)
    .eq('class_id', classId);

  if (studentError || !students || students.length === 0) return null;

  const studentIds = students.map((s) => s.student_id);

  // Ambil data attendance berdasarkan student_id dan tanggal hari ini
  const { data: attendanceData, error: attError } = await supabase
    .from('attendance')
    .select('student_id, status')
    .eq('date', today)
    .in('student_id', studentIds);

  if (attError || !attendanceData || attendanceData.length === 0) return null;

  // Ubah ke bentuk Map/Record: { [student_id]: status }
  const statusMap: Record<string, string> = {};
  attendanceData.forEach((item) => {
    statusMap[item.student_id] = item.status;
  });

  return statusMap;
}

// Ubah nama/fungsi agar dinamis menerima tanggal
export async function fetchAttendanceByDate(tenantId: string, classId: string, targetDate: string): Promise<Record<string, string> | null> {
  const { data: students, error: studentError } = await supabase
    .from('students')
    .select('student_id')
    .eq('tenant_id', tenantId)
    .eq('class_id', classId);

  if (studentError || !students || students.length === 0) return null;

  const studentIds = students.map((s) => s.student_id);

  const { data: attendanceData, error: attError } = await supabase
    .from('attendance')
    .select('student_id, status')
    .eq('date', targetDate) // Cek berdasarkan tanggal target
    .in('student_id', studentIds);

  if (attError || !attendanceData || attendanceData.length === 0) return null;

  const statusMap: Record<string, string> = {};
  attendanceData.forEach((item) => {
    statusMap[item.student_id] = item.status;
  });

  return statusMap;
}

