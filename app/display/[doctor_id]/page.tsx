'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client (on client side use anon key)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function DisplayPage() {
  const { id: doctorId } = useParams();
  const [currentToken, setCurrentToken] = useState<number | null>(null);
  const [patientName, setPatientName] = useState<string | null>(null);

  // ✅ Listen for real-time updates
  useEffect(() => {
    if (!doctorId) return;

    const subscription = supabase
      .channel('realtime-patient-display')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'patients',
          filter: `doctor_id=eq.${doctorId}`,
        },
        (payload) => {
          const updated = payload.new;
          if (updated.status === 'called') {
            setCurrentToken(updated.token_number);
            setPatientName(updated.name);
          }
        }
      )
      .subscribe();

    // Initial fetch in case of refresh
    const fetchCurrentlyCalled = async () => {
      const { data } = await supabase
        .from('patients')
        .select('*')
        .eq('doctor_id', doctorId)
        .eq('status', 'called')
        .order('token_number', { ascending: true })
        .limit(1)
        .single();

      if (data) {
        setCurrentToken(data.token_number);
        setPatientName(data.name);
      }
    };

    fetchCurrentlyCalled();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [doctorId]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-black text-white text-center p-4">
      <h1 className="text-4xl font-bold mb-6">🎫 Now Serving</h1>
      {currentToken !== null ? (
        <>
          <p className="text-7xl font-extrabold">{currentToken}</p>
          <p className="text-2xl mt-4">{patientName}</p>
        </>
      ) : (
        <p className="text-2xl">No patient is currently being called.</p>
      )}
    </main>
  );
}
