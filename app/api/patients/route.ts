import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .order('token_number', { ascending: true });

  if (error) {
    console.error('Error fetching patients:', error.message);
    return NextResponse.json({ error: 'Failed to fetch patients' }, { status: 500 });
  }

  return NextResponse.json({ patients: data });
}
