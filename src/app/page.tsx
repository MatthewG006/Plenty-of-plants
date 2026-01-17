
'use client';

import Splash from './Splash';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

export default function Page() {
  const { loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }
  
  return <Splash />;
}
