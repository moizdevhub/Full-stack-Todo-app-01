'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function Home() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        // Redirect authenticated users to todos page
        router.push('/todos');
      } else {
        // Redirect unauthenticated users to login
        router.push('/login');
      }
    }
  }, [user, isLoading, router]);

  // Show loading state while checking authentication
  return (
    <main className="flex h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 text-4xl">📝</div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </main>
  );
}
