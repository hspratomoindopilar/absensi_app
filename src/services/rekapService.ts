import { supabase } from '@/lib/supabase';

export type MonthlyAttendanceSummary = {
  student_id: string;
  nis: string;
  full_name: string;
  total_h: number;
  total_s: number;
  total_i: number;
  total_a: number;
  total_presence: number;
};

// Fungsi untuk mengambil rekapitulasi absensi satu bulan penuh
export async function fetchMonthlyAttendanceReport(
  tenantId: string, 
  classId: string, 
  year: number, 
  month: number
): Promise<MonthlyAttendanceSummary[]> {
  // 1. Ambil semua siswa di kelas tersebut (diurutkan berdasarkan nama)
  const { data: students, error: studentError } = await supabase
    .from('students')
    .select('student_id, nis, full_name')
    .eq('tenant_id', tenantId)
    .eq('class_id', classId)
    .order('full_name', { ascending: true });

  if (studentError || !students) throw studentError;

  // 2. Format rentang tanggal awal dan akhir bulan (Format: YYYY-MM-DD)
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

  // 3. Ambil data absensi dalam rentang bulan tersebut untuk tenant ini
  const { data: attendanceData, error: attError } = await supabase
    .from('attendance')
    .select('student_id, status, date')
    .eq('tenant_id', tenantId)
    .gte('date', startDate)
    .lte('date', endDate);

  if (attError) throw attError;

  // 4. Petakan dan hitung akumulasi per siswa
  const summaryMap: Record<string, { H: number; S: number; I: number; A: number }> = {};
  
  students.forEach((s) => {
    summaryMap[s.student_id] = { H: 0, S: 0, I: 0, A: 0 };
  });

  (attendanceData || []).forEach((record) => {
    if (summaryMap[record.student_id]) {
      const st = record.status as 'H' | 'S' | 'I' | 'A';
      if (summaryMap[record.student_id][st] !== undefined) {
        summaryMap[record.student_id][st] += 1;
      }
    }
  });

  // 5. Gabungkan ke struktur akhir
  return students.map((s) => {
    const counts = summaryMap[s.student_id] || { H: 0, S: 0, I: 0, A: 0 };
    return {
      student_id: s.student_id,
      nis: s.nis || '-',
      full_name: s.full_name,
      total_h: counts.H,
      total_s: counts.S,
      total_i: counts.I,
      total_a: counts.A,
      total_presence: counts.H + counts.S + counts.I + counts.A,
    };
  });
}