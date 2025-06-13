import { writeFile, appendFile } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { doctorId, name, phone } = await req.json();

  try {
    const logDir = path.resolve(process.cwd(), 'public', 'logs');
    const filePath = path.join(logDir, `patients-${doctorId}.txt`);
    
    // Ensure the directory exists (optional if you pre-create it)
    await writeFile(filePath, '', { flag: 'a' }); // Create file if it doesn't exist
    const line = `${name} - ${phone}\n`;
    await appendFile(filePath, line);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to log patient:', error);
    return NextResponse.json({ error: 'Failed to log patient' }, { status: 500 });
  }
}
