import { supabase } from '@/lib/supabase';

export const teacherService = {
  // Ambil daftar guru & admin untuk halaman utama
  async getTeachers(tenantId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('tenant_id', tenantId)
      .in('role', ['teacher', 'general admin', 'co-general-admin'])
      .order('full_name', { ascending: true });

    if (error) throw error;
    return data;
  },

  // Ambil detail guru beserta relasi kelas dan mapel mengajarnya
  async getTeacherDetail(teacherId: string) {
    // 1. Ambil data profil guru
    const { data: teacher, error: teacherError } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', teacherId)
      .single();

    if (teacherError) throw teacherError;

    // 2. Ambil kelas yang diampunya sebagai wali kelas
    const { data: homeroomClasses, error: hrError } = await supabase
      .from('classes')
      .select('*')
      .eq('homeroom_teacher_id', teacherId);

    if (hrError) throw hrError;

    // 3. Ambil daftar mapel & kelas mengajarnya dari teacher_classes
    const { data: teachingAssignments, error: teachError } = await supabase
      .from('teacher_classes')
      .select(`
        id,
        class_id,
        subject_id,
        subject_name,
        classes (class_name, grade_level),
        subjects (subject_name, subject_code)
      `)
      .eq('teacher_id', teacherId);

    if (teachError) throw teachError;

    return {
      teacher,
      homeroomClasses,
      teachingAssignments,
    };
  },

  // Tambah penugasan mengajar (teacher_classes)
  async assignTeacherClass({ tenantId, teacherId, classId, subjectId, subjectName }: { tenantId: string; teacherId: string; classId: string; subjectId: string; subjectName: string }) {
    const { data, error } = await supabase
      .from('teacher_classes')
      .insert([
        {
          tenant_id: tenantId,
          teacher_id: teacherId,
          class_id: classId,
          subject_id: subjectId,
          subject_name: subjectName,
        },
      ])
      .select();

    if (error) throw error;
    return data;
  },

  // Hapus penugasan mengajar
  async removeTeacherClass(assignmentId: string) {
    const { error } = await supabase
      .from('teacher_classes')
      .delete()
      .eq('id', assignmentId);

    if (error) throw error;
    return true;
  },

  // Update / Set Wali Kelas
  async updateHomeroomTeacher(classId: string, teacherId: string) {
    const { error } = await supabase
      .from('classes')
      .update({ homeroom_teacher_id: teacherId })
      .eq('class_id', classId);

    if (error) throw error;
    return true;
  }
};