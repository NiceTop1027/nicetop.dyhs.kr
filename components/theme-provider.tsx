"use client"

import { createContext, useContext, type ReactNode } from "react"

type ThemeProviderProps = {
  children: ReactNode
}

const ThemeContext = createContext({ theme: "dark" })

export function ThemeProvider({ children }: ThemeProviderProps) {
  // 고정된 다크 테마 사용
  return <ThemeContext.Provider value={{ theme: "dark" }}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)
