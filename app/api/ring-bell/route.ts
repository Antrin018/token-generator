import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { doctor_id } = body;

  if (!doctor_id) {
    return NextResponse.json({ error: 'Missing doctor_id' }, { status: 400 });
  }

  try {
    const result = await supabase.channel(`doctor:${doctor_id}`).send({
      type: 'broadcast',
      event: 'ring-bell',
      payload: {},
    });

    if (result !== 'error') {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Broadcast failed' }, { status: 500 });
    }
  } catch (err) {
    console.error('Error broadcasting bell:', err);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
