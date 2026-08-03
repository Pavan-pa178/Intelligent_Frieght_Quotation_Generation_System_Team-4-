import { seedShipments, demoUser, RATES } from './mockData'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''
export const MOCK_MODE = !API_BASE

const TOKEN_KEY = 'portline_access_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}
function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      ...(options.headers || {}),
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || `Request failed (${res.status})`)
  }
  return res.status === 204 ? null : res.json()
}

// ---------------- Auth ----------------

export async function loginRequest({ email, password }) {
  if (MOCK_MODE) {
    await delay(350)
    if (!email || !password) throw new Error('Email and password are required')
    return { ...demoUser, email }
  }
  const data = await apiFetch('/api/auth/login/', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  setToken(data.access)
  return data.user
}

export async function signupRequest({ name, company, email, password }) {
  if (MOCK_MODE) {
    await delay(350)
    return { name: name || 'New User', company: company || '—', email: email || 'you@company.com', phone: '—', since: 'July 2026' }
  }
  const data = await apiFetch('/api/auth/register/', {
    method: 'POST',
    body: JSON.stringify({ name, company, email, password }),
  })
  setToken(data.access)
  return data.user
}

export function logoutRequest() {
  clearToken()
  return Promise.resolve()
}

// ---------------- Shipments ----------------

export async function fetchShipments() {
  if (MOCK_MODE) {
    await delay(200)
    return seedShipments
  }
  return apiFetch('/api/shipments/')
}

export async function createShipmentRequest(payload) {
  if (MOCK_MODE) {
    await delay(500)
    return { ...payload, date: new Date().toISOString().slice(0, 10) }
  }
  return apiFetch('/api/shipments/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function trackShipmentRequest(trackingNumber, localShipments = []) {
  if (MOCK_MODE) {
    await delay(250)
    const all = [...localShipments, ...seedShipments]
    return all.find((s) => s.tn.toLowerCase() === trackingNumber.trim().toLowerCase()) || null
  }
  try {
    return await apiFetch(`/api/tracking/${encodeURIComponent(trackingNumber.trim())}/`)
  } catch {
    return null
  }
}

// ---------------- Contact ----------------

export async function sendContactMessage(payload) {
  if (MOCK_MODE) {
    await delay(400)
    return { ok: true }
  }
  return apiFetch('/api/contact/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

// ---------------- Pricing (would eventually call the ML/pricing model) ----------------

export function getRateTable() {
  // In production this could be GET /api/rates/ so the ML/Data team's
  // pricing model can update rates without a frontend redeploy.
  return RATES
}
