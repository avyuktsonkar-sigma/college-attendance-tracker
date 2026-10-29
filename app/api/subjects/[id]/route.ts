import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> } // <-- yahan Promise add karein
) {
  try {
    const { id } = await params; // <-- yahan await karein
    await query('DELETE FROM subjects WHERE id = $1', [id]);
    return NextResponse.json({ success: true, message: 'Deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
