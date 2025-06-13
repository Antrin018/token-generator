'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams } from 'next/navigation';

type Patient = {
  id?: number;
  name: string;
  token_number: number;
  status?: string;
};

export default function DisplayPage() {
  const [calledPatient, setCalledPatient] = useState<Patient | null>(null);
  const params = useParams();
  const doctorId = params?.id as string;

  // Fetch initially called patient (in case of refresh)
  async function fetchCalledPatient() {
    if (!doctorId) return null;

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
      return data;
    } else {
      setCalledPatient(null);
      return null;
    }
  }

  useEffect(() => {
    if (!doctorId) return;

    fetchCalledPatient(); // Fetch once on mount

    const channel = supabase
      .channel('patients-calls')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'patients',
          filter: `doctor_id=eq.${doctorId}`,
        },
        async (payload) => {
          const updated = payload.new;
          console.log('📡 Realtime DB update received:', updated);

          if (updated.status === 'called') {
            setCalledPatient({
              name: updated.name,
              token_number: updated.token_number,
            });
          } else {
            // If a called patient is marked done or cancelled, refresh state
            await fetchCalledPatient();
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
        <h1 className="text-4xl font-bold mb-4">Calling</h1>
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
