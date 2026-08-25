import * as SecureStore from 'expo-secure-store'
import { SessionType } from '../types/auth'

const KEY_ACCESS_TOKEN = 'alasdeqa_access_token'
const KEY_SESSION_TYPE = 'alasdeqa_session_type'
const KEY_TOKEN_EXPIRY = 'alasdeqa_token_expiry'

export async function getAccessToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(KEY_ACCESS_TOKEN)
  } catch {
    return null
  }
}

export async function getSessionType(): Promise<SessionType | null> {
  try {
    const val = await SecureStore.getItemAsync(KEY_SESSION_TYPE)
    if (val === 'employee' || val === 'customer') {
      return val as SessionType
    }
    return null
  } catch {
    return null
  }
}

export async function saveSession(
  accessToken: string,
  sessionType: SessionType,
  expirySeconds?: number
): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEY_ACCESS_TOKEN, accessToken)
    await SecureStore.setItemAsync(KEY_SESSION_TYPE, sessionType)
    if (expirySeconds) {
      const expiryTime = (Date.now() + expirySeconds * 1000).toString()
      await SecureStore.setItemAsync(KEY_TOKEN_EXPIRY, expiryTime)
    }
  } catch (err) {
    console.error('[StorageService] Error saving secure session:', err)
  }
}

export async function clearSession(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(KEY_ACCESS_TOKEN)
    await SecureStore.deleteItemAsync(KEY_SESSION_TYPE)
    await SecureStore.deleteItemAsync(KEY_TOKEN_EXPIRY)
  } catch (err) {
    // console.error('Failed to clear secure session', err)
  }
}

export async function getSecureItem(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key)
  } catch {
    return null
  }
}

export async function setSecureItem(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value)
  } catch {
    // ignore
  }
}

export async function deleteSecureItem(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key)
  } catch {
    // ignore
  }
}
