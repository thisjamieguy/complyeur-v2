/**
 * Comprehensive tests for export type utility functions and constants.
 * Tests: riskLevelToStatus, statusToKey, forecastRiskToStatus,
 *        futureAlertStatusToKey, DATE_PRESETS, STATUS_COLORS
 */

import { describe, test, expect } from 'vitest'
import {
  riskLevelToStatus,
  statusToKey,
  forecastRiskToStatus,
  futureAlertStatusToKey,
  DATE_PRESETS,
  STATUS_COLORS,
} from '@/lib/exports/types'

// ─── riskLevelToStatus ───────────────────────────────────────────────────────

describe('riskLevelToStatus', () => {
  test('green → Compliant', () => {
    expect(riskLevelToStatus('green')).toBe('Compliant')
  })

  test('amber → At Risk', () => {
    expect(riskLevelToStatus('amber')).toBe('At Risk')
  })

  test('red → High Risk', () => {
    expect(riskLevelToStatus('red')).toBe('High Risk')
  })

  test('breach → Breach', () => {
    expect(riskLevelToStatus('breach')).toBe('Breach')
  })

  test('all four risk levels map to distinct statuses', () => {
    const statuses = new Set([
      riskLevelToStatus('green'),
      riskLevelToStatus('amber'),
      riskLevelToStatus('red'),
      riskLevelToStatus('breach'),
    ])
    expect(statuses.size).toBe(4)
  })
})

// ─── statusToKey ────────────────────────────────────────────────────────────

describe('statusToKey', () => {
  test('Compliant → compliant', () => {
    expect(statusToKey('Compliant')).toBe('compliant')
  })

  test('At Risk → at-risk', () => {
    expect(statusToKey('At Risk')).toBe('at-risk')
  })

  test('High Risk → non-compliant', () => {
    expect(statusToKey('High Risk')).toBe('non-compliant')
  })

  test('Breach → breach', () => {
    expect(statusToKey('Breach')).toBe('breach')
  })

  test('all four statuses produce distinct keys', () => {
    const keys = new Set([
      statusToKey('Compliant'),
      statusToKey('At Risk'),
      statusToKey('High Risk'),
      statusToKey('Breach'),
    ])
    expect(keys.size).toBe(4)
  })

  test('riskLevelToStatus and statusToKey are consistent for green/Compliant', () => {
    const status = riskLevelToStatus('green')
    expect(statusToKey(status)).toBe('compliant')
  })

  test('riskLevelToStatus and statusToKey are consistent for amber/At Risk', () => {
    const status = riskLevelToStatus('amber')
    expect(statusToKey(status)).toBe('at-risk')
  })

  test('riskLevelToStatus and statusToKey are consistent for red/High Risk', () => {
    const status = riskLevelToStatus('red')
    expect(statusToKey(status)).toBe('non-compliant')
  })
})

// ─── forecastRiskToStatus ────────────────────────────────────────────────────

describe('forecastRiskToStatus', () => {
  test('green → Safe', () => {
    expect(forecastRiskToStatus('green')).toBe('Safe')
  })

  test('yellow → At Risk', () => {
    expect(forecastRiskToStatus('yellow')).toBe('At Risk')
  })

  test('red → Critical', () => {
    expect(forecastRiskToStatus('red')).toBe('Critical')
  })

  test('all three forecast risk levels map to distinct statuses', () => {
    const statuses = new Set([
      forecastRiskToStatus('green'),
      forecastRiskToStatus('yellow'),
      forecastRiskToStatus('red'),
    ])
    expect(statuses.size).toBe(3)
  })
})

// ─── futureAlertStatusToKey ──────────────────────────────────────────────────

describe('futureAlertStatusToKey', () => {
  test('Safe → compliant', () => {
    expect(futureAlertStatusToKey('Safe')).toBe('compliant')
  })

  test('At Risk → at-risk', () => {
    expect(futureAlertStatusToKey('At Risk')).toBe('at-risk')
  })

  test('Critical → non-compliant', () => {
    expect(futureAlertStatusToKey('Critical')).toBe('non-compliant')
  })

  test('all three statuses produce distinct keys', () => {
    const keys = new Set([
      futureAlertStatusToKey('Safe'),
      futureAlertStatusToKey('At Risk'),
      futureAlertStatusToKey('Critical'),
    ])
    expect(keys.size).toBe(3)
  })

  test('forecastRiskToStatus and futureAlertStatusToKey are consistent for green/Safe', () => {
    const status = forecastRiskToStatus('green')
    expect(futureAlertStatusToKey(status)).toBe('compliant')
  })

  test('forecastRiskToStatus and futureAlertStatusToKey are consistent for red/Critical', () => {
    const status = forecastRiskToStatus('red')
    expect(futureAlertStatusToKey(status)).toBe('non-compliant')
  })
})

// ─── DATE_PRESETS ────────────────────────────────────────────────────────────

describe('DATE_PRESETS', () => {
  test('contains exactly 7 presets', () => {
    expect(DATE_PRESETS).toHaveLength(7)
  })

  test('first preset is "Last 30 days" with days: 30', () => {
    expect(DATE_PRESETS[0].label).toBe('Last 30 days')
    expect(DATE_PRESETS[0].days).toBe(30)
  })

  test('second preset is "Last 90 days" with days: 90', () => {
    expect(DATE_PRESETS[1].label).toBe('Last 90 days')
    expect(DATE_PRESETS[1].days).toBe(90)
  })

  test('third preset is "Last 180 days" with days: 180', () => {
    expect(DATE_PRESETS[2].label).toBe('Last 180 days')
    expect(DATE_PRESETS[2].days).toBe(180)
  })

  test('includes a "This quarter" preset of type quarter', () => {
    const quarterPreset = DATE_PRESETS.find((p) => p.label === 'This quarter')
    expect(quarterPreset).toBeDefined()
    expect(quarterPreset?.type).toBe('quarter')
  })

  test('includes a "Last quarter" preset of type last-quarter', () => {
    const preset = DATE_PRESETS.find((p) => p.label === 'Last quarter')
    expect(preset).toBeDefined()
    expect(preset?.type).toBe('last-quarter')
  })

  test('includes a "Year to date" preset of type ytd', () => {
    const preset = DATE_PRESETS.find((p) => p.label === 'Year to date')
    expect(preset).toBeDefined()
    expect(preset?.type).toBe('ytd')
  })

  test('last preset is "Custom range" with type custom', () => {
    const last = DATE_PRESETS[DATE_PRESETS.length - 1]
    expect(last.label).toBe('Custom range')
    expect(last.type).toBe('custom')
  })

  test('all presets have a label string', () => {
    for (const preset of DATE_PRESETS) {
      expect(typeof preset.label).toBe('string')
      expect(preset.label.length).toBeGreaterThan(0)
    }
  })
})

// ─── STATUS_COLORS ───────────────────────────────────────────────────────────

describe('STATUS_COLORS', () => {
  test('compliant entry has green-flavoured CSS classes', () => {
    expect(STATUS_COLORS.compliant.bg).toContain('green')
    expect(STATUS_COLORS.compliant.text).toContain('green')
  })

  test('compliant PDF colors use green hex values', () => {
    expect(STATUS_COLORS.compliant.pdf.text).toMatch(/#[0-9A-F]{6}/i)
    // Green PDF text should not be dark/red
    expect(STATUS_COLORS.compliant.pdf.text).toBe('#16A34A')
  })

  test('at-risk entry uses amber CSS classes', () => {
    expect(STATUS_COLORS['at-risk'].bg).toContain('amber')
    expect(STATUS_COLORS['at-risk'].text).toContain('amber')
  })

  test('non-compliant entry uses red CSS classes', () => {
    expect(STATUS_COLORS['non-compliant'].bg).toContain('red')
    expect(STATUS_COLORS['non-compliant'].text).toContain('red')
  })

  test('breach entry uses dark/slate styling', () => {
    expect(STATUS_COLORS.breach.bg).toContain('slate')
    // PDF background should be very dark
    expect(STATUS_COLORS.breach.pdf.bg).toBe('#0F172A')
  })

  test('breach PDF text is white for contrast', () => {
    expect(STATUS_COLORS.breach.pdf.text).toBe('#FFFFFF')
  })

  test('each status has bg, text, border, and pdf fields', () => {
    for (const key of ['compliant', 'at-risk', 'non-compliant', 'breach'] as const) {
      const entry = STATUS_COLORS[key]
      expect(entry).toHaveProperty('bg')
      expect(entry).toHaveProperty('text')
      expect(entry).toHaveProperty('border')
      expect(entry).toHaveProperty('pdf')
      expect(entry.pdf).toHaveProperty('bg')
      expect(entry.pdf).toHaveProperty('text')
    }
  })
})
