export type Student = {
  student_id: string;
  nis: string;
  full_name: string;
  status?: string; // 'H' | 'S' | 'I' | 'A'
  gender?: 'L' | 'P';
};

export type AttendanceRecordPayload = {
  tenant_id: string;
  student_id: string;
  date: string;
  status: string;
  recorded_by?: string; // Menyimpan user_id guru yang mencatat
};

export type TenantSettings = {
  school_name: string;
  school_days: number; // 5 atau 6
};

export type SchoolHoliday = {
  holiday_id: string;
  tenant_id: string;
  start_date: string;
  end_date: string;
  description: string;
};

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