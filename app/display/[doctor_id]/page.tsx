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
  const [ready, setReady] = useState(false);
  const params = useParams();
  const doctorId = params?.doctor_id as string;

  // 🔊 Generic speech function
  const speak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US'; // You can also try 'en-US'
    utterance.rate = 1.0;
    speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (!doctorId || !ready) return;

    async function fetchCalledPatient() {
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

    fetchCalledPatient(); // Initial fetch

    const dbChannel = supabase
      .channel('patients-calls')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'patients',
        },
        async (payload) => {
          const updated = payload.new;
          console.log('📡 Realtime DB update received:', updated);

          if (updated.status === 'called') {
            setCalledPatient({
              name: updated.name,
              token_number: updated.token_number,
            });

            // Speak the new token number dynamically
            speak(`Token number ${updated.token_number}, please proceed to the doctor's room.`);
          } else {
            await fetchCalledPatient();
          }
        }
      )
      .subscribe();

    const bellChannel = supabase
      .channel(`doctor:${doctorId}`)
      .on('broadcast', { event: 'ring-bell' }, () => {
        console.log('🔔 Bell ring received!');
        if (calledPatient) {
          speak(`Token number ${calledPatient.token_number}, you are being called. Enter the room please.`);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(dbChannel);
      supabase.removeChannel(bellChannel);
    };
  }, [doctorId, ready, calledPatient]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <button
          className="px-6 py-3 text-xl bg-indigo-500 hover:bg-indigo-700 rounded-lg shadow-md"
          onClick={() => setReady(true)}
        >
          Start Display
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4">Calling</h1>
        {calledPatient ? (
          <>
            <p className="text-8xl font-extrabold mb-2">
              Token: #{calledPatient.token_number}
            </p>
            <p className="text-5xl">{calledPatient.name}</p>
          </>
        ) : (
          <p className="text-5xl">No patient being called</p>
        )}
      </div>
    </div>
  );
}
