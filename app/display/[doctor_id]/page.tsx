'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams } from 'next/navigation';

type Patient = {
  id: number;
  name: string;
  token_number: number;
  status?: string;
  doctor_id?: string | number;
};

export default function DisplayPage() {
  const [calledPatient, setCalledPatient] = useState<Patient | null>(null);
  const params = useParams();
  const doctorId = params?.id as string;

  async function fetchCalledPatient() {
    if (!doctorId) return;

    const { data, error } = await supabase
      .from('patients')
      .select('id, name, token_number, doctor_id, status')
      .eq('doctor_id', doctorId)
      .eq('status', 'called')
      .order('token_number', { ascending: true })
      .limit(1)
      .single();

    if (!error && data) {
      setCalledPatient(data);
    } else {
      setCalledPatient(null);
    }
  }

  useEffect(() => {
    if (!doctorId) return;

    fetchCalledPatient(); // fetch on mount

    const channel = supabase
      .channel('called-patient-channel')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'patients',
        },
        (payload) => {
          const newPatient = payload.new as Patient;

          console.log('🔁 Realtime payload:', newPatient);

          // Only update if it's for the current doctor and status is 'called'
          if (
            newPatient.status === 'called' &&
            String(newPatient.doctor_id) === doctorId
          ) {
            // Force re-render with a fresh object
            setCalledPatient(null); // clear first
            setTimeout(() => {
              setCalledPatient({
                id: newPatient.id,
                name: newPatient.name,
                token_number: newPatient.token_number,
              });
            }, 10);
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
            <p className="text-6xl font-extrabold mb-2">
              Token #{calledPatient.token_number}
            </p>
            <p className="text-3xl">{calledPatient.name}</p>
          </>
        ) : (
          <p className="text-3xl">No patient being called</p>
        )}
      </div>
    </div>
  );
}
