import { createContext, useContext } from "react";

export type DemoRole = "manager" | "collector" | "generator" | "fieldworker" | "moderator";

export interface DemoContextValue {
  isDemo: true;
  role: DemoRole;
  resetDemo: () => void;
}

export const DemoContext = createContext<DemoContextValue | null>(null);

/**
 * Returns demo context if inside DemoProvider, null otherwise.
 * Use this to conditionally adjust behaviour in demo mode.
 *
 * Usage:
 *   const demo = useDemo();
 *   if (demo?.isDemo) { ... }
 */
export function useDemo(): DemoContextValue | null {
  return useContext(DemoContext);
}
