'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/store';

export default function ClientHydrate() {
  const hydrate = useAuthStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return null;
}
