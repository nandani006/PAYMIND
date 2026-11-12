import { describe, it, expect } from 'vitest'
import { formatCurrency, formatDate, formatDateTime, formatRelativeTime } from '../utils/formatters.js'

describe('Frontend Formatters Unit Tests', () => {
  it('formats currency correctly in USD', () => {
    expect(formatCurrency(350)).toBe('$350.00')
    expect(formatCurrency(12500.5)).toBe('$12,500.50')
  })

  it('formats dates consistently', () => {
    const formatted = formatDate('2026-11-10T12:00:00Z')
    expect(formatted).toContain('Nov')
    expect(formatted).toContain('2026')
  })

  it('formats date and time', () => {
    const formatted = formatDateTime('2026-11-10T14:30:00Z')
    expect(formatted).toContain('Nov')
    expect(formatted).toContain('2026')
  })

  it('computes relative time accurately', () => {
    const now = new Date()
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60000)
    expect(formatRelativeTime(fiveMinutesAgo.toISOString())).toBe('5m ago')

    const justNow = new Date(now.getTime() - 10000)
    expect(formatRelativeTime(justNow.toISOString())).toBe('just now')
  })
})

