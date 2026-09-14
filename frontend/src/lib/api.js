import { seedShipments, seedQuotes, routeAnalytics, demoUser, globalShipperUser, adminUser, agentUser, customsOfficerUser, agentOperatorUser, managerUser, customerDemoUser, adminDemoUser, agentDemoUser, customsDemoUser, agentOperatorDemoUser, managerDemoUser, RATES, DEMO_QUOTES, DEMO_EMAIL_LIST } from './mockData'

const API_BASE = import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app') ? 'https://freightquote-api.onrender.com' : '')
export const MOCK_MODE = false

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
  const isHeavy = path.includes('/generate-quote/') || path.includes('/ml/') || path.includes('/weather/') || path.includes('/customs/') || path.includes('/risk/')
  const timeoutMs = options.timeout || (isHeavy ? 35000 : 25000)
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  const isAuthEndpoint = path.includes('/auth/login/') || path.includes('/auth/register/')
  const token = !isAuthEndpoint && !options.skipAuth ? getToken() : null

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    })
    clearTimeout(timeoutId)
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      if (res.status === 401 && (body.detail?.includes('token') || body.code === 'token_not_valid')) {
        clearToken()
      }
      throw new Error(body.detail || `Request failed (${res.status})`)
    }
    return res.status === 204 ? null : res.json()
  } catch (err) {
    clearTimeout(timeoutId)
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. Please check your backend connection.')
    }
    if (err.name === 'TypeError' || (err.message && err.message.includes('fetch'))) {
      throw new Error('Failed to connect to backend server. Operating in offline mode.')
    }
    throw err
  }
}

// ---------------- Auth ----------------

// Built-in system profiles for demo/offline mode — NO passwords stored in source
export const BUILTIN_USERS = {
  // Dedicated Isolated Demo Accounts
  'customer.demo@portline.in': { user: customerDemoUser },
  'admin.demo@portline.in': { user: adminDemoUser },
  'agent.demo@portline.in': { user: agentDemoUser },
  'customs.demo@portline.in': { user: customsDemoUser },
  'agentop.demo@portline.in': { user: agentOperatorDemoUser },
  'manager.demo@portline.in': { user: managerDemoUser },
  // Real Accounts
  'admin@portline.in': { user: adminUser },
  'agent@portline.in': { user: agentUser },
  'customs@portline.in': { user: customsOfficerUser },
  'agentop@portline.in': { user: agentOperatorUser },
  'manager@portline.in': { user: managerUser },
  'demo@portline.in': { user: customerDemoUser },
  'ravi@sharmatextiles.in': { user: demoUser },
}

// Credentials are read ONLY from environment variables (frontend/.env.local — gitignored)
// If env vars are not set, demo logins will not work in offline mode
const ENV_PASS = {
  'customer.demo@portline.in': import.meta.env.VITE_DEMO_CUSTOMER_PASS,
  'admin.demo@portline.in': import.meta.env.VITE_DEMO_ADMIN_PASS,
  'agent.demo@portline.in': import.meta.env.VITE_DEMO_AGENT_PASS,
  'agentop.demo@portline.in': import.meta.env.VITE_DEMO_AGENTOP_PASS || import.meta.env.VITE_DEMO_AGENT_PASS,
  'customs.demo@portline.in': import.meta.env.VITE_DEMO_CUSTOMS_PASS,
  'manager.demo@portline.in': import.meta.env.VITE_DEMO_MANAGER_PASS,
  'admin@portline.in': import.meta.env.VITE_DEMO_ADMIN_PASS,
  'agent@portline.in': import.meta.env.VITE_DEMO_AGENT_PASS,
  'agentop@portline.in': import.meta.env.VITE_DEMO_AGENTOP_PASS || import.meta.env.VITE_DEMO_AGENT_PASS,
  'customs@portline.in': import.meta.env.VITE_DEMO_CUSTOMS_PASS,
  'manager@portline.in': import.meta.env.VITE_DEMO_MANAGER_PASS,
  'demo@portline.in': import.meta.env.VITE_DEMO_CUSTOMER_PASS,
  'ravi@sharmatextiles.in': import.meta.env.VITE_DEMO_CUSTOMER_PASS,
}

function verifyBuiltinPassword(email, input) {
  const expected = ENV_PASS[email.trim().toLowerCase()]
  if (!expected) return false
  const cleanExp = expected.trim().toLowerCase().replace('.', '').replace('_', '')
  const cleanIn = (input || '').trim().toLowerCase().replace('.', '').replace('_', '')
  return input === expected || input.toLowerCase() === expected.toLowerCase() || cleanIn === cleanExp
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

  // Helper for local authentication check
  const tryLocalAuth = () => {
    // 1. Direct built-in account check
    if (BUILTIN_USERS[cleanEmail]) {
      if (verifyBuiltinPassword(cleanEmail, cleanPw)) {
        setToken('mock_jwt_token_' + Date.now())
        return BUILTIN_USERS[cleanEmail].user
      } else {
        throw new Error('Invalid password. Please check your credentials.')
      }
    }

    // 2. User accounts saved from signup in localStorage
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

    if (backendError && backendError.message && !backendError.message.includes('fetch') && !backendError.message.includes('Network') && !backendError.message.includes('timed out')) {
      throw backendError
    }

    throw new Error('No account found with this email. Please check your credentials or create an account.')
  }

  // 1. Try backend authentication first
  try {
    const data = await apiFetch('/api/v1/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ email: cleanEmail, password: cleanPw }),
      skipAuth: true,
    })
    setToken(data.access)
    saveMockUser(cleanEmail, { password: cleanPw, user: data.user })
    return data.user
  } catch (err) {
    // 2. Fallback only to registered/built-in accounts, NEVER auto-create during login
    return tryLocalAuth(err)
  }
}

export async function signupRequest({ name, company, email, password }) {
  const cleanEmail = (email || '').trim().toLowerCase()
  const cleanPw = (password || '').trim()
  if (!cleanEmail || !cleanPw) throw new Error('Email and password are required')

  const createLocalUser = () => {
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

  if (MOCK_MODE) {
    await delay(30)
    return createLocalUser()
  }

  try {
    const data = await apiFetch('/api/v1/auth/register/', {
      method: 'POST',
      body: JSON.stringify({ name: (name || '').trim(), company: (company || '').trim(), email: cleanEmail, password: cleanPw }),
      skipAuth: true,
    })
    setToken(data.access)
    saveMockUser(cleanEmail, { password: cleanPw, user: data.user })
    return data.user
  } catch (err) {
    // If backend is unreachable, times out, or has token error, fallback to local registration
    if (err.message && (err.message.includes('token') || err.message.includes('timed out') || err.message.includes('Failed to fetch') || err.message.includes('network') || err.message.includes('connection'))) {
      clearToken()
      return createLocalUser()
    }
    throw err
  }
}

export function logoutRequest() {
  clearToken()
  return Promise.resolve()
}

// ---------------- User Management (Admin) ----------------

export async function fetchAllUsers() {
  let backendUsers = []
  try {
    const res = await apiFetch('/api/v1/auth/users/')
    if (res && Array.isArray(res.data)) {
      backendUsers = res.data
    } else if (Array.isArray(res)) {
      backendUsers = res
    }
  } catch (err) {
    console.warn('Backend users endpoint error, falling back to local store:', err.message)
  }

  const storedUsers = getStoredUsers()
  const usersMap = new Map()

  // 1. Built-in defaults
  Object.values(BUILTIN_USERS).forEach((b, idx) => {
    const u = b.user
    const em = u.email.toLowerCase()
    usersMap.set(em, {
      id: `USR-00${idx + 1}`,
      name: u.name,
      email: em,
      company: u.company,
      role: u.role || 'customer',
      phone: u.phone || '',
      active: true,
      since: u.since || 'March 2023',
      created: u.since || 'System Default'
    })
  })

  // 2. Local registered / admin-created users
  Object.entries(storedUsers).forEach(([em, data], idx) => {
    const cleanEm = em.toLowerCase()
    const u = data.user || data
    usersMap.set(cleanEm, {
      id: u.id || `USR-01${idx + 5}`,
      name: u.name || cleanEm.split('@')[0],
      email: cleanEm,
      company: u.company || 'Independent Shipper',
      role: u.role || 'customer',
      phone: u.phone || '',
      active: u.active !== false,
      since: u.since || 'Recent',
      created: u.created || (u.since ? u.since : 'Registered User')
    })
  })

  // 3. Backend synchronized users
  backendUsers.forEach((bu, idx) => {
    const em = (bu.email || bu.username || '').toLowerCase()
    if (em) {
      const existing = usersMap.get(em) || {}
      usersMap.set(em, {
        id: String(bu.id || existing.id || `USR-02${idx + 1}`),
        name: bu.name || existing.name || em.split('@')[0],
        email: em,
        company: bu.company || existing.company || 'Enterprise Shipper',
        role: bu.role || existing.role || 'customer',
        phone: bu.phone || existing.phone || '',
        active: bu.active !== undefined ? bu.active : (existing.active !== false),
        since: existing.since || (bu.created_at ? new Date(bu.created_at).toLocaleDateString() : 'Active'),
        created: bu.created_at ? new Date(bu.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : (existing.created || 'Live Synced')
      })
    }
  })

  return Array.from(usersMap.values())
}

export async function adminCreateUser({ name, company, email, password, role = 'customer', phone = '' }) {
  const cleanEmail = (email || '').trim().toLowerCase()
  const cleanPw = (password || '').trim()
  if (!cleanEmail || !cleanPw) throw new Error('Email and password are required')

  const newUserObj = {
    id: `USR-${Date.now().toString().slice(-4)}`,
    name: (name || cleanEmail.split('@')[0]).trim(),
    company: (company || 'Company').trim(),
    email: cleanEmail,
    role: role.toLowerCase(),
    phone: phone.trim(),
    active: true,
    since: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    created: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  // 1. Save locally for instant offline/Vercel persistence
  saveMockUser(cleanEmail, { password: cleanPw, user: newUserObj })

  // 2. Post to live backend
  try {
    await apiFetch('/api/v1/auth/users/', {
      method: 'POST',
      body: JSON.stringify({
        name: newUserObj.name,
        company: newUserObj.company,
        email: cleanEmail,
        password: cleanPw,
        role: newUserObj.role,
        phone: newUserObj.phone
      })
    })
  } catch (err) {
    console.warn('Backend user creation offline fallback:', err.message)
  }

  return newUserObj
}

export async function adminUpdateUser(email, patch = {}) {
  const cleanEmail = (email || '').trim().toLowerCase()
  const stored = getStoredUsers()
  if (stored[cleanEmail]) {
    stored[cleanEmail].user = { ...(stored[cleanEmail].user || stored[cleanEmail]), ...patch }
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(stored))
  } else if (BUILTIN_USERS[cleanEmail]) {
    BUILTIN_USERS[cleanEmail].user = { ...BUILTIN_USERS[cleanEmail].user, ...patch }
    saveMockUser(cleanEmail, { user: BUILTIN_USERS[cleanEmail].user })
  }

  try {
    await apiFetch(`/api/v1/auth/users/${cleanEmail}/`, {
      method: 'PATCH',
      body: JSON.stringify(patch)
    })
  } catch (err) {
    console.warn('Backend patch user error:', err.message)
  }

  return { success: true }
}

export async function adminDeleteUser(email) {
  const cleanEmail = (email || '').trim().toLowerCase()
  const stored = getStoredUsers()
  delete stored[cleanEmail]
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(stored))

  try {
    await apiFetch(`/api/v1/auth/users/${cleanEmail}/`, {
      method: 'DELETE'
    })
  } catch (err) {
    console.warn('Backend delete user error:', err.message)
  }

  return { success: true }
}

export async function updateUserProfile(payload) {
  const { current_email, email, old_password, new_password, name, company, phone } = payload
  const cleanCurrentEmail = (current_email || '').trim().toLowerCase()
  const cleanNewEmail = (email || current_email || '').trim().toLowerCase()

  // 1. Try backend update first
  let backendUser = null
  try {
    const res = await apiFetch('/api/v1/auth/profile/update/', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    if (res && res.user) {
      backendUser = res.user
    }
  } catch (err) {
    console.warn('Backend profile update note:', err.message)
    // If backend returns a validation error (like incorrect old password), propagate it
    if (err.message && (err.message.includes('password') || err.message.includes('already exists') || err.message.includes('required'))) {
      throw err
    }
  }

  // 2. Update local storage and cached accounts
  const updatedUserObj = {
    name: name || '',
    company: company || '',
    phone: phone || '',
    email: cleanNewEmail,
    ...(backendUser || {})
  }

  // Update user profile in BUILTIN_USERS (profile data only, no password stored in source)
  if (BUILTIN_USERS[cleanCurrentEmail]) {
    const existing = BUILTIN_USERS[cleanCurrentEmail]
    const updatedUser = { ...existing.user, ...updatedUserObj }
    if (cleanNewEmail !== cleanCurrentEmail) {
      delete BUILTIN_USERS[cleanCurrentEmail]
      BUILTIN_USERS[cleanNewEmail] = { user: updatedUser }
    } else {
      BUILTIN_USERS[cleanCurrentEmail] = { user: updatedUser }
    }
  }

  // Update in localStorage USERS_STORAGE_KEY
  try {
    const stored = getStoredUsers()
    if (stored[cleanCurrentEmail]) {
      const existing = stored[cleanCurrentEmail]
      const updatedUser = { ...(existing.user || existing), ...updatedUserObj }
      const updatedPw = new_password || existing.password
      delete stored[cleanCurrentEmail]
      stored[cleanNewEmail] = { password: updatedPw, user: updatedUser }
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(stored))
    } else {
      stored[cleanNewEmail] = { password: new_password || '', user: updatedUserObj }
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(stored))
    }
  } catch {}

  // Update in portline_user_profile
  try {
    const raw = localStorage.getItem('portline_user_profile')
    if (raw) {
      const current = JSON.parse(raw)
      const merged = { ...current, ...updatedUserObj }
      localStorage.setItem('portline_user_profile', JSON.stringify(merged))
    }
  } catch {}

  return backendUser || updatedUserObj
}

// ---------------- Shipments ----------------

export function getDeletedShipmentIds() {
  try {
    const raw = localStorage.getItem('portline_deleted_shipment_ids')
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export async function fetchShipments(email = '') {
  const deletedShipments = new Set(getDeletedShipmentIds().map(id => String(id).trim().toUpperCase()))
  const isCleared = localStorage.getItem('portline_shipments_cleared') === 'true'

  const getLocalShipments = () => {
    if (isCleared) return []
    const list = []
    const seen = new Set()
    const targetEmail = (email || '').trim().toLowerCase()

    try {
      if (targetEmail && targetEmail !== 'customer.demo@portline.in' && targetEmail !== 'demo@portline.in' && targetEmail !== 'admin@portline.in') {
        const raw = localStorage.getItem(`portline_shipments_${targetEmail}`)
        if (raw) {
          const parsed = JSON.parse(raw)
          if (Array.isArray(parsed)) list.push(...parsed)
        }
      } else {
        // Collect from all user keys
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i)
          if (k && (k.startsWith('portline_shipments_') || k === 'portline_customer_shipments')) {
            try {
              const raw = localStorage.getItem(k)
              if (raw) {
                const arr = JSON.parse(raw)
                if (Array.isArray(arr)) {
                  for (const s of arr) {
                    const idKey = (s.tn || s.id || s.shipment_id || '').toUpperCase()
                    if (idKey && !seen.has(idKey) && !deletedShipments.has(idKey)) {
                      seen.add(idKey)
                      list.push(s)
                    }
                  }
                }
              }
            } catch {}
          }
        }
      }
    } catch {}

    return list.filter(s => {
      const idKey = (s.tn || s.id || s.shipment_id || '').toUpperCase()
      return !deletedShipments.has(idKey)
    })
  }

  if (MOCK_MODE) {
    await delay(20)
    const local = getLocalShipments()
    const allQuotes = getSavedQuotes()
    return local.map(s => ({
      ...s,
      status: resolveEffectiveShipmentStatus(s, allQuotes),
      cost: resolveEffectiveShipmentCost(s, allQuotes) || s.cost
    }))
  }
  const query = email ? `?email=${encodeURIComponent(email)}` : ''
  try {
    const res = await apiFetch(`/api/v1/shipments/${query}`)
    const allQuotes = getSavedQuotes()
    if (Array.isArray(res)) {
      const validBackend = res.filter(s => {
        const idKey = (s.tn || s.id || s.shipment_id || '').toUpperCase()
        return !deletedShipments.has(idKey)
      })
      if (isCleared && validBackend.length === 0) {
        return []
      }
      const local = getLocalShipments()
      const seen = new Set(validBackend.map(s => (s.tn || s.id || s.shipment_id || '').toUpperCase()))
      const extras = local.filter(s => {
        const idKey = (s.tn || s.id || s.shipment_id || '').toUpperCase()
        return idKey && !seen.has(idKey) && !deletedShipments.has(idKey)
      })
      return [...validBackend, ...extras].map(s => ({
        ...s,
        status: resolveEffectiveShipmentStatus(s, allQuotes),
        cost: resolveEffectiveShipmentCost(s, allQuotes) || s.cost
      }))
    }
    return getLocalShipments().map(s => ({
      ...s,
      status: resolveEffectiveShipmentStatus(s, allQuotes),
      cost: resolveEffectiveShipmentCost(s, allQuotes) || s.cost
    }))
  } catch {
    const allQuotes = getSavedQuotes()
    return getLocalShipments().map(s => ({
      ...s,
      status: resolveEffectiveShipmentStatus(s, allQuotes),
      cost: resolveEffectiveShipmentCost(s, allQuotes) || s.cost
    }))
  }
}

export async function clearAllShipments() {
  try {
    localStorage.removeItem('portline_customer_shipments')
    const toRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && (k.startsWith('portline_shipments_') || k.startsWith('portline_shipment_'))) {
        toRemove.push(k)
      }
    }
    toRemove.forEach(k => localStorage.removeItem(k))
    localStorage.setItem('portline_shipments_cleared', 'true')
    localStorage.removeItem('portline_deleted_shipment_ids')
  } catch {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('portline_shipment_updated', { detail: { cleared: true } }))
  }

  if (!MOCK_MODE) {
    try {
      await apiFetch('/api/v1/shipments/?confirm=true', { method: 'DELETE' })
    } catch {
      // ignore
    }
  }
  return { ok: true }
}

export async function createShipmentRequest(payload) {
  try {
    localStorage.removeItem('portline_shipments_cleared')
  } catch {}
  if (MOCK_MODE) {
    await delay(30)
    return { ...payload, date: new Date().toISOString().slice(0, 10) }
  }
  return apiFetch('/api/v1/shipments/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function cancelShipmentRequest(trackingNumber, reason = 'Cancelled by customer') {
  if (MOCK_MODE) {
    await delay(30)
    return { ok: true, trackingNumber, status: 'Cancelled' }
  }
  try {
    return await apiFetch('/api/v1/shipments/' + encodeURIComponent(trackingNumber.trim()) + '/cancel/', {
      method: 'POST',
      body: JSON.stringify({ reason })
    })
  } catch {
    return { ok: true, trackingNumber, status: 'Cancelled' }
  }
}

export async function deleteShipmentRequest(trackingNumber) {
  if (!trackingNumber) return { ok: true }
  const cleanTn = trackingNumber.trim().toUpperCase()

  try {
    const deletedIds = getDeletedShipmentIds()
    if (!deletedIds.includes(cleanTn)) {
      deletedIds.push(cleanTn)
      localStorage.setItem('portline_deleted_shipment_ids', JSON.stringify(deletedIds))
    }
    // Remove from all local storage shipment keys
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && (k.startsWith('portline_shipments_') || k === 'portline_customer_shipments')) {
        try {
          const raw = localStorage.getItem(k)
          if (raw) {
            const arr = JSON.parse(raw)
            if (Array.isArray(arr)) {
              const filtered = arr.filter(s => (s.tn || s.id || s.shipment_id || '').toUpperCase() !== cleanTn)
              localStorage.setItem(k, JSON.stringify(filtered))
            }
          }
        } catch {}
      }
    }
  } catch {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('portline_shipment_updated', { detail: { trackingNumber: trackingNumber.trim(), deleted: true } }))
  }

  if (!MOCK_MODE) {
    try {
      await apiFetch('/api/v1/shipments/' + encodeURIComponent(trackingNumber.trim()) + '/', {
        method: 'DELETE'
      })
    } catch (err) {
      console.warn('Backend shipment delete notice:', err.message)
      return { ok: true }
    }
  }
  return { ok: true, trackingNumber }
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

export function getDeletedQuoteIds() {
  try {
    const raw = localStorage.getItem('portline_deleted_quote_ids')
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function getSavedQuotes() {
  try {
    const isCleared = localStorage.getItem('portline_quotes_cleared') === 'true'
    const raw = localStorage.getItem(QUOTES_STORAGE_KEY)
    const list = raw ? JSON.parse(raw) : []
    if (isCleared && list.length === 0) return []
    const deletedIds = new Set(getDeletedQuoteIds().map(id => String(id).trim().toUpperCase()))
    return list.filter(q => {
      const qid = (q.id || '').trim().toUpperCase()
      return qid && !deletedIds.has(qid)
    })
  } catch {
    return []
  }
}

export async function saveQuote(quote) {
  try {
    localStorage.removeItem('portline_quotes_cleared')
    const qid = (quote.id || '').trim().toUpperCase()
    const deleted = getDeletedQuoteIds().filter(id => id !== qid)
    localStorage.setItem('portline_deleted_quote_ids', JSON.stringify(deleted))
  } catch {}
  const existing = getSavedQuotes()
  const updated = [quote, ...existing.filter(q => q.id !== quote.id)]
  localStorage.setItem(QUOTES_STORAGE_KEY, JSON.stringify(updated))
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('portline_quote_updated', { detail: { quoteId: quote.id } }))
  }
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

export function resolveEffectiveQuoteStatus(q) {
  if (!q) return 'Quotation Pending'
  const custDec = (q.customer_decision?.status || '').toUpperCase()
  const rawStatus = (q.status || '').trim()
  const rawStatusUpper = rawStatus.toUpperCase()
  const pipeStatus = (q.pipeline_status || '').toUpperCase()
  const agentStatus = (q.agent_review?.status || '').toLowerCase()
  const customsStatus = (q.customs_review?.status || '').toLowerCase()
  const custName = q.customer_decision?.customer_name || q.customer || q.userName || 'Customer'

  // 11. Booked (Customer accepted & clicked Accept & Book Quotation)
  if (
    rawStatusUpper === 'BOOKED' ||
    pipeStatus === 'BOOKED' ||
    custDec === 'BOOKED' ||
    q.booking_confirmed === true ||
    (rawStatusUpper === 'ACCEPTED' && q.customer_decision?.is_booking_confirmation)
  ) {
    return 'Booked'
  }

  // 12. Booking declined by Customer (${customerName})
  if (
    rawStatusUpper.includes('BOOKING DECLINE') ||
    pipeStatus === 'BOOKING_DECLINED' ||
    custDec === 'DECLINED_BOOKING' ||
    (custDec === 'REJECTED' && (
      rawStatusUpper.includes('CUSTOMS') ||
      pipeStatus === 'CUSTOMS_APPROVED' ||
      customsStatus === 'approved' ||
      q.customs_review?.status === 'approved'
    ))
  ) {
    return `Booking decline by Customer (${custName})`
  }

  // 7. Rejected by Agent
  if (agentStatus === 'rejected' || rawStatusUpper === 'REJECTED BY AGENT' || pipeStatus === 'AGENT_REJECTED') {
    return 'Rejected by Agent'
  }

  // Statutory Customs Rejection
  if (customsStatus === 'rejected' || rawStatusUpper === 'REJECTED BY CUSTOMS' || pipeStatus === 'CUSTOMS_REJECTED' || q.m3_customs?.compliance_status === 'REJECTED') {
    return 'Rejected by Customs'
  }

  // 5. Revised Price Declined (Customer declined price revision)
  if (
    custDec === 'DECLINED_REVISION' ||
    rawStatusUpper.includes('REVISED PRICE DECLINED') ||
    (custDec === 'REJECTED' && (q.agent_price_edit?.revised_price > 0 || rawStatusUpper.includes('PRICE REVISED') || rawStatusUpper.includes('REVISED PRICE')))
  ) {
    return 'Revised Price Declined'
  }

  // 4. Revised Priced Accepted (Agent Approval Pending)
  // Customer accepted revised price, pending final agent sign-off
  if (
    (custDec === 'ACCEPTED' || rawStatusUpper.includes('REVISED PRICED ACCEPTED') || rawStatusUpper.includes('PRICE ACCEPTED')) &&
    Number(q.agent_price_edit?.revised_price) > 0 &&
    agentStatus !== 'approved' &&
    !rawStatusUpper.includes('APPROVED BY AGENT') &&
    !rawStatusUpper.includes('APPROVED BY CUSTOMS') &&
    pipeStatus !== 'AGENT_APPROVED' &&
    pipeStatus !== 'CUSTOMS_APPROVED'
  ) {
    return 'Revised Priced Accepted (Agent Approval Pending)'
  }

  // 3. Price Revised (Awaiting Customer Decision)
  // Agent requested price revision - awaiting customer decision
  if (
    q.agent_price_edit &&
    Number(q.agent_price_edit.revised_price) > 0 &&
    custDec !== 'ACCEPTED' &&
    custDec !== 'REJECTED' &&
    custDec !== 'DECLINED_REVISION' &&
    agentStatus !== 'approved' &&
    !rawStatusUpper.includes('APPROVED')
  ) {
    return 'Price Revised (Awaiting Customer Decision)'
  }

  // 10. Approved by Customs and Awaiting for Customer confirmation
  // CRITICAL: Evaluated BEFORE Documents Submitted & Requested so that Customs sign-off immediately clears pending docs state!
  const isCustomsApproved = Boolean(
    customsStatus === 'approved' ||
    q.customs_review?.status === 'approved' ||
    pipeStatus === 'CUSTOMS_APPROVED' ||
    rawStatusUpper === 'APPROVED BY CUSTOMS' ||
    rawStatusUpper.includes('APPROVED BY CUSTOMS AND AWAITING') ||
    (q.m3_customs?.compliance_status === 'APPROVED' && (agentStatus === 'approved' || q.agent_review?.status === 'approved'))
  )
  if (isCustomsApproved) {
    return 'Approved by Customs and Awaiting for Customer confirmation'
  }

  // 9. Documents Submitted (Pending Customs Sign-off)
  // Evaluated only if customs has NOT yet signed off
  const isDocsSubmitted = Boolean(
    !isCustomsApproved && (
      q.customs_document_request?.status === 'DOCUMENTS_SUBMITTED' ||
      rawStatusUpper.includes('DOCUMENTS SUBMITTED') ||
      rawStatusUpper.includes('DOCS_SUBMITTED') ||
      pipeStatus === 'DOCS_SUBMITTED' ||
      (q.customer_uploaded_documents && q.customer_uploaded_documents.length > 0 && q.customs_document_request?.requested_docs?.length > 0)
    )
  )
  if (isDocsSubmitted) {
    return 'Documents Submitted (Pending Customs Sign-off)'
  }

  // 8. Documents Requested by Customs
  // Evaluated only if customs has NOT signed off and documents have NOT yet been submitted
  const isDocsRequested = Boolean(
    !isCustomsApproved &&
    !isDocsSubmitted && (
      q.customs_document_request?.status === 'REQUESTED' ||
      q.customs_document_request?.status === 'PENDING_CUSTOMER_UPLOAD' ||
      rawStatusUpper.includes('DOCUMENTS REQUESTED') ||
      rawStatusUpper.includes('CUSTOMS_DOCS_REQUESTED') ||
      pipeStatus === 'CUSTOMS_DOCS_REQUESTED'
    )
  )
  if (isDocsRequested) {
    return 'Documents Requested by Customs'
  }

  // 6. Approved by Agent and Awaiting Customs Clearance
  const isAgentApproved = Boolean(
    agentStatus === 'approved' ||
    q.agent_review?.status === 'approved' ||
    pipeStatus === 'AGENT_APPROVED' ||
    rawStatusUpper === 'AGENT APPROVED' ||
    rawStatusUpper === 'APPROVED BY AGENT' ||
    rawStatusUpper.includes('APPROVED BY AGENT AND AWAITING') ||
    (rawStatusUpper === 'APPROVED' && !isCustomsApproved)
  )
  if (isAgentApproved) {
    return 'Approved by Agent and Awaiting Customs Clearance'
  }

  // 2. Agent Approval Pending (Finalised by customer, waiting for Agent review)
  if (
    q.is_finalised === true ||
    rawStatusUpper === 'AGENT APPROVAL PENDING' ||
    pipeStatus === 'AGENT_PENDING' ||
    pipeStatus === 'AGENT_APPROVAL_PENDING'
  ) {
    return 'Agent Approval Pending'
  }

  // 1. Quotation Pending (Initial state before customer clicks 'Finalise Quote')
  if (
    rawStatusUpper === 'QUOTATION PENDING' ||
    rawStatusUpper === 'QUOTED' ||
    rawStatusUpper === 'DRAFT' ||
    rawStatusUpper === 'PENDING' ||
    rawStatusUpper === 'PENDING REVIEW' ||
    !rawStatus ||
    !q.is_finalised
  ) {
    return 'Quotation Pending'
  }

  return rawStatus
}

export function resolveEffectiveShipmentStatus(s, quotes = []) {
  if (!s) return 'Quotation Pending'

  // Physical fulfillment terminal statuses take precedence once cargo is physically moving
  const rawStatus = (s.status || '').trim()
  if (
    rawStatus === 'Delivered' ||
    rawStatus === 'In transit' ||
    rawStatus === 'Out for delivery' ||
    rawStatus === 'Picked up' ||
    rawStatus === 'Customs clearance' ||
    rawStatus === 'Cancelled'
  ) {
    return rawStatus
  }

  // Look for matching quote
  const quoteId = (s.quote_id || s.quoteId || '').trim().toUpperCase()
  const shipmentTn = (s.tn || s.shipment_id || s.id || '').trim().toUpperCase()

  const allQuotes = (Array.isArray(quotes) && quotes.length > 0) ? quotes : getSavedQuotes()

  let matchingQuote = allQuotes.find(q => {
    const qid = (q.id || '').trim().toUpperCase()
    const qtn = (q.tn || q.tracking_number || '').trim().toUpperCase()
    const qShipId = (q.shipment_id || '').trim().toUpperCase()
    
    if (quoteId && (qid === quoteId || qShipId === quoteId)) return true
    if (shipmentTn && (qid === shipmentTn || qtn === shipmentTn || qShipId === shipmentTn)) return true
    return false
  })

  // Fallback: match by email + cities
  if (!matchingQuote && s.from && s.to) {
    const sEmail = (s.user_email || '').trim().toLowerCase()
    const sFromCity = (s.from || '').split(',')[0].trim().toLowerCase()
    const sToCity = (s.to || '').split(',')[0].trim().toLowerCase()

    matchingQuote = allQuotes.find(q => {
      const qEmail = (q.user_email || '').trim().toLowerCase()
      if (sEmail && qEmail && sEmail !== qEmail) return false
      const laneText = `${q.laneName || ''} ${q.laneCode || ''} ${q.city || ''}`.toLowerCase()
      return laneText.includes(sFromCity) && laneText.includes(sToCity)
    })
  }

  if (matchingQuote) {
    return resolveEffectiveQuoteStatus(matchingQuote)
  }

  return rawStatus || 'Quotation Pending'
}

export function resolveEffectiveShipmentCost(s, quotes = []) {
  if (!s) return 0
  const quoteId = (s.quote_id || s.quoteId || '').trim().toUpperCase()
  const shipmentTn = (s.tn || s.shipment_id || s.id || '').trim().toUpperCase()

  const allQuotes = (Array.isArray(quotes) && quotes.length > 0) ? quotes : getSavedQuotes()

  let matchingQuote = allQuotes.find(q => {
    const qid = (q.id || '').trim().toUpperCase()
    const qtn = (q.tn || q.tracking_number || '').trim().toUpperCase()
    const qShipId = (q.shipment_id || '').trim().toUpperCase()
    
    if (quoteId && (qid === quoteId || qShipId === quoteId)) return true
    if (shipmentTn && (qid === shipmentTn || qtn === shipmentTn || qShipId === shipmentTn)) return true
    return false
  })

  if (!matchingQuote && s.from && s.to) {
    const sEmail = (s.user_email || '').trim().toLowerCase()
    const sFromCity = (s.from || '').split(',')[0].trim().toLowerCase()
    const sToCity = (s.to || '').split(',')[0].trim().toLowerCase()

    matchingQuote = allQuotes.find(q => {
      const qEmail = (q.user_email || '').trim().toLowerCase()
      if (sEmail && qEmail && sEmail !== qEmail) return false
      const laneText = `${q.laneName || ''} ${q.laneCode || ''} ${q.city || ''}`.toLowerCase()
      return laneText.includes(sFromCity) && laneText.includes(sToCity)
    })
  }

  if (matchingQuote) {
    const revPrice = matchingQuote.agent_price_edit?.revised_price
    if (revPrice && Number(revPrice) > 0) {
      return Number(revPrice)
    }
    return Number(matchingQuote.indicativeTotal || matchingQuote.cost || s.cost || 0)
  }

  return Number(s.cost || 0)
}


export function sortQuotesByTime(list) {
  if (!Array.isArray(list)) return []
  return [...list].sort((a, b) => {
    const timeA = new Date(a.created_at || a.created || a.date || a.timestamp || 0).getTime() || 0
    const timeB = new Date(b.created_at || b.created || b.date || b.timestamp || 0).getTime() || 0
    return timeB - timeA
  })
}

export function enrichQuoteWithLocalState(q) {
  if (!q || !q.id) return q
  const normId = (q.id || '').trim().toUpperCase()
  const localQuotes = getSavedQuotes()
  const localMatch = localQuotes.find(lq => (lq.id || '').trim().toUpperCase() === normId)
  const agentActions = getAgentActions()
  const localAction = agentActions[q.id] || agentActions[normId]
  const priceEdits = getAgentPriceEdits()
  const priceEdit = q.agent_price_edit || priceEdits[q.id] || priceEdits[normId]

  // Remote review decisions take precedence if present; fallback to local
  const customsReview = (q.customs_review && q.customs_review.status)
    ? q.customs_review
    : (localMatch?.customs_review?.status ? localMatch.customs_review : (q.customs_review || localMatch?.customs_review || null))

  const agentReview = (q.agent_review && q.agent_review.status)
    ? q.agent_review
    : (localAction || localMatch?.agent_review || null)

  const customerDecision = (q.customer_decision && q.customer_decision.status)
    ? q.customer_decision
    : (localMatch?.customer_decision?.status ? localMatch.customer_decision : (q.customer_decision || localMatch?.customer_decision || null))

  let customsDocReq = q.customs_document_request || localMatch?.customs_document_request || null
  if (customsReview?.status === 'approved' && customsDocReq) {
    customsDocReq = { ...customsDocReq, status: 'APPROVED' }
  }

  // Deeply merge fields so latest server state and local state combine cleanly
  const merged = {
    ...(localMatch || {}),
    ...q,
    ...(priceEdit && Number(priceEdit.revised_price) > 0 ? { agent_price_edit: priceEdit } : {}),
    ...(agentReview ? { agent_review: agentReview } : {}),
    ...(customsReview ? { customs_review: customsReview } : {}),
    ...(customerDecision ? { customer_decision: customerDecision } : {}),
    ...(customsDocReq ? { customs_document_request: customsDocReq } : {}),
  }

  // Preserve customer uploaded documents if either remote or local has it
  if ((!merged.customer_uploaded_documents || merged.customer_uploaded_documents.length === 0) &&
      (q.customer_uploaded_documents?.length > 0 || localMatch?.customer_uploaded_documents?.length > 0)) {
    merged.customer_uploaded_documents = q.customer_uploaded_documents || localMatch?.customer_uploaded_documents
  }

  const effectiveStatus = resolveEffectiveQuoteStatus(merged)

  return {
    ...merged,
    status: effectiveStatus,
    pipeline_status: merged.pipeline_status || (effectiveStatus === 'Booked' ? 'BOOKED' : effectiveStatus.toUpperCase().replace(/\s+/g, '_'))
  }
}

function attachAgentPriceEditsToList(list) {
  if (!Array.isArray(list)) return []
  return list.map(enrichQuoteWithLocalState)
}

export async function fetchQuotes(email) {
  const isCleared = localStorage.getItem('portline_quotes_cleared') === 'true'
  const deletedIds = new Set(getDeletedQuoteIds().map(id => String(id).trim().toUpperCase()))
  const emailLower = (email || '').trim().toLowerCase()

  let list = []

  if (!MOCK_MODE) {
    const query = email ? `?email=${encodeURIComponent(email)}` : ''
    try {
      const res = await apiFetch(`/api/v1/quotes/${query}`)
      if (Array.isArray(res)) {
        list = res.filter(q => {
          const qid = (q.id || '').trim().toUpperCase()
          return qid && !deletedIds.has(qid)
        })
      }
    } catch {
      // Backend unavailable, fallback to local storage
    }
  }

  if (isCleared && list.length === 0) {
    return []
  }

  // Merge with locally saved quotes so any quotes created or updated in the session are not lost
  const localQuotes = getSavedQuotes()
  const seenIds = new Set(list.map(q => (q.id || '').trim().toUpperCase()))

  for (const lq of localQuotes) {
    const lqId = (lq.id || '').trim().toUpperCase()
    if (lqId && !seenIds.has(lqId) && !deletedIds.has(lqId)) {
      if (!emailLower || (lq.user_email || '').trim().toLowerCase() === emailLower) {
        seenIds.add(lqId)
        list.push(lq)
      }
    }
  }

  const enriched = list.map(enrichQuoteWithLocalState)
  if (emailLower) {
    return sortQuotesByTime(enriched.filter(q => (q.user_email || '').trim().toLowerCase() === emailLower))
  }

  return sortQuotesByTime(enriched)
}

export async function deleteQuote(id) {
  if (!id) return { ok: true }
  const qid = id.trim().toUpperCase()
  try {
    const deletedIds = getDeletedQuoteIds()
    if (!deletedIds.includes(qid)) {
      deletedIds.push(qid)
      localStorage.setItem('portline_deleted_quote_ids', JSON.stringify(deletedIds))
    }
    const all = getSavedQuotes()
    const updated = all.filter(q => (q.id || '').trim().toUpperCase() !== qid)
    localStorage.setItem(QUOTES_STORAGE_KEY, JSON.stringify(updated))

    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && (k.startsWith('portline_quotes_') || k.startsWith('portline_quote_'))) {
        try {
          const raw = localStorage.getItem(k)
          if (raw) {
            const parsed = JSON.parse(raw)
            if (Array.isArray(parsed)) {
              const filtered = parsed.filter(item => (item.id || '').trim().toUpperCase() !== qid)
              localStorage.setItem(k, JSON.stringify(filtered))
            } else if (parsed && (parsed.id || '').trim().toUpperCase() === qid) {
              localStorage.removeItem(k)
            }
          }
        } catch {}
      }
    }
  } catch {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('portline_quote_updated', { detail: { quoteId: id, deleted: true } }))
  }

  if (!MOCK_MODE) {
    try {
      await apiFetch(`/api/v1/quotes/${encodeURIComponent(id)}/`, { method: 'DELETE' })
    } catch (err) {
      console.warn('Backend quote delete notice:', err.message)
    }
  }
  return { ok: true }
}

export async function clearAllQuotes() {
  try {
    localStorage.removeItem(QUOTES_STORAGE_KEY)
    localStorage.setItem('portline_quotes_cleared', 'true')
    localStorage.removeItem('portline_deleted_quote_ids')
    localStorage.removeItem('portline_agent_actions')
    localStorage.removeItem('portline_agent_messages')
    localStorage.removeItem('portline_customs_cases')
    localStorage.removeItem('portline_agent_price_revisions')
    const toRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && (k.startsWith('portline_quotes_') || k.startsWith('portline_quote_'))) {
        toRemove.push(k)
      }
    }
    toRemove.forEach(k => localStorage.removeItem(k))
  } catch {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('portline_quote_updated', { detail: { cleared: true } }))
  }

  if (!MOCK_MODE) {
    try {
      await apiFetch('/api/v1/quotes/?confirm=true', { method: 'DELETE' })
    } catch (err) {
      console.warn('Backend clear all quotes notice:', err.message)
    }
  }
  return { ok: true }
}

export async function fetchQuoteById(id) {
  if (!id) return null
  const normId = id.trim().toUpperCase()
  const deletedIds = new Set(getDeletedQuoteIds().map(qid => String(qid).trim().toUpperCase()))
  if (deletedIds.has(normId)) return null

  let found = null

  if (!MOCK_MODE) {
    try {
      const res = await apiFetch(`/api/v1/quotes/${encodeURIComponent(id)}/`)
      if (res && res.id) found = res
    } catch {}
  }

  if (!found) {
    const all = [...getSavedQuotes(), ...seedQuotes]
    found = all.find(q => (q.id || '').trim().toUpperCase() === normId) || null
  }

  return found ? enrichQuoteWithLocalState(found) : null
}

export async function fetchRouteAnalytics() {
  if (MOCK_MODE) {
    await delay(20)
    return routeAnalytics
  }
  try {
    return await apiFetch('/api/v1/routes/analytics/')
  } catch {
    return routeAnalytics
  }
}

export async function sendContactMessage(payload) {
  if (MOCK_MODE) {
    await delay(30)
    return { ok: true }
  }
  try {
    return await apiFetch('/api/v1/contact/', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  } catch {
    return { ok: true }
  }
}

// Fetch ALL quotes (for admin panel — all users)
export async function fetchAllQuotes() {
  const isCleared = localStorage.getItem('portline_quotes_cleared') === 'true'
  const deletedIds = new Set(getDeletedQuoteIds().map(id => String(id).trim().toUpperCase()))
  let list = []
  if (!MOCK_MODE) {
    try {
      const res = await apiFetch('/api/v1/quotes/')
      if (Array.isArray(res)) {
        list = res.filter(q => {
          const qid = (q.id || '').trim().toUpperCase()
          return qid && !deletedIds.has(qid)
        })
      }
    } catch {}
  }

  // If cleared and backend returned empty, do not resurrect old local quotes!
  if (isCleared && list.length === 0) {
    return []
  }

  const localSaved = getSavedQuotes()
  const seenIds = new Set(list.map(q => (q.id || '').trim().toUpperCase()))
  for (const lq of localSaved) {
    const lqId = (lq.id || '').trim().toUpperCase()
    if (lqId && !seenIds.has(lqId) && !deletedIds.has(lqId)) {
      seenIds.add(lqId)
      list.push(lq)
    }
  }

  const enriched = list.map(enrichQuoteWithLocalState)
  try {
    localStorage.setItem(QUOTES_STORAGE_KEY, JSON.stringify(sortQuotesByTime(enriched)))
  } catch {}
  return sortQuotesByTime(enriched)
}

// Agent approves or rejects a quote
export async function agentActionOnQuote(quoteId, action, comment, agentUser) {
  const AGENT_ACTIONS_KEY = 'portline_agent_actions'
  const reviewObj = {
    status: action, // 'approved' | 'rejected' | 'pending'
    comment: comment || '',
    agent_name: agentUser?.name || 'Freight Agent',
    agent_email: agentUser?.email || '',
    reviewed_at: new Date().toISOString()
  }

  const all = getSavedQuotes()
  const targetQid = (quoteId || '').trim().toUpperCase()
  const targetQ = all.find(q => (q.id || '').trim().toUpperCase() === targetQid)
  const hasAcceptedRevision = Boolean(
    targetQ && targetQ.agent_price_edit?.revised_price > 0 &&
    (targetQ.customer_decision?.status === 'ACCEPTED' || (targetQ.status || '').includes('Price Accepted'))
  )
  const isCustomsAlreadyApproved = Boolean(
    targetQ?.customs_review?.status === 'approved' ||
    targetQ?.pipeline_status === 'CUSTOMS_APPROVED' ||
    targetQ?.m3_customs?.compliance_status === 'APPROVED'
  )
  const quote_status = action === 'approved'
    ? (isCustomsAlreadyApproved ? 'Approved by Customs and Awaiting for Customer confirmation' : 'Approved by Agent and Awaiting Customs Clearance')
    : 'Rejected by Agent'
  const pipeStatus = action === 'approved'
    ? (isCustomsAlreadyApproved ? 'CUSTOMS_APPROVED' : 'AGENT_APPROVED')
    : 'AGENT_REJECTED'

  const revisedVal = (hasAcceptedRevision && targetQ?.agent_price_edit?.revised_price > 0)
    ? Number(targetQ.agent_price_edit.revised_price)
    : null
  const origIndicative = (revisedVal && targetQ)
    ? (targetQ.original_indicative_total || (targetQ.indicativeTotal !== revisedVal ? targetQ.indicativeTotal : null))
    : null

  // Always update local storage
  try {
    const updated = all.map(q => ((q.id || '').trim().toUpperCase() === targetQid) ? {
      ...q,
      agent_review: reviewObj,
      status: quote_status,
      pipeline_status: pipeStatus,
      ...(revisedVal ? { indicativeTotal: revisedVal } : {}),
      ...(origIndicative ? { original_indicative_total: origIndicative } : {})
    } : q)
    localStorage.setItem(QUOTES_STORAGE_KEY, JSON.stringify(sortQuotesByTime(updated)))
    const raw = localStorage.getItem(AGENT_ACTIONS_KEY)
    const actions = raw ? JSON.parse(raw) : {}
    actions[quoteId] = reviewObj
    localStorage.setItem(AGENT_ACTIONS_KEY, JSON.stringify(actions))

    // Update linked shipment across localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && (k.startsWith('portline_shipments_') || k === 'portline_customer_shipments')) {
        try {
          const rawShp = localStorage.getItem(k)
          if (rawShp) {
            const shps = JSON.parse(rawShp)
            if (Array.isArray(shps)) {
              let changed = false
              const mapped = shps.map(s => {
                const sQuoteId = (s.quote_id || s.quoteId || '').trim().toUpperCase()
                const sTn = (s.tn || s.shipment_id || s.id || '').trim().toUpperCase()
                const targetTn = (targetQ?.tn || targetQ?.tracking_number || '').trim().toUpperCase()
                const targetShpId = (targetQ?.shipment_id || '').trim().toUpperCase()
                if (
                  sQuoteId === targetQid ||
                  (sTn && targetTn && sTn === targetTn) ||
                  (targetShpId && (s.id === targetShpId || s.shipment_id === targetShpId))
                ) {
                  changed = true
                  return {
                    ...s,
                    status: quote_status,
                    pipeline_status: pipeStatus,
                    ...(revisedVal ? { cost: revisedVal } : {})
                  }
                }
                return s
              })
              if (changed) localStorage.setItem(k, JSON.stringify(mapped))
            }
          }
        } catch {}
      }
    }
  } catch {}

  // Broadcast live synchronization event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('portline_quote_updated', { detail: { quoteId, status: quote_status, action } }))
    window.dispatchEvent(new CustomEvent('portline_shipment_updated', { detail: { quoteId, status: quote_status, action } }))
  }

  if (MOCK_MODE) {
    await delay(300)
    return { ok: true, quoteId, review: reviewObj, status: quote_status }
  }

  try {
    const res = await apiFetch(`/api/v1/quotes/${encodeURIComponent(quoteId)}/action/`, {
      method: 'POST',
      body: JSON.stringify({
        action,
        comment,
        agent_email: agentUser?.email || '',
        agent_name: agentUser?.name || 'Freight Agent',
        quote: targetQ
      }),
    })
    return res || { ok: true, quoteId, review: reviewObj, status: quote_status }
  } catch (err) {
    console.warn('Backend agent action notice (synced locally):', err.message)
    return { ok: true, quoteId, review: reviewObj, status: quote_status }
  }
}

export function getAgentActions() {
  try {
    const raw = localStorage.getItem('portline_agent_actions')
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

// ---- Agent Price Edit ----
const AGENT_PRICE_EDITS_KEY = 'portline_agent_price_edits'

/**
 * Save an agent-revised price for a specific quote.
 * @param {string} quoteId
 * @param {number} newPrice  - Revised indicative total in INR
 * @param {string} reason    - Agent's reason/note for the revision
 * @param {object} agentUser - The logged-in agent user object
 */
export function saveAgentPriceEdit(quoteId, newPrice, reason, agentUser) {
  try {
    const all = getAgentPriceEdits()
    const numPrice = Number(newPrice)
    const normalizedId = (quoteId || '').trim().toUpperCase()
    let record = null

    if (!numPrice || numPrice <= 0) {
      delete all[quoteId]
      delete all[normalizedId]
    } else {
      record = {
        revised_price: numPrice,
        reason: (reason || '').trim(),
        agent_name: agentUser?.name || 'Freight Agent',
        agent_email: agentUser?.email || '',
        edited_at: new Date().toISOString(),
      }
      all[quoteId] = record
      all[normalizedId] = record
    }
    localStorage.setItem(AGENT_PRICE_EDITS_KEY, JSON.stringify(all))

    // Also persist into the main quote record so fetchQuoteById and list views pick it up
    try {
      const QUOTES_STORAGE_KEY = 'portline_saved_quotes'
      const savedRaw = localStorage.getItem(QUOTES_STORAGE_KEY)
      if (savedRaw) {
        const saved = JSON.parse(savedRaw)
        const updated = saved.map(q => {
          const qid = (q.id || '').trim().toUpperCase()
          if (qid === normalizedId) {
            const copy = { ...q }
            if (record) {
              copy.agent_price_edit = record
              copy.status = 'Price Revised (Awaiting Customer Decision)'
              copy.pipeline_status = 'PRICE_REVISED'
              delete copy.customer_decision
            } else {
              delete copy.agent_price_edit
            }
            return copy
          }
          return q
        })
        localStorage.setItem(QUOTES_STORAGE_KEY, JSON.stringify(updated))
      }
    } catch (e) {
      console.warn('Could not sync quote price edit to saved quotes list', e)
    }

    // Call backend API to persist price revision across backend and all customer sessions
    if (!MOCK_MODE && quoteId) {
      try {
        apiFetch(`/api/v1/quotes/${encodeURIComponent(quoteId)}/action/`, {
          method: 'POST',
          body: JSON.stringify({
            action: 'revise_price',
            revised_price: numPrice > 0 ? numPrice : 0,
            reason: (reason || '').trim(),
            agent_name: agentUser?.name || 'Freight Agent',
            agent_email: agentUser?.email || ''
          })
        }).catch(err => console.warn('Backend quote price revision sync note:', err.message))
      } catch (backendErr) {
        console.warn('Backend quote price revision error:', backendErr.message)
      }
    }

    // Also sync linked shipments in localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && (k.startsWith('portline_shipments_') || k === 'portline_customer_shipments')) {
        try {
          const rawShp = localStorage.getItem(k)
          if (rawShp) {
            const shps = JSON.parse(rawShp)
            if (Array.isArray(shps)) {
              let changed = false
              const mapped = shps.map(s => {
                const sQuoteId = (s.quote_id || s.quoteId || '').trim().toUpperCase()
                if (sQuoteId === normalizedId || s.id === normalizedId) {
                  changed = true
                  return {
                    ...s,
                    status: 'Price Revised (Awaiting Customer Decision)',
                    pipeline_status: 'PRICE_REVISED',
                    cost: numPrice > 0 ? numPrice : s.cost
                  }
                }
                return s
              })
              if (changed) localStorage.setItem(k, JSON.stringify(mapped))
            }
          }
        } catch {}
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('portline_quote_updated', { detail: { quoteId, revised_price: numPrice } }))
      window.dispatchEvent(new CustomEvent('portline_shipment_updated', { detail: { quoteId, revised_price: numPrice } }))
    }

    return record || { cleared: true }
  } catch (err) {
    console.error('saveAgentPriceEdit error:', err)
    return null
  }
}

/** Retrieve all agent price edits keyed by quoteId */
export function getAgentPriceEdits() {
  try {
    const raw = localStorage.getItem(AGENT_PRICE_EDITS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

/** Clear a single agent price edit (e.g. on quote delete or reset) */
export function clearAgentPriceEdit(quoteId) {
  try {
    const all = getAgentPriceEdits()
    delete all[quoteId]
    localStorage.setItem(AGENT_PRICE_EDITS_KEY, JSON.stringify(all))
  } catch {}
}


// Trigger the full M1->M2->M3->Quote Engine pipeline on the backend
export async function triggerQuotePipeline(shipmentId, payload = {}) {
  if (MOCK_MODE) {
    await delay(300)
    return { status: 'COMPLETED', quote_id: payload.quote_id || 'QT-MOCK-001' }
  }
  return apiFetch(`/api/v1/shipments/${shipmentId}/generate-quote/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

// Customer accepts or rejects a quote, price revision, or final booking
export async function customerDecisionOnQuote(quoteId, decision, notes = '', customerUser = null) {
  const allSaved = getSavedQuotes()
  const targetQ = allSaved.find(q => (q.id || '').toUpperCase() === (quoteId || '').toUpperCase())
  const custName = customerUser?.name || targetQ?.customer || 'Customer'
  const rawStatus = targetQ?.status || ''

  const isRevisionAcceptance = Boolean(
    decision === 'accept_revision' ||
    (rawStatus.includes('Price Revised') && (decision === 'accepted' || decision === 'accept')) ||
    (targetQ?.agent_price_edit?.revised_price > 0 && decision === 'accepted' && !targetQ?.customs_review?.status)
  )
  const isDecline = decision === 'rejected' || decision === 'declined'
  const isCustomsApprovedState = Boolean(
    rawStatus.includes('Approved by Customs') ||
    targetQ?.customs_review?.status === 'approved' ||
    targetQ?.pipeline_status === 'CUSTOMS_APPROVED'
  )
  const isDeclineBooking = isDecline && isCustomsApprovedState
  const isExplicitBooking = Boolean(
    (decision === 'booked' || decision === 'book' || decision === 'accept_booking') ||
    (decision === 'accepted' && isCustomsApprovedState)
  )

  let status
  if (isRevisionAcceptance) {
    status = 'Revised Priced Accepted (Agent Approval Pending)'
  } else if (isDeclineBooking) {
    status = `Booking decline by Customer (${custName})`
  } else if (isDecline) {
    status = (rawStatus.includes('Price Revised') || targetQ?.agent_price_edit?.revised_price > 0)
      ? 'Revised Price Declined'
      : `Booking decline by Customer (${custName})`
  } else if (isExplicitBooking) {
    status = 'Booked'
  } else {
    // If not explicit booking and revision was present, treat as revision acceptance
    status = (targetQ?.agent_price_edit?.revised_price > 0)
      ? 'Revised Priced Accepted (Agent Approval Pending)'
      : 'Revised Priced Accepted (Agent Approval Pending)'
  }

  const isBooking = status === 'Booked'

  const record = {
    status: isRevisionAcceptance ? 'ACCEPTED' : (isDecline ? 'REJECTED' : (isBooking ? 'BOOKED' : 'ACCEPTED')),
    notes,
    customer_name: custName,
    decided_at: new Date().toISOString(),
    is_revised_price: isRevisionAcceptance,
    is_booking_confirmation: isBooking
  }

  // Always update local storage
  try {
    const all = getSavedQuotes()
    const targetQid = (quoteId || '').trim().toUpperCase()
    const revisedVal = (isRevisionAcceptance && targetQ?.agent_price_edit?.revised_price > 0)
      ? Number(targetQ.agent_price_edit.revised_price)
      : null
    const origIndicative = (revisedVal && targetQ)
      ? (targetQ.original_indicative_total || (targetQ.indicativeTotal !== revisedVal ? targetQ.indicativeTotal : null))
      : null

    const effectiveTotal = revisedVal || targetQ?.indicativeTotal || 0
    const effectiveCarrier = targetQ?.selected_route?.carrier || targetQ?.carrier || 'Carrier'

    const updated = all.map(q => ((q.id || '').trim().toUpperCase() === targetQid) ? {
      ...q,
      customer_decision: record,
      status,
      pipeline_status: isBooking ? 'BOOKED' : (isRevisionAcceptance ? 'PRICE_ACCEPTED_PENDING_AGENT' : 'REJECTED'),
      booking_confirmed: isBooking,
      ...(revisedVal ? { indicativeTotal: revisedVal } : {}),
      ...(origIndicative ? { original_indicative_total: origIndicative } : {})
    } : q)
    localStorage.setItem(QUOTES_STORAGE_KEY, JSON.stringify(sortQuotesByTime(updated)))

    // Sync linked shipment in user's localStorage
    let shipmentFound = false
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && (k.startsWith('portline_shipments_') || k === 'portline_customer_shipments')) {
        try {
          const raw = localStorage.getItem(k)
          if (raw) {
            const shps = JSON.parse(raw)
            if (Array.isArray(shps)) {
              let changed = false
              const mapped = shps.map(s => {
                const sQuoteId = (s.quote_id || s.quoteId || '').trim().toUpperCase()
                const sTn = (s.tn || s.shipment_id || s.id || '').trim().toUpperCase()
                const targetTn = (targetQ?.tn || targetQ?.tracking_number || '').trim().toUpperCase()
                const targetShpId = (targetQ?.shipment_id || '').trim().toUpperCase()
                if (
                  sQuoteId === targetQid ||
                  (sTn && targetTn && sTn === targetTn) ||
                  (targetShpId && (s.id === targetShpId || s.shipment_id === targetShpId))
                ) {
                  changed = true
                  shipmentFound = true
                  const updatedSteps = (s.steps || []).map(st => {
                    if (st.label === 'Booking confirmed' && isBooking) {
                      return { ...st, done: true, current: true, ts: 'Just now' }
                    }
                    if (st.label === 'Quoted') {
                      return { ...st, done: true, current: !isBooking }
                    }
                    return st
                  })
                  return {
                    ...s,
                    status: isBooking ? 'Booked' : (isDecline ? (isDeclineBooking ? `Booking decline by Customer (${custName})` : 'Revised Price Declined') : status),
                    pipeline_status: isBooking ? 'CONFIRMED' : (isRevisionAcceptance ? 'PRICE_ACCEPTED_PENDING_AGENT' : (isDecline ? 'REJECTED' : s.pipeline_status)),
                    booking_status: isBooking ? 'CONFIRMED' : s.booking_status,
                    carrier: effectiveCarrier,
                    cost: effectiveTotal || s.cost,
                    steps: updatedSteps.length ? updatedSteps : s.steps
                  }
                }
                return s
              })
              if (changed) {
                localStorage.setItem(k, JSON.stringify(mapped))
              }
            }
          }
        } catch {}
      }
    }

    // If booked and no shipment was in localStorage yet, create and store it
    if (isBooking && !shipmentFound) {
      const custEmail = (customerUser?.email || targetQ?.user_email || targetQ?.email || '').toLowerCase()
      const newShipment = {
        id: targetQ?.shipment_id || `SHP-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
        shipment_id: targetQ?.shipment_id || `SHP-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
        tn: targetQ?.tn || `TN26-${(quoteId || '').replace('QT-', '')}`,
        quote_id: quoteId,
        quoteId: quoteId,
        customer: targetQ?.customer || customerUser?.name || customerUser?.company || 'Shipper',
        user_email: custEmail,
        userName: customerUser?.name || 'Shipper',
        lane: targetQ?.laneCode || targetQ?.laneName || 'Global Lane',
        from: targetQ?.origin || (targetQ?.laneCode?.includes('->') ? targetQ.laneCode.split('->')[0].trim() : 'Origin Gateway'),
        to: targetQ?.destination || (targetQ?.laneCode?.includes('->') ? targetQ.laneCode.split('->')[1].trim() : 'Destination Gateway'),
        mode: targetQ?.mode || 'Ocean FCL',
        service: targetQ?.mode || 'Ocean FCL',
        carrier: effectiveCarrier,
        cost: effectiveTotal,
        status: 'Booked',
        pipeline_status: 'CONFIRMED',
        booking_status: 'CONFIRMED',
        customs_status: 'Approved by Customs',
        customs_verified: true,
        date: new Date().toISOString().slice(0, 10),
        steps: [
          { label: 'Quoted', loc: 'Origin Hub', ts: 'Completed', done: true },
          { label: 'Booking confirmed', loc: 'Customer Acceptance Desk', ts: 'Just now', done: true, current: true },
          { label: 'Picked up', loc: 'Origin Port CFS', ts: 'Scheduled', done: false },
          { label: 'In transit', loc: '—', ts: 'Pending', done: false },
          { label: 'Customs clearance', loc: 'Destination Port', ts: 'Approved', done: true },
          { label: 'Out for delivery', loc: 'Gateway Terminal', ts: 'Pending', done: false },
          { label: 'Delivered', loc: 'Consignee Facility', ts: 'Pending', done: false },
        ]
      }
      if (custEmail) {
        const userKey = `portline_shipments_${custEmail}`
        try {
          const prev = JSON.parse(localStorage.getItem(userKey) || '[]')
          localStorage.setItem(userKey, JSON.stringify([newShipment, ...prev]))
        } catch {}
      }
      try {
        const prevCust = JSON.parse(localStorage.getItem('portline_customer_shipments') || '[]')
        localStorage.setItem('portline_customer_shipments', JSON.stringify([newShipment, ...prevCust]))
      } catch {}
    }

    // Broadcast synchronization events across panels
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('portline_quote_updated', { detail: { quoteId, status, decision } }))
      window.dispatchEvent(new CustomEvent('portline_shipment_updated', { detail: { quoteId, status, decision } }))
    }
  } catch {}

  if (MOCK_MODE) {
    await delay(200)
    return { ok: true, quote_id: quoteId, status }
  }
  return apiFetch(`/api/v1/quotes/${quoteId}/customer-decision/`, {
    method: 'POST',
    body: JSON.stringify({
      decision: isBooking ? 'booked' : (isRevisionAcceptance ? 'accept_revision' : (isDeclineBooking ? 'declined_booking' : 'rejected')),
      action: isBooking ? 'booked' : (isRevisionAcceptance ? 'accept_revision' : (isDeclineBooking ? 'declined_booking' : 'rejected')),
      notes,
      customer_email: customerUser?.email,
      customer_name: custName
    }),
  })
}

// Customer selects a recommended route option
export async function selectQuoteRoute(quoteId, route, requestedBy = '') {
  // Always update local storage
  try {
    const all = getSavedQuotes()
    const targetQid = (quoteId || '').trim().toUpperCase()
    const updated = all.map(q => ((q.id || '').trim().toUpperCase() === targetQid) ? {
      ...q,
      selected_route: route,
      carrier: route?.carrier || q.carrier,
      assigned_carrier: route?.carrier || q.assigned_carrier,
      indicativeTotal: route.cost || q.indicativeTotal,
      route_approval_status: 'PENDING_APPROVAL'
    } : q)
    localStorage.setItem(QUOTES_STORAGE_KEY, JSON.stringify(updated))

    // Also sync linked shipment cost and carrier in user's localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith('portline_shipments_')) {
        try {
          const raw = localStorage.getItem(k)
          if (raw) {
            const shps = JSON.parse(raw)
            if (Array.isArray(shps)) {
              let changed = false
              const mapped = shps.map(s => {
                if (s.quote_id === quoteId || s.quoteId === quoteId) {
                  changed = true
                  return {
                    ...s,
                    carrier: route.carrier,
                    cost: route.cost || s.cost
                  }
                }
                return s
              })
              if (changed) {
                localStorage.setItem(k, JSON.stringify(mapped))
              }
            }
          }
        } catch {}
      }
    }
  } catch {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('portline_quote_updated', { detail: { quoteId, route } }))
  }

  if (MOCK_MODE) {
    await delay(150)
    return { ok: true, quote_id: quoteId, selected_route: route }
  }
  return apiFetch(`/api/v1/quotes/${quoteId}/select-route/`, {
    method: 'POST',
    body: JSON.stringify({ route, requested_by: requestedBy }),
  })
}

// Customer finalises quote with a chosen route: locks route selection and dispatches to carrier agent
export async function finaliseQuote(quoteId, route, user = null) {
  if (!quoteId) return { ok: false }
  const targetQid = quoteId.trim().toUpperCase()
  const nowStr = new Date().toISOString()
  const all = getSavedQuotes()
  const selectedCarrier = route?.carrier || 'Carrier'
  const cost = route?.cost

  const updated = all.map(q => {
    if ((q.id || '').trim().toUpperCase() === targetQid) {
      return {
        ...q,
        is_finalised: true,
        finalised_at: nowStr,
        selected_route: route ? { ...route, approval_status: 'PENDING_APPROVAL', selected_at: nowStr } : q.selected_route,
        carrier: selectedCarrier,
        assigned_carrier: selectedCarrier,
        ...(cost ? { indicativeTotal: cost } : {}),
        status: 'Agent Approval Pending',
        pipeline_status: 'AGENT_APPROVAL_PENDING',
        route_approval_status: 'PENDING_APPROVAL'
      }
    }
    return q
  })

  try {
    localStorage.setItem(QUOTES_STORAGE_KEY, JSON.stringify(sortQuotesByTime(updated)))
  } catch {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('portline_quote_updated', { detail: { quoteId, finalised: true, route } }))
  }

  if (!MOCK_MODE) {
    try {
      await apiFetch(`/api/v1/quotes/${encodeURIComponent(quoteId)}/select-route/`, {
        method: 'POST',
        body: JSON.stringify({
          route,
          is_finalised: true,
          carrier: selectedCarrier,
          requested_by: user?.email || user?.name || 'Customer'
        })
      })
    } catch (err) {
      console.warn('Backend finalise quote notice:', err.message)
    }
  }

  return { ok: true, quote_id: quoteId, status: 'Agent Approval Pending', carrier: selectedCarrier }
}

// Customs Officer approves documentation or requests specific documents
export async function customsActionOnQuote(quoteId, action, { requestedDocs = [], comment = '', officerUser = null } = {}) {
  const status = action === 'approve'
    ? 'Approved by Customs and Awaiting for Customer confirmation'
    : (action === 'reject' ? 'Rejected by Customs' : 'Documents Requested by Customs')
  const pipeline_status = action === 'approve' ? 'CUSTOMS_APPROVED' : (action === 'reject' ? 'CUSTOMS_REJECTED' : 'CUSTOMS_DOCS_REQUESTED')
  
  // Always update local storage quotes
  try {
    const all = getSavedQuotes()
    const updated = all.map(q => q.id === quoteId ? {
      ...q,
      status,
      customs_status: status,
      pipeline_status,
      customs_review: action === 'approve' 
        ? { status: 'approved', officer_name: officerUser?.name || 'Customs Officer', reviewed_at: new Date().toISOString(), notes: comment } 
        : (action === 'reject' ? { status: 'rejected', officer_name: officerUser?.name || 'Customs Officer', reviewed_at: new Date().toISOString(), notes: comment } : null),
      customs_document_request: action === 'request_documents' 
        ? { requested_docs: requestedDocs, officer_notes: comment, status: 'PENDING_CUSTOMER_UPLOAD', requested_at: new Date().toISOString() } 
        : (action === 'approve' ? { ...(q.customs_document_request || {}), status: 'APPROVED', approved_at: new Date().toISOString() } : q.customs_document_request)
    } : q)
    localStorage.setItem(QUOTES_STORAGE_KEY, JSON.stringify(updated))
  } catch {}

  // Also update any matching shipments in localStorage across user keys
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith('portline_shipments_')) {
        const raw = localStorage.getItem(k)
        if (raw) {
          const arr = JSON.parse(raw)
          if (Array.isArray(arr)) {
            const updatedArr = arr.map(s => {
              if (s.quote_id === quoteId || s.id === quoteId || s.tn?.includes(quoteId)) {
                return {
                  ...s,
                  customs_status: status,
                  customs_verified: action === 'approve',
                  pipeline_status,
                  status: status
                }
              }
              return s
            })
            localStorage.setItem(k, JSON.stringify(updatedArr))
          }
        }
      }
    }
  } catch {}

  // Broadcast live synchronization event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('portline_quote_updated', { detail: { quoteId, status, action } }))
    window.dispatchEvent(new CustomEvent('portline_shipment_updated', { detail: { quoteId, status, action } }))
  }

  if (MOCK_MODE) {
    await delay(200)
    return { ok: true, quote_id: quoteId, action, status }
  }

  try {
    const res = await apiFetch(`/api/v1/quotes/${quoteId}/customs-action/`, {
      method: 'POST',
      body: JSON.stringify({
        action,
        requested_docs: requestedDocs,
        officer_notes: comment,
        officer_name: officerUser?.name || 'Customs Officer',
        officer_email: officerUser?.email
      }),
    })
    return res || { ok: true, quote_id: quoteId, action, status }
  } catch (err) {
    console.warn('Backend customs action notice (synced locally):', err.message)
    return { ok: true, quote_id: quoteId, action, status }
  }
}

// Customer uploads required customs documents
export async function uploadQuoteDocuments(quoteId, uploadedDocs = [], uploadedBy = 'Customer') {
  // Always update local storage
  try {
    const all = getSavedQuotes()
    const targetQid = (quoteId || '').trim().toUpperCase()
    const updated = all.map(q => {
      if ((q.id || '').trim().toUpperCase() === targetQid) {
        const m3_c = q.m3_customs || {}
        const checklist = (m3_c.checklist || []).map(item => {
          const match = uploadedDocs.some(ud => ud.name?.toLowerCase() === (item.item_name || item.name)?.toLowerCase())
          return match ? { ...item, document_uploaded: true, status: 'VERIFIED' } : item
        })
        const nowStr = new Date().toISOString()
        const newUploaded = uploadedDocs.map(d => ({
          name: d.name,
          file_name: d.file_name || `${d.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_signed.pdf`,
          file_size: d.file_size || '248 KB',
          file_type: d.file_type || 'application/pdf',
          file_data: d.file_data || null,
          uploaded_by: uploadedBy,
          uploaded_at: nowStr
        }))
        return {
          ...q,
          status: 'Documents Submitted (Pending Customs Sign-off)',
          pipeline_status: 'DOCS_SUBMITTED',
          m3_customs: { ...m3_c, checklist, readiness_score: 95 },
          customs_document_request: { ...(q.customs_document_request || {}), status: 'DOCUMENTS_SUBMITTED' },
          customer_uploaded_documents: [
            ...(q.customer_uploaded_documents || []),
            ...newUploaded
          ]
        }
      }
      return q
    })
    localStorage.setItem(QUOTES_STORAGE_KEY, JSON.stringify(updated))
  } catch {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('portline_quote_updated', { detail: { quoteId, status: 'Documents Submitted (Pending Customs Sign-off)' } }))
  }

  if (MOCK_MODE) {
    await delay(300)
    return { ok: true, quote_id: quoteId, status: 'Documents Submitted (Pending Customs Sign-off)' }
  }
  try {
    const res = await apiFetch(`/api/v1/quotes/${quoteId}/upload-documents/`, {
      method: 'POST',
      body: JSON.stringify({
        uploaded_docs: uploadedDocs,
        uploaded_by: uploadedBy
      }),
    })
    return res || { ok: true, quote_id: quoteId, status: 'Documents Submitted (Pending Customs Sign-off)' }
  } catch (err) {
    console.warn('Backend upload documents notice (synced locally):', err.message)
    return { ok: true, quote_id: quoteId, status: 'Documents Submitted (Pending Customs Sign-off)' }
  }
}


// Backend M2 ML Price Prediction
export async function fetchBackendMLPrice(payload) {
  try {
    return await apiFetch('/api/v1/ml/predict-rate/', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  } catch (err) {
    console.warn('Backend ML price API error, falling back:', err.message)
    return null
  }
}

// Backend M3 Weather Assessment
export async function fetchBackendWeatherAssess(payload) {
  try {
    return await apiFetch('/api/v1/weather/assess/', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  } catch (err) {
    console.warn('Backend weather assess API error, falling back:', err.message)
    return null
  }
}

// Backend M3 Customs Validation
export async function fetchBackendCustomsValidate(payload) {
  try {
    return await apiFetch('/api/v1/customs/validate/', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  } catch (err) {
    console.warn('Backend customs validate API error, falling back:', err.message)
    return null
  }
}

// Backend M3 Composite Risk Assessment
export async function fetchBackendRiskAssess(payload) {
  try {
    return await apiFetch('/api/v1/risk/assess/', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  } catch (err) {
    console.warn('Backend risk assess API error, falling back:', err.message)
    return null
  }
}


// ---------------- Master Database (Admin Only) ----------------

import { FALLBACK_SEED, MASTER_COLLECTIONS_META } from './masterSeedData'

function getLocalMasterCollection(name) {
  const key = `portline_master_${name}`
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw)
  } catch {}
  const initial = FALLBACK_SEED[name] || []
  try {
    localStorage.setItem(key, JSON.stringify(initial))
  } catch {}
  return initial
}

function saveLocalMasterCollection(name, items) {
  const key = `portline_master_${name}`
  try {
    localStorage.setItem(key, JSON.stringify(items))
  } catch {}
}

export async function fetchMasterOverview() {
  const getLocalOverview = () => {
    const collections = {}
    let total = 0
    MASTER_COLLECTIONS_META.forEach(m => {
      const items = getLocalMasterCollection(m.key)
      collections[m.key] = {
        count: items.length,
        seed_available: items.length,
        is_empty: items.length === 0,
      }
      total += items.length
    })
    return { collections_count: MASTER_COLLECTIONS_META.length, total_records: total, collections }
  }

  if (MOCK_MODE) {
    await delay(30)
    return getLocalOverview()
  }

  try {
    const res = await apiFetch('/api/v1/master/overview/', {
      headers: { 'X-User-Role': 'admin' }
    })
    return res || getLocalOverview()
  } catch (err) {
    return getLocalOverview()
  }
}

export async function fetchMasterCollection(collectionName, params = {}) {
  const { q = '', active = null, page = 1, limit = 200 } = params

  const getLocalResults = () => {
    let items = getLocalMasterCollection(collectionName)
    if (active !== null) {
      items = items.filter(i => i.active === (active === true || active === 'true'))
    }
    if (q) {
      const query = q.toLowerCase()
      items = items.filter(i => {
        return Object.values(i).some(val => 
          typeof val === 'string' && val.toLowerCase().includes(query)
        )
      })
    }
    return {
      collection: collectionName,
      total: items.length,
      page,
      limit,
      items: items.slice((page - 1) * limit, page * limit)
    }
  }

  if (MOCK_MODE) {
    await delay(30)
    return getLocalResults()
  }

  const searchParams = new URLSearchParams()
  if (q) searchParams.set('q', q)
  if (active !== null) searchParams.set('active', active)
  if (page) searchParams.set('page', page)
  if (limit) searchParams.set('limit', limit)
  const qs = searchParams.toString() ? `?${searchParams.toString()}` : ''

  try {
    const res = await apiFetch(`/api/v1/master/${collectionName}/${qs}`, {
      headers: { 'X-User-Role': 'admin' }
    })
    return res || getLocalResults()
  } catch (err) {
    return getLocalResults()
  }
}

export async function createMasterRecord(collectionName, recordData) {
  if (MOCK_MODE) {
    await delay(50)
    const items = getLocalMasterCollection(collectionName)
    const newDoc = {
      ...recordData,
      id: 'doc_' + Math.random().toString(36).substr(2, 9),
      active: recordData.active !== false,
      _created_at: new Date().toISOString(),
    }
    items.unshift(newDoc)
    saveLocalMasterCollection(collectionName, items)
    return newDoc
  }
  return apiFetch(`/api/v1/master/${collectionName}/`, {
    method: 'POST',
    headers: { 'X-User-Role': 'admin' },
    body: JSON.stringify(recordData),
  })
}

export async function updateMasterRecord(collectionName, docId, recordData) {
  if (MOCK_MODE) {
    await delay(50)
    const items = getLocalMasterCollection(collectionName)
    const idx = items.findIndex(i => (i.id === docId || i._id === docId || i.locode === docId || i.iata === docId || i.code === docId || i.card_id === docId))
    if (idx !== -1) {
      items[idx] = { ...items[idx], ...recordData, _updated_at: new Date().toISOString() }
      saveLocalMasterCollection(collectionName, items)
      return items[idx]
    }
    throw new Error('Record not found')
  }
  return apiFetch(`/api/v1/master/${collectionName}/${docId}/`, {
    method: 'PUT',
    headers: { 'X-User-Role': 'admin' },
    body: JSON.stringify(recordData),
  })
}

export async function deleteMasterRecord(collectionName, docId, hard = false) {
  if (MOCK_MODE) {
    await delay(50)
    let items = getLocalMasterCollection(collectionName)
    if (hard) {
      items = items.filter(i => !(i.id === docId || i._id === docId || i.locode === docId || i.iata === docId || i.code === docId || i.card_id === docId))
    } else {
      items = items.map(i => {
        if (i.id === docId || i._id === docId || i.locode === docId || i.iata === docId || i.code === docId || i.card_id === docId) {
          return { ...i, active: false, _deleted_at: new Date().toISOString() }
        }
        return i
      })
    }
    saveLocalMasterCollection(collectionName, items)
    return { ok: true, id: docId, hard }
  }
  const qs = hard ? '?hard=true' : ''
  return apiFetch(`/api/v1/master/${collectionName}/${docId}/${qs}`, {
    method: 'DELETE',
    headers: { 'X-User-Role': 'admin' },
  })
}

export async function triggerMasterSeed(drop = false) {
  if (MOCK_MODE) {
    await delay(200)
    MASTER_COLLECTIONS_META.forEach(m => {
      const initial = FALLBACK_SEED[m.key] || []
      localStorage.setItem(`portline_master_${m.key}`, JSON.stringify(initial))
    })
    return { success: true, message: 'Local master seed loaded successfully.' }
  }
  return apiFetch('/api/v1/master/seed/', {
    method: 'POST',
    headers: { 'X-User-Role': 'admin' },
    body: JSON.stringify({ drop }),
  })
}



// ---------------- Companies & Agents B2B Management ----------------

export async function fetchCompanies(eligibleOnly = false) {
  try {
    const url = eligibleOnly ? '/api/v1/companies/?eligible=true' : '/api/v1/companies/'
    const res = await apiFetch(url)
    if (Array.isArray(res)) return res
  } catch (err) {
    console.warn('Backend companies endpoint unavailable, using cached companies:', err.message)
  }

  // Fallback from localStorage
  try {
    const raw = localStorage.getItem('portline_companies')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return eligibleOnly ? parsed.filter(c => c.is_eligible) : parsed
      }
    }
  } catch {}

  return []
}

export async function createCompany(companyData) {
  try {
    const res = await apiFetch('/api/v1/companies/', {
      method: 'POST',
      body: JSON.stringify(companyData)
    })
    window.dispatchEvent(new CustomEvent('portline_companies_updated'))
    return res
  } catch (err) {
    console.error('Failed to create company on backend:', err)
    throw err
  }
}

export async function verifyCompany(companyId, { status, is_eligible, sla_hours, contract_tier }) {
  try {
    const res = await apiFetch(`/api/v1/companies/${companyId}/verify/`, {
      method: 'PATCH',
      body: JSON.stringify({ status, is_eligible, sla_hours, contract_tier })
    })
    window.dispatchEvent(new CustomEvent('portline_companies_updated'))
    return res
  } catch (err) {
    console.error('Failed to update company verification status:', err)
    throw err
  }
}

export async function addCompanyAgent(companyId, { name, email, password, phone }) {
  try {
    const res = await apiFetch(`/api/v1/companies/${companyId}/agents/`, {
      method: 'POST',
      body: JSON.stringify({ name, email, password, phone })
    })
    // Also save into mock users so agent can login offline if needed
    saveMockUser(email, {
      password,
      user: {
        name,
        email: email.trim().toLowerCase(),
        role: 'agent',
        phone,
        company: res?.company?.name || 'Carrier Desk'
      }
    })
    window.dispatchEvent(new CustomEvent('portline_companies_updated'))
    return res
  } catch (err) {
    console.error('Failed to add agent to company:', err)
    throw err
  }
}

export async function removeCompanyAgent(companyId, agentEmail) {
  try {
    const res = await apiFetch(`/api/v1/companies/${companyId}/agents/?email=${encodeURIComponent(agentEmail)}`, {
      method: 'DELETE'
    })
    window.dispatchEvent(new CustomEvent('portline_companies_updated'))
    return res
  } catch (err) {
    console.error('Failed to remove agent from company:', err)
    throw err
  }
}
