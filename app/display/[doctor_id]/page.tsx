'use client';

import { useSearchParams } from 'next/navigation';

export default function DisplayPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const name = searchParams.get('name');

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Now Calling</h1>
        {token && name ? (
          <>
            <p className="text-6xl font-extrabold mb-2">Token #{token}</p>
            <p className="text-3xl">{name}</p>
          </>
        ) : (
          <p className="text-3xl">No patient being called</p>
        )}
      </div>
    </div>
  );
}
