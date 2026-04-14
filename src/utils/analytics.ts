type AnalyticsParams = Record<string, unknown>

function getWindow(): any | null {
  if (typeof window === 'undefined') return null
  return window as any
}

export function trackEvent(eventName: string, params: AnalyticsParams = {}) {
  const w = getWindow()
  if (!w) return

  try {
    if (typeof w.gtag === 'function') {
      w.gtag('event', eventName, params)
    }
  } catch {
    // ignore
  }

  try {
    if (Array.isArray(w.dataLayer)) {
      w.dataLayer.push({ event: eventName, ...params })
    }
  } catch {
    // ignore
  }
}

