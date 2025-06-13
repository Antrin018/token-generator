'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

type Doctor = {
  id: string; // ✅ UUID as string
  name: string;
};

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [token, setToken] = useState<number | null>(null);
  const [patientId, setPatientId] = useState<number | null>(null);
  const [status, setStatus] = useState('waiting');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (
        Notification.permission !== 'granted' &&
        Notification.permission !== 'denied'
      ) {
        Notification.requestPermission().then((permission) => {
          console.log('Notification permission:', permission);
        });
      }
    }
  }, []);
  // 👨‍⚕️ Fetch doctor list
  useEffect(() => {
    const fetchDoctors = async () => {
      const { data, error } = await supabase.from('doctors').select('id, name');
      if (error) console.error('Failed to load doctors', error);
      else setDoctors(data);
    };

    fetchDoctors();
  }, []);

  // ✅ Register patient
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
  
    if (!selectedDoctorId) {
      alert('Please select a doctor');
      return;
    }
  
    setLoading(true);
  
    // 1. Check doctor availability
    const { data: doctorStatus, error: statusError } = await supabase
      .from('doctors')
      .select('is_online')
      .eq('id', selectedDoctorId)
      .single();
  
    if (statusError || !doctorStatus) {
      setLoading(false);
      alert('❌ Could not check doctor availability. Please try again.');
      return;
    }
  
    if (!doctorStatus.is_online) {
      setLoading(false);
      alert('⚠️ The doctor is currently unavailable. Please try again later.');
      return;
    }
  
    // 2. Try registering the patient
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        phone,
        doctor_id: selectedDoctorId,
      }),
    });
  
    const data = await res.json();
  
    // 3. Handle already registered or general failure
    if (!res.ok || data.error) {
      setLoading(false);
  
      if (data.error.includes('already')) {
        alert('⚠️ You have already registered with this doctor.');
      } else {
        alert('❌ Registration failed. Please try again.');
      }
  
      return;
    }
  
    // 4. Success 🎉
    setToken(data.token);
    setPatientId(data.id);
    setLoading(false);

    try {
      await fetch('/api/log-patient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          doctorId: selectedDoctorId,
        }),
      });
    } catch (err) {
      console.error('❌ Failed to log patient to file:', err);
  }
  

  // 🔁 Listen for status updates
  useEffect(() => {
    if (patientId===null) return;
  
    const channel = supabase
      .channel('patient-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'patients',
          filter: `id=eq.${patientId}`,
        },
        (payload) => {
          const updated = payload.new;
          setStatus(updated.status);
  
          // 🛎️ Show notification if status changed to 'called'
          if (updated.status === 'called') {
            // If permission is granted, show notification
            if (Notification.permission === 'granted') {
              new Notification(`🚨 Token ${updated.token_number} Called`, {
                body: 'Please proceed to the room.',
              });
            } else {
              alert(`🚨 Your Token ${updated.token_number} has been called!`);
            }
          }
        }
      )
      .subscribe();
  
    return () => {
      supabase.removeChannel(channel);
    };
  }, [patientId]);
  

  // 💬 Show called screen
  if (status === 'called') {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold text-green-600">🎉 You are being called!</h1>
        <p className="text-lg mt-2">Please proceed to the room.</p>
        <p className="text-4xl mt-4 font-mono">Token #{token}</p>
      </div>
    );
  }

  // 📋 Show registered screen
  if (token !== null) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold">✅ Registered Successfully</h1>
        <p className="text-lg mt-2">Your token is:</p>
        <p className="text-4xl font-mono text-blue-600 mt-2">{token}</p>
        <p className="text-gray-500 mt-4">Waiting to be called...</p>
      </div>
    );
  }

  // 📝 Show registration form
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-100 to-pink-200 flex items-center justify-center p-4">
  <div className="w-full max-w-md backdrop-blur-md bg-white/30 border border-white/40 rounded-2xl shadow-xl p-8 text-gray-800 text-center">
    {status === 'called' ? (
      <>
        <h1 className="text-3xl font-bold text-green-600">!!! You are being called!</h1>
        <p className="text-lg mt-4 text-gray-800">Please proceed to the room.</p>
        <p className="text-5xl mt-6 font-mono text-black bg-white/50 rounded-lg px-4 py-2 inline-block shadow-md">
          Token #{token}
        </p>
      </>
    ) : token !== null ? (
      <>
        <h1 className="text-3xl font-bold text-green-700">✅ Registered Successfully</h1>
        <p className="text-lg mt-3 text-gray-800">Your token is:</p>
        <p className="text-5xl mt-4 font-mono text-blue-700 bg-white/50 rounded-lg px-4 py-2 inline-block shadow-md">
          {token}
        </p>
        <p className="text-gray-700 mt-6">Waiting to be called...</p>
      </>
    ) : (
   
      // 📝 Registration form
      <>
        <h1 className="text-2xl font-bold mb-4 text-gray-800">Patient Registration</h1>
        <form onSubmit={handleSubmit} className="space-y-5 text-left">
          <input
            type="text"
            required
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-transparent border-b-2 border-gray-400 focus:border-blue-600 outline-none py-2 placeholder-gray-600 text-gray-800"
          />

          <input
            type="tel"
            required
            placeholder="Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full bg-transparent border-b-2 border-gray-400 focus:border-blue-600 outline-none py-2 placeholder-gray-600 text-gray-800"
          />

          <select
            value={selectedDoctorId}
            onChange={(e) => setSelectedDoctorId(e.target.value)}
            required
            className="w-full bg-transparent border-b-2 border-gray-400 focus:border-blue-600 outline-none py-2 text-gray-800"
          >
            <option value="" className="text-gray-400">Select Doctor</option>
            {doctors.map((doc) => (
              <option key={doc.id} value={doc.id} className="text-gray-800">
                {doc.name}
              </option>
            ))}
          </select>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-500 text-white py-2 rounded-full font-medium hover:bg-indigo-700 transition disabled:opacity-70"
          >
            {loading ? 'Submitting...' : 'Get Token'}
          </button>
        </form>
      </>
    )}
  </div>
</main>
  )
}
}