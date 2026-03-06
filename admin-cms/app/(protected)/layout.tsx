import { ReactNode } from 'react';
import ProtectedShell from '@/components/layout/ProtectedShell';
import { getServerAuth } from '@/lib/server-auth';
import { redirect } from 'next/navigation';

// Keep layouts as server side since they are part of page protection logic
// Security in app -> server side layouts prevent flicker and unauthorized access
export default async function ProtectedLayout({ children }: { children: ReactNode }) {

   const session = await getServerAuth();

   if (!session.isAuthenticated) {
        redirect('/login?reason=auth');
   }

  return <ProtectedShell>{children}</ProtectedShell>;
}