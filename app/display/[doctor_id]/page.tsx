'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams } from 'next/navigation';

type Patient = {
  id: number;
  name: string;
  token_number: number;
  status?: string;
};

export default function DisplayPage() {
  const [calledPatient, setCalledPatient] = useState<Patient | null>(null);
  const params = useParams();
  const doctorId = params?.id as string;

  // Fetch initially in case there's already a patient being called
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
    else setCalledPatient(null); // Clear if not found
  }

  useEffect(() => {
    fetchCalledPatient(); // on first load

    const channel = supabase
      .channel('called-patient-channel')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'patients',
          filter: `doctor_id=eq.${doctorId}`,
        },
        (payload) => {
          const newPatient = payload.new as Patient;

          if (newPatient.status === 'called') {
            setCalledPatient({
              id: newPatient.id,
              name: newPatient.name,
              token_number: newPatient.token_number,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
