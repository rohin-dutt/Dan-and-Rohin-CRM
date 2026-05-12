const FALLBACK_SITE_URL = 'https://dan-and-rohin-crm.vercel.app'

export function getSiteUrl() {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_VERCEL_URL ??
    FALLBACK_SITE_URL

  const normalizedUrl = siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`

  return normalizedUrl.replace(/\/$/, '')
}

export function getAuthCallbackUrl() {
  return `${getSiteUrl()}/auth/callback`
}
