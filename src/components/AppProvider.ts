import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AppConfig {
  /** Selected relay URL */
  relayUrl: string;
}

interface RelayInfo {
  /** Relay URL */
  url: string;
  /** Display name for the relay */
  name: string;
}

// Available relay options
export const RELAY_OPTIONS: RelayInfo[] = [
  { url: 'wss://ditto.pub/relay', name: 'Ditto' },
  { url: 'wss://relay.damus.io', name: 'Damus' },
  { url: 'wss://nos.lol', name: 'nos.lol' },
  { url: 'wss://relay.nostr.band', name: 'nostr.band' },
];

// Default application configuration
const DEFAULT_CONFIG: AppConfig = {
  relayUrl: 'wss://relay.nostr.band',
};

interface AppContextType {
  /** Current application configuration */
  config: AppConfig;
  /** Update any configuration value */
  updateConfig: <K extends keyof AppConfig>(key: K, value: AppConfig[K]) => void;
  /** Available relay options */
  availableRelays: RelayInfo[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY = 'nostr:app-config';

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);

  // Load saved config from localStorage on mount
  useEffect(() => {
    try {
      const savedConfig = localStorage.getItem(STORAGE_KEY);
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        // Merge with defaults to handle new config options
        setConfig(prev => ({ ...prev, ...parsed }));
      }
    } catch (error) {
      console.warn('Failed to load app config from localStorage:', error);
    }
  }, []);

  // Save config to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (error) {
      console.warn('Failed to save app config to localStorage:', error);
    }
  }, [config]);

  // Generic config updater
  const updateConfig = <K extends keyof AppConfig>(key: K, value: AppConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const contextValue: AppContextType = {
    config,
    updateConfig,
    availableRelays: RELAY_OPTIONS,
  };

  return React.createElement(AppContext.Provider, { value: contextValue }, children);
}

/**
 * Hook to access and update application configuration
 * @returns Application context with config and update methods
 */
export function useAppConfig() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppConfig must be used within an AppProvider');
  }
  return context;
}
