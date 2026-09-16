import { supabase } from '@/lib/supabase';

export async function getStudentCompleteProfile(studentId: string) {
  const { data: studentData, error: studentError } = await supabase
    .from('students')
    .select('*')
    .eq('student_id', studentId)
    .single();

  if (studentError || !studentData) {
    throw new Error('Gagal memuat data profil: ' + (studentError?.message || 'Data tidak ditemukan'));
  }

  let classData = null;
  if (studentData.class_id) {
    const { data: cData } = await supabase
      .from('classes')
      .select('class_name, academic_year')
      .eq('class_id', studentData.class_id)
      .single();
    if (cData) classData = cData;
  }

  let statsData = { total_exp: 0, total_coins: 0, games_played_count: 0 };
  const { data: sData, error: sError } = await supabase
    .from('fl_student_stats')
    .select('*')
    .eq('student_id', studentId);
  
  if (!sError && sData && sData.length > 0) {
    statsData = sData[0];
  }

  const totalExp = statsData.total_exp || 0;
  const genderKey = studentData.gender ? studentData.gender.toUpperCase() : 'L';
  const defaultAvatar = genderKey === 'P' 
    ? '/icon/females-student.png' 
    : '/icon/male-student.png';

  // ATURAN KUNCI: Jika EXP < 500 atau belum ada foto custom, gunakan default
  const finalAvatar = (totalExp < 500 || !studentData.avatar_url) 
    ? defaultAvatar 
    : studentData.avatar_url;

  return {
    ...studentData,
    classes: classData,
    stats: statsData,
    avatar_url: finalAvatar // Terkunci otomatis jika EXP < 500
  };
}

export async function updateStudentProfile(studentId: string, updateData: any) {
  const { data, error } = await supabase
    .from('students')
    .update(updateData)
    .eq('student_id', studentId)
    .select()
    .single();

  if (error) {
    throw new Error('Gagal memperbarui profil: ' + error.message);
  }

  return data;
}