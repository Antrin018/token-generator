'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams } from 'next/navigation';

type Patient = {
  id: number;
  name: string;
  token_number: number;
};

export default function DisplayPage() {
  const [calledPatient, setCalledPatient] = useState<Patient | null>(null);
  const params = useParams();
  const doctorId = params?.id as string;

  async function fetchCalledPatient() {
    const { data, error } = await supabase
      .from('patients')
      .select('id, name, token_number')
      .eq('doctor_id', doctorId)
      .eq('status', 'called')
      .order('token_number', { ascending: true })
      .limit(1)
      .single();

    if (!error) setCalledPatient(data);
    else setCalledPatient(null); // Clear if no patient found or error
  }

  useEffect(() => {
    fetchCalledPatient(); // Initial load
    const interval = setInterval(fetchCalledPatient, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [doctorId]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Now Calling</h1>
        {calledPatient ? (
          <>
            <p className="text-6xl font-extrabold mb-2">Token #{calledPatient.token_number}</p>
            <p className="text-3xl">{calledPatient.name}</p>
          </>
        ) : (
          <p className="text-3xl">No patient being called</p>
        )}
      </div>
    </div>
  );
}
