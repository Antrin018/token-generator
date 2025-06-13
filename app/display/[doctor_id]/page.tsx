'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams } from 'next/navigation';

type Patient = {
  id?: number;
  name: string;
  token_number: number;
};

export default function DisplayPage() {
  const [calledPatient, setCalledPatient] = useState<Patient | null>(null);
  const params = useParams();
  const doctorId = params?.id as string;

  // Initial fetch – useful in case someone reloads the display page
  async function fetchCalledPatient() {
    if (!doctorId) return;

    const { data, error } = await supabase
      .from('patients')
      .select('id, name, token_number, status')
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

    fetchCalledPatient(); // Initial safety check on mount

    const channel = supabase.channel(`doctor-${doctorId}`);

    channel
      .on('broadcast', { event: 'patient-called' }, (payload) => {
        const data = payload.payload as {
          doctor_id: string;
          name: string;
          token_number: number;
        };

        console.log('📡 Broadcast received:', data);

        if (String(data.doctor_id )=== String(doctorId)) {
          setCalledPatient({// no need for real ID
            name: data.name,
            token_number: data.token_number,
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [doctorId]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4"> Calling</h1>
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
