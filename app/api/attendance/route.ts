import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// POST: Mark a live attendance record (Date + Status)
export async function POST(req: Request) {
  try {
    const { subjectId, status } = await req.json();

    if (!subjectId || !['PRESENT', 'ABSENT'].includes(status)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const sql = `
      INSERT INTO attendance_logs (subject_id, status, marked_date)
      VALUES ($1, $2, CURRENT_DATE)
      RETURNING *;
    `;
    const result = await query(sql, [subjectId, status]);
    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// GET: Fetch recent date-wise audit log for evaluation proof
export async function GET() {
  try {
    const sql = `
      SELECT 
        a.id, 
        s.name AS subject_name, 
        s.code AS subject_code, 
        a.status, 
        a.marked_date, 
        a.created_at
      FROM attendance_logs a
      JOIN subjects s ON a.subject_id = s.id
      ORDER BY a.created_at DESC
      LIMIT 15;
    `;
    const result = await query(sql);
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
