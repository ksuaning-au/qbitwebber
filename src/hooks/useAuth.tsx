import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { qbitClient } from '@/lib/api'

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  username: string
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Return to the login screen when the session expires.
    qbitClient.onUnauthorized(() => setIsAuthenticated(false))

    // Reuse an existing qBittorrent session (HttpOnly cookie) instead of
    // re-sending stored credentials.
    qbitClient.checkSession()
      .then(setIsAuthenticated)
      .finally(() => setIsLoading(false))

    return () => qbitClient.onUnauthorized(null)
  }, [])

  // Note: does not toggle isLoading – that would unmount the login form
  // and swallow the error message. The form tracks its own submit state.
  const login = async (newUsername: string, password: string) => {
    qbitClient.setCredentials(newUsername, password)
    const success = await qbitClient.login()
    if (!success) {
      throw new Error('Login failed – check username and password')
    }
    setIsAuthenticated(true)
  }

  const logout = async () => {
    try {
      await qbitClient.logout()
    } finally {
      setIsAuthenticated(false)
    }
  }

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      isLoading,
      username: qbitClient.getUsername(),
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
