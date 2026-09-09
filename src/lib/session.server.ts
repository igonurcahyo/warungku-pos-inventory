import {
  getCookie,
  setCookie,
  deleteCookie,
} from '@tanstack/react-start/server'
import crypto from 'node:crypto'

export interface SessionData {
  userId: number
  email: string
}

const SESSION_COOKIE_NAME = 'warungku_session'

function getSecretKey() {
  const SESSION_SECRET =
    process.env.SESSION_SECRET ||
    'fallback_secret_for_development_purposes_only'
  return crypto.scryptSync(SESSION_SECRET, 'salt', 32)
}

function encryptSession(payload: any): string {
  const iv = crypto.randomBytes(16)
  const secretKey = getSecretKey()
  const cipher = crypto.createCipheriv('aes-256-gcm', secretKey, iv)
  let encrypted = cipher.update(JSON.stringify(payload), 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag().toString('hex')
  return `${iv.toString('hex')}:${authTag}:${encrypted}`
}

function decryptSession(token: string): any {
  try {
    const [ivHex, authTagHex, encryptedHex] = token.split(':')
    if (!ivHex || !authTagHex || !encryptedHex) return null

    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')
    const secretKey = getSecretKey()
    const decipher = crypto.createDecipheriv('aes-256-gcm', secretKey, iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return JSON.parse(decrypted)
  } catch (error) {
    return null
  }
}

export function setSessionServer(data: SessionData, remember: boolean) {
  const token = encryptSession(data)
  const maxAge = remember ? 30 * 24 * 60 * 60 : 24 * 60 * 60

  setCookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: maxAge,
  })
}

export function getSessionServer(): SessionData | null {
  const token = getCookie(SESSION_COOKIE_NAME)
  if (!token) return null
  return decryptSession(token) as SessionData | null
}

export function clearSessionServer() {
  deleteCookie(SESSION_COOKIE_NAME, {
    path: '/',
  })
}
