'use client';

import { createContext, useContext, useSyncExternalStore } from 'react';

const FONTASY_HIMALI_STORAGE_KEY = 'fontasy-himali-tt-enabled';
const subscribers = new Set<() => void>();

interface FontasyHimaliContextValue {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

function getEnabledSnapshot(): boolean {
  return typeof window !== 'undefined'
    && window.localStorage.getItem(FONTASY_HIMALI_STORAGE_KEY) === 'true';
}

function getServerSnapshot(): boolean {
  return false;
}

function notifySubscribers(): void {
  subscribers.forEach((subscriber) => subscriber());
}

function subscribe(subscriber: () => void): () => void {
  subscribers.add(subscriber);
  const handleStorage = (event: StorageEvent) => {
    if (event.key === FONTASY_HIMALI_STORAGE_KEY) subscriber();
  };
  window.addEventListener('storage', handleStorage);

  return () => {
    subscribers.delete(subscriber);
    window.removeEventListener('storage', handleStorage);
  };
}

function setEnabled(enabled: boolean): void {
  window.localStorage.setItem(FONTASY_HIMALI_STORAGE_KEY, String(enabled));
  notifySubscribers();
}

const FontasyHimaliContext = createContext<FontasyHimaliContextValue>({
  enabled: false,
  setEnabled: () => {},
});

export function FontasyHimaliProvider({ children }: { children: React.ReactNode }) {
  const enabled = useSyncExternalStore(subscribe, getEnabledSnapshot, getServerSnapshot);

  return (
    <FontasyHimaliContext.Provider value={{ enabled, setEnabled }}>
      {children}
    </FontasyHimaliContext.Provider>
  );
}

export function useFontasyHimali(): FontasyHimaliContextValue {
  return useContext(FontasyHimaliContext);
}
