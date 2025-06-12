'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import QRCode from 'react-qr-code';
import { useCallback } from 'react';

type Patient = {
  id: number;
  name: string;
  phone: string;
  token_number: number;
  status: string;
};

export default function DoctorDashboard() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const router = useRouter();
  const params = useParams();
  const doctorId = params?.id as string;

  const currentDate = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const registrationLink = `${process.env.NEXT_PUBLIC_BASE_URL}/register?doctor_id=${doctorId}`; // Change to actual domain

  // -------------------------- Session Check --------------------------
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push('/');
      } else {
        await supabase.from('doctors').update({ is_online: true }).eq('id', doctorId);
        const { data, error } = await supabase
          .from('doctors')
          .select('is_online')
          .eq('id', doctorId)
          .single();
        if (!error && data) setIsOnline(data.is_online);
        setCheckingSession(false);
      }
    };

    checkSession();
  }, [router, doctorId]);



  // -------------------------- Fetch Patients --------------------------
  const fetchPatients = useCallback(async () => {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('doctor_id', doctorId)
      .order('token_number', { ascending: true });

    if (!error) setPatients(data);
    else console.error('Failed to fetch patients:', error);
  }, [doctorId]);
  // -------------------------- Toggle Status --------------------------
  async function toggleOnlineStatus() {
    const newStatus = !isOnline;

    const { error } = await supabase
      .from('doctors')
      .update({ is_online: newStatus })
      .eq('id', doctorId);

    if (!error) setIsOnline(newStatus);
    else console.error('Failed to toggle online status:', error);
  }

  // -------------------------- End Session --------------------------
  async function handleEndSession() {
    const confirmed = window.confirm(
      '⚠️ This will end the session, clear all patient data, and set you as offline. Continue?'
    );

    if (!confirmed) return;

    try {
      await supabase.from('doctors').update({ is_online: false }).eq('id', doctorId);
      await supabase.from('patients').delete().eq('doctor_id', doctorId);
      alert('🛑 Session ended successfully.');
      router.push('/');
    } catch (err) {
      console.error('Unexpected error:', err);
      alert('Something went wrong.');
    }
  }

  // -------------------------- Call Next --------------------------
  async function handleNext() {
    setLoading(true);
    const res = await fetch('/api/next', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doctor_id: doctorId }),
    });
    const data = await res.json();
    if (res.ok) await fetchPatients();
    else console.error('Next patient error:', data.error || data.message);
    setLoading(false);
  }

  // -------------------------- Polling --------------------------

  useEffect(() => {
    if (!checkingSession) {
      fetchPatients();
      const interval = setInterval(fetchPatients, 5000);
      return () => clearInterval(interval);
    }
  }, [checkingSession, fetchPatients]);

  const called = patients.find((p) => p.status === 'called');
  const waiting = patients.filter((p) => p.status === 'waiting');
  

  if (checkingSession) {
    return <p className="p-6 text-center text-gray-600">🔐 Checking login...</p>;
  }

  // -------------------------- Render --------------------------
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-100 to-pink-200 flex items-center justify-center p-4">
  <div className="w-full max-w-3xl backdrop-blur-md bg-white/30 border border-white/40 rounded-2xl shadow-xl p-8 text-gray-800">
    <h1 className="text-3xl font-bold mb-2 text-center">Doctor Dashboard</h1>
    <p className="text-sm text-gray-700 text-center mb-1">📅 {currentDate}</p>
    <p className="text-sm text-gray-700 text-center mb-6">🩺 Doctor ID: {doctorId}</p>

    <div className="mb-8 flex flex-col items-center text-center printable-area print:border print:p-4 print:rounded-md">
      <QRCode value={registrationLink} size={180} />
      <p className="text-xs mt-2 text-gray-700">Scan to register as a patient</p>
      <a href={registrationLink} target="_blank" className="text-blue-700 underline mt-1 text-sm break-words">
        {registrationLink}
      </a>

      <button
        onClick={() => window.print()}
        className="mt-4 px-4 py-2 bg-indigo-400 text-white rounded-full hover:bg-indigo-600 print:hidden"
      >
        Print QR Code
      </button>
    </div>

    {called ? (
      <div className="mb-6 p-4 bg-white/40 rounded-lg shadow">
        <p className="{`${playfair.className text-xl font-semi-bold`}">Calling Patient:</p>
        <p className="text-2xl font-bold">{called.name}~(Token:-{called.token_number})</p>
      </div>
    ) : (
      <p className="mb-4 text-center text-gray-700">🕓 No patient is currently being called.</p>
    )}

    <div className="flex flex-wrap gap-4 justify-center mb-8">
      <button
        onClick={handleNext}
        disabled={loading || waiting.length === 0}
        className="px-6 py-2 bg-indigo-400 text-white rounded-full hover:bg-blue-700 disabled:opacity-60"
      >
        {loading ? 'Loading...' : 'Next Patient'}
      </button>

      <button
        onClick={toggleOnlineStatus}
        className={`px-6 py-2 text-white rounded-full ${
          isOnline ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
        }`}
      >
        {isOnline ? 'Pause Session' : 'Resume Session'}
      </button>

      {isOnline && (
        <button
          onClick={handleEndSession}
          className="px-6 py-2 bg-black text-white rounded-full hover:bg-gray-800"
        >
          End Session
        </button>
      )}
    </div>

    <h2 className="text-xl font-semibold mb-2 text-center">....Waiting Queue....</h2>
    {waiting.length === 0 ? (
      <p className="text-center text-gray-600">No patients in queue.</p>
    ) : (
      <ul className="space-y-2">
        {waiting.map((p) => (
          <li key={p.id} className="bg-white/60 border border-white/40 rounded px-4 py-2 shadow">
            Token-{p.token_number} - {p.name}
          </li>
        ))}
      </ul>
    )}
  </div>
</main>
  )
}