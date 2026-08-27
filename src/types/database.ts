export type Student = {
  student_id: string;
  nis: string;
  full_name: string;
  status?: string; // 'H' | 'S' | 'I' | 'A'
};

export type AttendanceRecordPayload = {
  tenant_id: string;
  student_id: string;
  date: string;
  status: string;
  recorded_by?: string; // Menyimpan user_id guru yang mencatat
};