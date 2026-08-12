import { seedShipments, seedQuotes, routeAnalytics, demoUser, adminUser, agentUser, RATES } from './mockData'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''
export const MOCK_MODE = !API_BASE

const TOKEN_KEY = 'portline_access_token'
const QUOTES_STORAGE_KEY = 'portline_saved_quotes'
const USERS_STORAGE_KEY = 'portline_registered_users'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}
function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

function delay(ms = 30) {
  return new Promise((resolve) => setTimeout(resolve, Math.min(ms, 50)))
}

async function apiFetch(path, options = {}) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 6000)

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
        ...(options.headers || {}),
      },
    })
    clearTimeout(timeoutId)
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.detail || `Request failed (${res.status})`)
    }
    return res.status === 204 ? null : res.json()
  } catch (err) {
    clearTimeout(timeoutId)
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. Please check your backend connection.')
    }
    throw err
  }
}

// ---------------- Auth ----------------

export const BUILTIN_USERS = {
  'admin@portline.in': { password: 'admin123', user: adminUser },
  'agent@portline.in': { password: 'agent123', user: agentUser },
  'demo@portline.in': { password: 'demo123', user: demoUser },
  'ravi@sharmatextiles.in': { password: 'demo123', user: demoUser },
}

function getStoredUsers() {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function getMockUsers() {
  const stored = getStoredUsers()
  return { ...stored, ...BUILTIN_USERS }
}

function saveMockUser(email, userData) {
  try {
    const stored = getStoredUsers()
    stored[email.trim().toLowerCase()] = userData
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(stored))
  } catch (err) {
    console.error('Failed to save mock user:', err)
  }
}

export async function loginRequest({ email, password }) {
  const cleanEmail = (email || '').trim().toLowerCase()
  const cleanPw = (password || '').trim()
  if (!cleanEmail || !cleanPw) throw new Error('Email and password are required')

  if (MOCK_MODE) {
    await delay(30)

    // 1. Direct built-in account check
    if (BUILTIN_USERS[cleanEmail]) {
      const target = BUILTIN_USERS[cleanEmail]
      if (cleanPw === target.password || cleanPw.toLowerCase() === target.password.toLowerCase()) {
        setToken('mock_jwt_token_' + Date.now())
        return target.user
      } else {
        throw new Error('Invalid password. Please check your credentials.')
      }
    }

    // 2. User accounts saved from signup in localStorage (case-insensitive & whitespace-tolerant)
    const storedUsers = getStoredUsers()
    const foundKey = Object.keys(storedUsers).find(k => k.trim().toLowerCase() === cleanEmail)
    const found = foundKey ? storedUsers[foundKey] : null
    
    if (found) {
      const storedPw = (typeof found === 'object' ? (found.password || found.user?.password || '') : '').trim()
      const userObj = found.user || found
      
      if (storedPw && storedPw !== cleanPw && storedPw.toLowerCase() !== cleanPw.toLowerCase()) {
        throw new Error('Invalid password. Please check your credentials.')
      }
      setToken('mock_jwt_token_' + Date.now())
      return userObj
    }

    throw new Error('No account found with this email. Please sign up first.')
  }

  const data = await apiFetch('/api/v1/auth/login/', {
    method: 'POST',
    body: JSON.stringify({ email: cleanEmail, password: cleanPw }),
  })
  setToken(data.access)
  return data.user
}

export async function signupRequest({ name, company, email, password }) {
  const cleanEmail = (email || '').trim().toLowerCase()
  const cleanPw = (password || '').trim()
  if (!cleanEmail || !cleanPw) throw new Error('Email and password are required')

  if (MOCK_MODE) {
    await delay(30)
    
    const users = getMockUsers()
    if (users[cleanEmail]) {
      throw new Error('An account with this email address already exists.')
    }

    const newUser = {
      name: (name || 'New User').trim(),
      company: (company || 'Company').trim(),
      email: cleanEmail,
      role: 'customer',
      phone: '+91 98765 43210',
      since: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    }

    saveMockUser(cleanEmail, { password: cleanPw, user: newUser })
    setToken('mock_jwt_token_' + Date.now())
    return newUser
  }

  const data = await apiFetch('/api/v1/auth/register/', {
    method: 'POST',
    body: JSON.stringify({ name: (name || '').trim(), company: (company || '').trim(), email: cleanEmail, password: cleanPw }),
  })
  setToken(data.access)
  return data.user
}

export function logoutRequest() {
  clearToken()
  return Promise.resolve()
}

// ---------------- Shipments ----------------

export async function fetchShipments(email) {
  if (MOCK_MODE) {
    await delay(20)
    const emailLower = (email || '').toLowerCase().trim()
    if (!emailLower || emailLower === 'ravi@sharmatextiles.in' || emailLower === 'demo@portline.in') {
      return seedShipments
    }
    try {
      const raw = localStorage.getItem(`portline_shipments_${emailLower}`)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }
  const query = email ? `?email=${encodeURIComponent(email)}` : ''
  return apiFetch(`/api/v1/shipments/${query}`)
}

export async function createShipmentRequest(payload) {
  if (MOCK_MODE) {
    await delay(30)
    return { ...payload, date: new Date().toISOString().slice(0, 10) }
  }
  return apiFetch('/api/v1/shipments/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function trackShipmentRequest(trackingNumber, localShipments = []) {
  if (MOCK_MODE) {
    await delay(30)
    const all = [...localShipments, ...seedShipments]
    return all.find((s) => s.tn.toLowerCase() === trackingNumber.trim().toLowerCase()) || null
  }
  try {
    return await apiFetch(`/api/v1/shipments/track/${encodeURIComponent(trackingNumber.trim())}/`)
  } catch {
    return null
  }
}

export function getRateTable() {
  return RATES
}

// ---------------- Quotations & Intelligence ----------------

export function getSavedQuotes() {
  try {
    const raw = localStorage.getItem(QUOTES_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export async function saveQuote(quote) {
  const existing = getSavedQuotes()
  const updated = [quote, ...existing.filter(q => q.id !== quote.id)]
  localStorage.setItem(QUOTES_STORAGE_KEY, JSON.stringify(updated))
  if (!MOCK_MODE) {
    try {
      await apiFetch('/api/v1/quotes/', {
        method: 'POST',
        body: JSON.stringify(quote)
      })
    } catch {
      // fallback saved locally
    }
  }
  return quote
}

export async function fetchQuotes(email) {
  if (MOCK_MODE) {
    await delay(20)
    const local = getSavedQuotes()
    return [...local, ...seedQuotes]
  }
  const query = email ? `?email=${encodeURIComponent(email)}` : ''
  return apiFetch(`/api/v1/quotes/${query}`)
}

export async function fetchQuoteById(id) {
  if (MOCK_MODE) {
    await delay(20)
    const all = [...getSavedQuotes(), ...seedQuotes]
    return all.find(q => q.id.toUpperCase() === (id || '').toUpperCase()) || seedQuotes[0]
  }
  return apiFetch(`/api/v1/quotes/${id}/`)
}

export async function fetchRouteAnalytics() {
  if (MOCK_MODE) {
    await delay(20)
    return routeAnalytics
  }
  return apiFetch('/api/v1/routes/analytics/')
}

export async function sendContactMessage(payload) {
  if (MOCK_MODE) {
    await delay(30)
    return { ok: true }
  }
  return apiFetch('/api/v1/contact/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

// Fetch ALL quotes (for admin panel — all users)
export async function fetchAllQuotes() {
  if (MOCK_MODE) {
    await delay(20)
    const local = getSavedQuotes()
    return [...local, ...seedQuotes]
  }
  return apiFetch('/api/v1/quotes/')
}

// Agent approves or rejects a quote
export async function agentActionOnQuote(quoteId, action, comment, agentUser) {
  const AGENT_ACTIONS_KEY = 'portline_agent_actions'
  const reviewObj = {
    status: action, // 'approved' | 'rejected' | 'pending'
    comment: comment || '',
    agent_name: agentUser?.name || 'Agent',
    agent_email: agentUser?.email || '',
    reviewed_at: new Date().toISOString()
  }

  if (MOCK_MODE) {
    await delay(300)
    // Update saved quotes in localStorage
    const all = getSavedQuotes()
    const updated = all.map(q => q.id === quoteId ? { ...q, agent_review: reviewObj } : q)
    localStorage.setItem(QUOTES_STORAGE_KEY, JSON.stringify(updated))
    // Also track in a separate agent actions store
    try {
      const raw = localStorage.getItem(AGENT_ACTIONS_KEY)
      const actions = raw ? JSON.parse(raw) : {}
      actions[quoteId] = reviewObj
      localStorage.setItem(AGENT_ACTIONS_KEY, JSON.stringify(actions))
    } catch {}
    return { ok: true, quoteId, review: reviewObj }
  }

  return apiFetch(`/api/v1/quotes/${quoteId}/action/`, {
    method: 'POST',
    body: JSON.stringify({ action, comment, agent_email: agentUser?.email }),
  })
}

// Get all agent actions from localStorage (mock mode)
export function getAgentActions() {
  try {
    const raw = localStorage.getItem('portline_agent_actions')
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}
