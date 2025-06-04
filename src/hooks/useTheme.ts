import { type Theme } from "@/contexts/AppContext";
import { useAppConfig } from "@/hooks/useAppConfig";

/**
 * Hook to get and set the active theme
 * @returns Theme context with theme and setTheme
 */
export function useTheme(): { theme: Theme; setTheme: (theme: Theme) => void } {
  const { config, updateConfig } = useAppConfig();

  return {
    theme: config.theme,
    setTheme: (theme: Theme) => {
      updateConfig((currentConfig) => ({
        ...currentConfig,
        theme,
      }));
    }
  }
}