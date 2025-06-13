import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ✅ Initialize Supabase with service role key (server only)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { doctor_id } = await req.json();

  if (!doctor_id) {
    return NextResponse.json({ error: 'Doctor ID is required' }, { status: 400 });
  }

  // ✅ Step 1: Mark current 'called' patient as 'done'
  const { data: currentCalled } = await supabase
    .from('patients')
    .select('*')
    .eq('doctor_id', doctor_id)
    .eq('status', 'called')
    .order('token_number', { ascending: true })
    .limit(1)
    .single();

  if (currentCalled) {
    const { error: updateError } = await supabase
      .from('patients')
      .update({ status: 'done' })
      .eq('id', currentCalled.id);

    if (updateError) {
      console.error('Error updating current patient to done:', updateError.message);
      return NextResponse.json({ error: 'Failed to update current patient' }, { status: 500 });
    }
  }

  // ✅ Step 2: Find the next waiting patient for this doctor
  const { data: nextPatient } = await supabase
    .from('patients')
    .select('*')
    .eq('doctor_id', doctor_id)
    .eq('status', 'waiting')
    .order('token_number', { ascending: true })
    .limit(1)
    .single();

  if (!nextPatient) {
    return NextResponse.json({ message: 'No more patients in queue' });
  }

  // ✅ Step 3: Update next patient's status to 'called'
  const { error: callError } = await supabase
    .from('patients')
    .update({ status: 'called' })
    .eq('id', nextPatient.id);

  if (callError) {
    console.error('Error calling next patient:', callError.message);
    return NextResponse.json({ error: 'Failed to call next patient' }, { status: 500 });
  }

  // ✅ Step 4: Just return data — let frontend listen via `postgres_changes`
  return NextResponse.json({ called: nextPatient });
}
