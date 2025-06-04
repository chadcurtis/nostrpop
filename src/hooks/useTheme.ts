import { useTheme as useThemeFromProvider } from "@/components/AppProvider";

/** Hook to get and set the active theme. */
export function useTheme() {
  return useThemeFromProvider();
}