import { type ReactNode } from 'react';
import { ClientSideProviders } from './client-dynamic-provider';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ClientSideProviders>
      {children}
    </ClientSideProviders>
  );
}
