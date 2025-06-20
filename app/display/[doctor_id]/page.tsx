'use client';

import { useEffect, useRef, useState } from 'react';
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

  const bellAudioRef = useRef<HTMLAudioElement | null>(null);

  // ✅ Use ref to store available voices
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  // ✅ Prefetch voices safely
  const loadVoices = () => {
    return new Promise<SpeechSynthesisVoice[]>((resolve) => {
      let voices = speechSynthesis.getVoices();
      if (voices.length) {
        resolve(voices);
      } else {
        speechSynthesis.onvoiceschanged = () => {
          voices = speechSynthesis.getVoices();
          resolve(voices);
        };
      }
    });
  };

  const unlockSpeechSynthesis = async () => {
    const dummy = new SpeechSynthesisUtterance('');
    speechSynthesis.speak(dummy);

    voicesRef.current = await loadVoices();
    console.log('🔊 Voices loaded:', voicesRef.current.map(v => v.name));
  };

  // ✅ New function to speak the token number dynamically
  const speakTokenNumber = (tokenNumber: number) => {
    const utterance = new SpeechSynthesisUtterance(
      `Token number ${tokenNumber}, please proceed to the doctor's room.`
    );

    const voice =
      voicesRef.current.find(v => v.lang === 'en-US'|| v.lang === 'en-IN') ||
      voicesRef.current[0];

    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang || 'en-US';
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

    fetchCalledPatient();

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
            speakTokenNumber(updated.token_number);
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
        try {
          bellAudioRef.current?.play();
        } catch (err) {
          console.warn('🔇 Could not play bell audio:', err);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(dbChannel);
      supabase.removeChannel(bellChannel);
    };
  }, [doctorId, ready]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <button
          className="px-6 py-3 text-xl bg-indigo-500 hover:bg-indigo-700 rounded-lg shadow-md"
          onClick={async () => {
            await unlockSpeechSynthesis(); // ✅ Unlock speech on tap
            setReady(true); // ✅ Then start
          }}
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

      <audio ref={bellAudioRef} src="/recall.mp3" preload="auto" />
    </div>
  );
}
