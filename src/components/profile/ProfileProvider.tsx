import { ReactNode } from 'react';
import { ActiveProfileContext, useActiveProfileProvider } from '@/hooks/useActiveProfile';

interface ProfileProviderProps {
  children: ReactNode;
}

export function ProfileProvider({ children }: ProfileProviderProps) {
  const value = useActiveProfileProvider();
  
  return (
    <ActiveProfileContext.Provider value={value}>
      {children}
    </ActiveProfileContext.Provider>
  );
}
