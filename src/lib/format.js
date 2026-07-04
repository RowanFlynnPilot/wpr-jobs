export function formatPay(min, max, period) {
  if (min == null && max == null) return null
  const unit = period === 'hour' ? '/hr' : '/yr'
  const digits = period === 'hour' ? 2 : 0
  const fmt = (n) =>
    '$' + Number(n).toLocaleString('en-US', { maximumFractionDigits: digits })
  if (min != null && max != null && min !== max) {
    return `${fmt(min)}\u2013${fmt(max)}${unit}`
  }
  return `${fmt(min ?? max)}${unit}`
}

export function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function daysAgo(iso) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days <= 0) return 'Posted today'
  if (days === 1) return 'Posted yesterday'
  return `Posted ${days} days ago`
}

export function daysLeft(iso) {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000))
}
