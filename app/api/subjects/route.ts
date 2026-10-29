import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET: Returns all subjects along with calculated attendance analytics from logs
export async function GET() {
  try {
    const sql = `
      SELECT 
        s.id, 
        s.name, 
        s.code, 
        s.target_percentage,
        COUNT(a.id) FILTER (WHERE a.status = 'PRESENT')::int AS present_count,
        COUNT(a.id)::int AS total_count
      FROM subjects s
      LEFT JOIN attendance_logs a ON s.id = a.subject_id
      GROUP BY s.id
      ORDER BY s.id DESC;
    `;
    const result = await query(sql);
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Add new subject
export async function POST(req: Request) {
  try {
    const { name, code, target_percentage } = await req.json();
    if (!name) return NextResponse.json({ error: "Subject name is required" }, { status: 400 });

    const sql = `
      INSERT INTO subjects (name, code, target_percentage)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;
    const result = await query(sql, [name, code || 'SUB-01', target_percentage || 75]);
    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
