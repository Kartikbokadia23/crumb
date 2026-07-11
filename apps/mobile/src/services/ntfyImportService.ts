import AsyncStorage from '@react-native-async-storage/async-storage'

export const NTFY_RELAY_NAME_KEY = 'crumb_ntfy_relay_name'
const NTFY_TOPIC_PREFIX = 'crumb-sms-'
const LAST_ID_PREFIX = 'crumb_ntfy_last_id_'

export type NtfyDraftCandidate = {
  text: string
  sender: string
}

type NtfyMessage = {
  id: string
  message?: string
}

const TEXT_FIELDS = ['text', 'body', 'message', 'sms', 'content'] as const
const SENDER_FIELDS = ['sender', 'from', 'source'] as const

export function sanitizeRelayName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-')
}

export function buildNtfyTopic(relayName: string): string | null {
  const sanitized = sanitizeRelayName(relayName).replace(/^-+|-+$/g, '')
  return sanitized ? `${NTFY_TOPIC_PREFIX}${sanitized}` : null
}

export function buildNtfyUrl(relayName: string): string | null {
  const topic = buildNtfyTopic(relayName)
  return topic ? `https://ntfy.sh/${topic}` : null
}

export async function getStoredRelayName(): Promise<string> {
  const stored = await AsyncStorage.getItem(NTFY_RELAY_NAME_KEY)
  return stored ? sanitizeRelayName(stored) : ''
}

export async function setStoredRelayName(relayName: string): Promise<void> {
  const sanitized = sanitizeRelayName(relayName)
  if (sanitized) {
    await AsyncStorage.setItem(NTFY_RELAY_NAME_KEY, sanitized)
  } else {
    await AsyncStorage.removeItem(NTFY_RELAY_NAME_KEY)
  }
}

function stringField(payload: Record<string, unknown>, fields: readonly string[]): string | null {
  for (const field of fields) {
    const value = payload[field]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

function candidateFromMessage(message: string): NtfyDraftCandidate | null {
  const trimmed = message.trim()
  if (!trimmed) return null

  try {
    const payload = JSON.parse(trimmed) as unknown
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
      const fields = payload as Record<string, unknown>
      const text = stringField(fields, TEXT_FIELDS)
      if (text) {
        return {
          text,
          sender: stringField(fields, SENDER_FIELDS) ?? 'Messages',
        }
      }
    }
  } catch {
    // Plain text SMS bodies are supported as the fallback path.
  }

  return { text: trimmed, sender: 'Messages' }
}

export async function pollNtfyDraftCandidates(): Promise<NtfyDraftCandidate[]> {
  const relayName = await getStoredRelayName()
  const topic = buildNtfyTopic(relayName)
  if (!topic) return []

  const lastIdKey = `${LAST_ID_PREFIX}${topic}`
  const pollUrl = `https://ntfy.sh/${topic}/json?poll=1`
  const since = await AsyncStorage.getItem(lastIdKey)
  const url = since ? `${pollUrl}&since=${since}` : `${pollUrl}&since=24h`

  let body: string
  try {
    const response = await fetch(url)
    if (!response.ok) return []
    body = await response.text()
  } catch {
    return []
  }

  const candidates: NtfyDraftCandidate[] = []
  let lastCandidateId: string | null = null

  for (const line of body.split('\n')) {
    if (!line.trim()) continue
    let msg: NtfyMessage
    try {
      msg = JSON.parse(line)
    } catch {
      continue
    }
    if (!msg.message) continue
    const candidate = candidateFromMessage(msg.message)
    if (!candidate) continue
    candidates.push(candidate)
    lastCandidateId = msg.id ?? lastCandidateId
  }

  if (lastCandidateId) {
    await AsyncStorage.setItem(lastIdKey, lastCandidateId)
  }

  return candidates
}
