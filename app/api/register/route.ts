// For app router (App Directory)
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server'; // make sure this uses the service role client

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, phone, doctor_id } = body;

  // Get the current max token number for the doctor
  const { data: existing } = await supabaseServer
    .from('patients')
    .select('token_number')
    .eq('doctor_id', doctor_id);

  const maxToken =
    existing && existing.length > 0
      ? Math.max(...existing.map((p) => p.token_number || 0))
      : 0;

  const token_number = maxToken + 1;

  // Insert new patient with doctor_id
// First, check if the patient already exists for the same doctor
const { data: existingPatient} = await supabaseServer
  .from('patients')
  .select('*')
  .eq('phone', phone)
  .eq('doctor_id', doctor_id)
  .single();

  if (existingPatient) {
    return NextResponse.json(
      { error: 'already registered' },
      { status: 400 } // ❗ important for frontend detection
    );
  
}

// If not registered, insert the new patient
const { data, error } = await supabaseServer
  .from('patients')
  .insert({
    name,
    phone,
    doctor_id,
    token_number,
    status: 'waiting',
  })
  .select()
  .single();

  if (error) {
    console.error('Error inserting patient:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ token: data.token_number, id: data.id });
}
