import { createContext, useContext, useCallback, useMemo, useState } from 'react'
import { seedShipments, demoUser } from '../lib/mockData'
import { loginRequest, signupRequest, logoutRequest, trackShipmentRequest } from '../lib/api'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [user, setUser] = useState(null)
  const [shipments, setShipments] = useState(seedShipments)

  const loggedIn = !!user

  const login = useCallback(async ({ email, password }) => {
    const loggedInUser = await loginRequest({ email, password })
    setUser(loggedInUser)
    return loggedInUser
  }, [])

  const loginDemo = useCallback(async () => {
    
    setUser(demoUser)
    return demoUser
  }, [])

  const signup = useCallback(async (payload) => {
    const newUser = await signupRequest(payload)
    setUser(newUser)
    return newUser
  }, [])

  const logout = useCallback(async () => {
    await logoutRequest()
    setUser(null)
  }, [])

  const addShipment = useCallback((shipment) => {
    setShipments((prev) => [shipment, ...prev])
  }, [])

  const findShipment = useCallback(
    async (trackingNumber) => trackShipmentRequest(trackingNumber, shipments),
    [shipments]
  )

  const value = useMemo(
    () => ({ user, loggedIn, shipments, login, loginDemo, signup, logout, addShipment, findShipment }),
    [user, loggedIn, shipments, login, loginDemo, signup, logout, addShipment, findShipment]
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp() must be used inside <AppProvider>')
  return ctx
}
