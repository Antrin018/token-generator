import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Keep secure
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const doctorId = searchParams.get('doctorId');

  if (!doctorId) return NextResponse.json({ error: 'Doctor ID missing' }, { status: 400 });

  const { data, error } = await supabase
    .from('patients')
    .select('token_number, phone, name')
    .eq('doctor_id', doctorId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const header = `Token  | Name                 | Phone\n` +
  `-------------------------------------------\n`;

  const textBody = data.map(p =>
  `${String(p.token_number).padEnd(6)} | ${p.name.padEnd(20)} | ${p.phone}`
  ).join('\n');
  
  const text = header + textBody;


  return new Response(text, {
    headers: {
      'Content-Type': 'text/plain',
      'Content-Disposition': `attachment; filename=patients-${doctorId}.txt`,
    },
  });
}
