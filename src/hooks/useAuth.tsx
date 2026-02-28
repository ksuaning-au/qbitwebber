import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { qbitClient } from '@/lib/api'

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  host: string
  username: string
  login: (host: string, username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [host, setHost] = useState('')

  useEffect(() => {
    const savedHost = localStorage.getItem('qbit_host')
    const savedUser = localStorage.getItem('qbit_user')
    const savedPass = localStorage.getItem('qbit_pass')
    
    if (savedHost && savedUser && savedPass) {
      setHost(savedHost)
      qbitClient.setCredentials(savedHost, savedUser, savedPass)
      qbitClient.login()
        .then((success) => {
          setIsAuthenticated(success)
          if (!success) {
            localStorage.removeItem('qbit_pass')
          }
        })
        .finally(() => setIsLoading(false))
    } else {
      setIsLoading(false)
    }
  }, [])

  const login = async (newHost: string, newUsername: string, password: string) => {
    setIsLoading(true)
    try {
      qbitClient.setCredentials(newHost, newUsername, password)
      const success = await qbitClient.login()
      if (success) {
        localStorage.setItem('qbit_pass', password)
        setHost(newHost)
        setIsAuthenticated(true)
      } else {
        throw new Error('Login failed')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    await qbitClient.logout()
    localStorage.removeItem('qbit_pass')
    setIsAuthenticated(false)
  }

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      isLoading, 
      host,
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
