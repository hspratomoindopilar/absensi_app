import { supabase } from '@/lib/supabase';

export async function authenticateStudent(nis: string, passwordInput: string) {
  // Ambil data siswa sekaligus join ke tabel classes untuk mendapatkan nama kelas (class_name)
  const { data: studentData, error: studentError } = await supabase
    .from('students')
    .select(`
      *,
      classes (
        class_name,
        academic_year
      )
    `)
    .eq('nis', nis.trim())
    .single();

  if (studentError || !studentData) {
    throw new Error('NIS tidak ditemukan. Periksa kembali NIS Anda.');
  }

  if (studentData.password !== passwordInput.trim()) {
    throw new Error('Password salah. Silakan tanyakan password sementara ke guru kelas.');
  }

  return studentData;
}

export async function updateStudentPassword(studentId: string, newPassword: string) {
  const { error } = await supabase
    .from('students')
    .update({
      password: newPassword,
      is_first_login: false,
    })
    .eq('student_id', studentId);

  if (error) {
    throw new Error('Gagal memperbarui password: ' + error.message);
  }
}