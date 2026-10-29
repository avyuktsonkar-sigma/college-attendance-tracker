import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const subjectId = params.id;
    await query('DELETE FROM subjects WHERE id = $1', [subjectId]);
    return NextResponse.json({ success: true, message: 'Deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
