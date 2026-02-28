import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
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
    const savedUser = localStorage.getItem('qbit_user')
    const savedPass = localStorage.getItem('qbit_pass')
    
    if (savedUser && savedPass) {
      qbitClient.setCredentials(savedUser, savedPass)
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

  const login = async (newUsername: string, password: string) => {
    setIsLoading(true)
    try {
      qbitClient.setCredentials(newUsername, password)
      const success = await qbitClient.login()
      if (success) {
        localStorage.setItem('qbit_pass', password)
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
