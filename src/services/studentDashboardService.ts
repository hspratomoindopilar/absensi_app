import { supabase } from '@/lib/supabase';

export async function getStudentDashboardProfile(studentId: string) {
  const { data: studentData, error: studentError } = await supabase
    .from('students')
    .select('*')
    .eq('student_id', studentId)
    .single();

  if (studentError || !studentData) {
    throw new Error('Gagal memuat profil siswa: ' + (studentError?.message || 'Data tidak ditemukan'));
  }

  let classData = null;
  if (studentData.class_id) {
    const { data: cData, error: cError } = await supabase
      .from('classes')
      .select('class_name, academic_year')
      .eq('class_id', studentData.class_id)
      .single();
    
    if (!cError) {
      classData = cData;
    }
  }

  // Ambil data statistik dari fl_student_stats
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

  let schoolDaysConfig = 5;
  if (studentData.tenant_id) {
    const { data: tenantData } = await supabase
      .from('tenants')
      .select('school_days')
      .eq('tenant_id', studentData.tenant_id)
      .single();
    
    if (tenantData && tenantData.school_days) {
      schoolDaysConfig = tenantData.school_days;
    }
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const dateObj = new Date(todayStr);
  const dayOfWeek = dateObj.getDay();

  const isSunday = dayOfWeek === 0;
  const isSaturdayOff = dayOfWeek === 6 && schoolDaysConfig === 5;

  let attendanceStatus = 'Belum Diabsen';

  if (isSunday) {
    attendanceStatus = 'Libur (Hari Minggu)';
  } else if (isSaturdayOff) {
    attendanceStatus = 'Libur (Akhir Pekan)';
  } else {
    if (studentData.tenant_id) {
      const { data: holidayData } = await supabase
        .from('school_holidays')
        .select('*')
        .eq('tenant_id', studentData.tenant_id)
        .lte('start_date', todayStr)
        .gte('end_date', todayStr)
        .maybeSingle();

      if (holidayData) {
        attendanceStatus = `Libur (${holidayData.description || 'Sekolah'})`;
      }
    }

    if (attendanceStatus === 'Belum Diabsen') {
      const { data: attData } = await supabase
        .from('attendance')
        .select('status')
        .eq('student_id', studentId)
        .eq('date', todayStr)
        .maybeSingle();

      if (attData) {
        const st = attData.status;
        if (st === 'Hadir' || st === 'H') attendanceStatus = 'Hadir (H)';
        else if (st === 'Sakit' || st === 'S') attendanceStatus = 'Sakit (S)';
        else if (st === 'Izin' || st === 'I') attendanceStatus = 'Izin (I)';
        else if (st === 'Alpa' || st === 'A') attendanceStatus = 'Alpa (A)';
        else attendanceStatus = st;
      }
    }
  }

  return {
    ...studentData,
    classes: classData,
    stats: statsData,
    avatar_url: finalAvatar, // Terkunci otomatis jika EXP < 500
    attendanceToday: attendanceStatus
  };
}