
'use client';

import Splash from './Splash';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

export default function Page() {
  const { loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }
  
  // The Splash component now handles the initial redirect.
  return <Splash />;
}
