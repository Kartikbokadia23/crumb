import AsyncStorage from '@react-native-async-storage/async-storage'

// Free, no-signup relay: the Shortcut on the phone POSTs matched SMS text here,
// and the app polls it instead of foregrounding via a URL scheme (which iOS
// always blocks with a confirmation prompt when triggered by an automation).
const NTFY_TOPIC = 'crumb-sms-e33498fb9851'
const NTFY_POLL_URL = `https://ntfy.sh/${NTFY_TOPIC}/json?poll=1`
const LAST_ID_KEY = 'crumb_ntfy_last_id'

export type NtfyDraftCandidate = {
  text: string
  sender: string
}

type NtfyMessage = {
  id: string
  message?: string
}

export async function pollNtfyDraftCandidates(): Promise<NtfyDraftCandidate[]> {
  const since = await AsyncStorage.getItem(LAST_ID_KEY)
  const url = since ? `${NTFY_POLL_URL}&since=${since}` : `${NTFY_POLL_URL}&since=24h`

  let body: string
  try {
    const response = await fetch(url)
    if (!response.ok) return []
    body = await response.text()
  } catch {
    return []
  }

  const candidates: NtfyDraftCandidate[] = []
  let lastId: string | null = null

  for (const line of body.split('\n')) {
    if (!line.trim()) continue
    let msg: NtfyMessage
    try {
      msg = JSON.parse(line)
    } catch {
      continue
    }
    lastId = msg.id ?? lastId
    if (!msg.message) continue
    try {
      const payload = JSON.parse(msg.message) as Partial<NtfyDraftCandidate>
      if (payload.text) {
        candidates.push({ text: payload.text, sender: payload.sender ?? 'Messages' })
      }
    } catch {
      continue
    }
  }

  if (lastId) {
    await AsyncStorage.setItem(LAST_ID_KEY, lastId)
  }

  return candidates
}
