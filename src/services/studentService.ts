import { supabase } from '@/lib/supabase';

// ==================== MANAJEMEN SISWA GLOBAL ====================

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let pass = '';
  for (let i = 0; i < 6; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

// Fetch seluruh siswa secara global berdasarkan tenant_id beserta data kelasnya
export async function fetchGlobalStudentsManagement(tenantId: string) {
  const { data, error } = await supabase
    .from('students')
    .select(`
      *,
      classes (
        class_id,
        class_name,
        grade_level
      )
    `)
    .eq('tenant_id', tenantId)
    .order('full_name', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function addSingleStudentToClass(
  tenantId: string, 
  classId: string, 
  nis: string, 
  fullName: string, 
  gender: 'L' | 'P',
  photoUrl?: string
) {
  const tempPassword = generateTempPassword();

  const { error } = await supabase
    .from('students')
    .insert([{ 
      tenant_id: tenantId, 
      class_id: classId || null, 
      nis, 
      full_name: fullName, 
      gender,
      photo_url: photoUrl || null,
      password: tempPassword,
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

export async function bulkUpsertStudentsGlobal(
  tenantId: string, 
  classId: string, 
  students: { nis: string; full_name: string; gender?: 'L' | 'P'; photo_url?: string }[]
) {
  const records = students.map((s) => ({
    tenant_id: tenantId,
    class_id: classId || null,
    nis: s.nis || '',
    full_name: s.full_name,
    gender: s.gender || 'L',
    photo_url: s.photo_url || null,
    password: generateTempPassword(),
    is_first_login: true,
  }));

  const { error } = await supabase
    .from('students')
    .upsert(records, { onConflict: 'tenant_id,nis', ignoreDuplicates: false }); 

  if (error) throw new Error(error.message);
}

// Fungsi untuk update kelas siswa secara massal (Dispatch / Move Class)
export async function bulkUpdateStudentClass(studentIds: string[], targetClassId: string) {
  const { error } = await supabase
    .from('students')
    .update({ class_id: targetClassId })
    .in('student_id', studentIds);

  if (error) throw new Error(error.message);
}

export async function uploadStudentPhoto(file: File): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
  const filePath = `student-photos/${fileName}`;

  // Mengunggah ke bucket 'kelasyikstorage'
  const { error: uploadError } = await supabase.storage
    .from('kelasyikstorage')
    .upload(filePath, file);

  if (uploadError) {
    throw new Error('Gagal mengunggah foto: ' + uploadError.message);
  }

  // Mendapatkan Public URL dari file yang di-upload
  const { data } = supabase.storage
    .from('kelasyikstorage')
    .getPublicUrl(filePath);

  return data.publicUrl;
}