import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

export type Theme = "dark" | "light" | "system";

interface AppConfig {
  /** Current theme */
  theme: Theme;
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
  { url: 'wss://relay.nostr.band', name: 'Nostr.Band' },
  { url: 'wss://relay.damus.io', name: 'Damus' },
  { url: 'wss://relay.primal.net', name: 'Primal' },
];

// Default application configuration
const DEFAULT_CONFIG: AppConfig = {
  theme: 'system',
  relayUrl: 'wss://relay.nostr.band',
};

interface AppContextType {
  /** Current application configuration */
  config: AppConfig;
  /** Update configuration using a callback that receives current config and returns new config */
  updateConfig: (updater: (currentConfig: AppConfig) => AppConfig) => void;
  /** Available relay options */
  availableRelays: RelayInfo[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const APP_CONFIG_STORAGE_KEY = 'nostr:app-config';

interface AppProviderProps {
  children: ReactNode;
  /** Default theme for the application */
  defaultTheme?: Theme;
}

export function AppProvider({ 
  children, 
  defaultTheme = 'system'
}: AppProviderProps) {
  // App configuration state with localStorage persistence
  const [config, setConfig] = useLocalStorage(
    APP_CONFIG_STORAGE_KEY,
    { ...DEFAULT_CONFIG, theme: defaultTheme }
  );
/**
 * Hook to apply theme changes to the document root
 */
function useThemeEffect(theme: Theme) {
  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
        .matches
        ? 'dark'
        : 'light';

      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme]);

  // Handle system theme changes when theme is set to "system"
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');
      
      const systemTheme = mediaQuery.matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);
}
  // Apply theme effects to document
  useThemeEffect(config.theme);

  // Generic config updater with callback pattern
  const updateConfig = (updater: (currentConfig: AppConfig) => AppConfig) => {
    setConfig(updater);
  };

  const appContextValue: AppContextType = {
    config,
    updateConfig,
    availableRelays: RELAY_OPTIONS,
  };

  return React.createElement(
    AppContext.Provider,
    { value: appContextValue },
    children
  );
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

/**
 * Hook to get and set the active theme
 * @returns Theme context with theme and setTheme
 */
export function useTheme() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within an AppProvider');
  }
  return {
    theme: context.config.theme,
    setTheme: (theme: Theme) => context.updateConfig(config => ({ ...config, theme })),
  };
}

/**
 * Hook to apply theme changes to the document root
 */
export function useThemeEffect(theme: Theme) {
  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
        .matches
        ? 'dark'
        : 'light';

      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme]);

  // Handle system theme changes when theme is set to "system"
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');
      
      const systemTheme = mediaQuery.matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);
}