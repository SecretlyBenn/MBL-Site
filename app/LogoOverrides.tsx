"use client";

import { createContext, useContext } from "react";

/**
 * Uploaded logos, handed down from the root layout.
 *
 * TeamLogo is drawn inside interactive tables as well as plain pages, so it
 * cannot look anything up itself. The layout reads the (tiny) list of uploads
 * once per request and every logo on the page reads it from here.
 */
const LogoOverridesContext = createContext<Record<string, string>>({});

export function LogoOverridesProvider({
  value,
  children,
}: {
  value: Record<string, string>;
  children: React.ReactNode;
}) {
  return <LogoOverridesContext.Provider value={value}>{children}</LogoOverridesContext.Provider>;
}

export function useLogoOverrides() {
  return useContext(LogoOverridesContext);
}
