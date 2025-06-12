import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Note: Not the anon key
);

export async function POST(req: Request) {
  const { email, name } = await req.json();

  if (!email || !name) {
    return NextResponse.json({ error: 'Missing email or name' }, { status: 400 });
  }

  // Check if doctor already exists
  const { data: existing } = await supabase
    .from('doctors')
    .select('*')
    .eq('email', email)
    .single();

  if (existing) {
    return NextResponse.json({ message: 'Doctor already exists' });
  }

  // Insert new doctor
  const { error } = await supabase.from('doctors').insert([{ email, name }]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: 'Doctor registered' });
}
