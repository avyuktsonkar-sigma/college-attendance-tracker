/**
 * College Attendance Tracker — Type Definitions & Schemas
 * Ensures strict type-safety across Frontend and Backend boundaries.
 */

export type AttendanceStatus = 'PRESENT' | 'ABSENT';

export interface SubjectSchema {
  id: string | number;
  name: string;
  code: string;
  target_percentage: number;
  present_count: number;
  total_count: number;
  created_at?: string;
}

export interface AttendanceLogSchema {
  id: string | number;
  subject_id?: string | number;
  subject_name: string;
  subject_code: string;
  status: AttendanceStatus;
  marked_date: string;
  timestamp: string;
}

export interface BunkForecastResult {
  message: string;
  safe: boolean;
  bunkableClasses?: number;
  requiredClasses?: number;
}
