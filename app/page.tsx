'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function HomePage() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    if (!email || !name) {
      setMessage('⚠️ Please enter your name and email.');
      return;
    }

    setLoading(true);

    // 🔍 Check if doctor exists by email
    const { data, error: fetchError } = await supabase
      .from('doctors')
      .select('id')
      .eq('email', email)
      .single();

    let doctor=data;

    // 🆕 If doctor not found, insert a new record
    if (!doctor && fetchError?.code === 'PGRST116') {
      const { data: newDoctor, error: insertError } = await supabase
        .from('doctors')
        .insert({ name, email })
        .select('id')
        .single();

      if (insertError) {
        setMessage(`❌ Could not create doctor: ${insertError.message}`);
        setLoading(false);
        return;
      }

      doctor = newDoctor;
    }

    if (!doctor) {
      setMessage(`❌ Unexpected error: ${fetchError?.message || 'No doctor ID'}`);
      setLoading(false);
      return;
    }

    // ✅ Send magic link with doctor ID in redirect URL
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        data: { name },
        emailRedirectTo: `https://doctor-app-antrin-majis-projects.vercel.app/doctor/${doctor.id}`,
      },
    });

    setLoading(false);

    if (error) {
      setMessage(`❌ Error sending magic link: ${error.message}`);
    } else {
      setMessage('✅ Magic link sent! Check your email to confirm and access your dashboard.');
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-100 to-pink-200 flex items-center justify-center p-4">
  <div className="w-full max-w-md backdrop-blur-md bg-white/30 px-8 py-20 rounded-xl shadow-lg border border-white/40 text-gray-800">
    <h1 className="{`${playfair.className text-4xl font-semibold text-center mb-6 text-gray-800`}">Doctor Login</h1>

    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <input
          type="text"
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-transparent border-b-2 border-gray-400 focus:border-blue-600 outline-none py-2 placeholder-gray-600 text-gray-800"
        />
      </div>

      <div>
        <input
          type="email"
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-transparent border-b-2 border-gray-400 focus:border-blue-600 outline-none py-2 placeholder-gray-600 text-gray-800"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-indigo-500 text-white py-2 rounded-full font-medium hover:bg-indigo-700 transition disabled:opacity-50"
      >
        {loading ? 'Sending...' : 'Send Magic Link'}
      </button>
    </form>

    {message && (
      <p className="mt-4 text-sm text-center text-gray-700">{message}</p>
    )}
  </div>
</main>
  );
}
  
