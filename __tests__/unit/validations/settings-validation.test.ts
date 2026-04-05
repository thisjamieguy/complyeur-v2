import { describe, test, expect } from 'vitest'
import {
  settingsSchema,
  dataPrivacySchema,
  riskThresholdsSchema,
  statusThresholdsSchema,
  forecastingSchema,
  calendarPreferencesSchema,
  notificationsSchema,
} from '@/lib/validations/settings'

const validSettings = {
  retention_months: 24,
  session_timeout_minutes: 30,
  risk_threshold_green: 30,
  risk_threshold_amber: 10,
  status_green_max: 60,
  status_amber_max: 75,
  status_red_max: 89,
  future_job_warning_threshold: 70,
  calendar_load_mode: 'all_employees' as const,
  notify_70_days: true,
  notify_85_days: true,
  notify_90_days: true,
  weekly_digest: false,
  custom_alert_threshold: null,
}

describe('settingsSchema', () => {
  test('accepts valid full settings object', () => {
    const result = settingsSchema.parse(validSettings)
    expect(result.retention_months).toBe(24)
  })

  describe('retention_months', () => {
    test('accepts minimum value 12', () => {
      expect(() => settingsSchema.parse({ ...validSettings, retention_months: 12 })).not.toThrow()
    })

    test('accepts maximum value 84', () => {
      expect(() => settingsSchema.parse({ ...validSettings, retention_months: 84 })).not.toThrow()
    })

    test('rejects below minimum', () => {
      expect(() => settingsSchema.parse({ ...validSettings, retention_months: 11 })).toThrow()
    })

    test('rejects above maximum', () => {
      expect(() => settingsSchema.parse({ ...validSettings, retention_months: 85 })).toThrow()
    })
  })

  describe('session_timeout_minutes', () => {
    test('accepts minimum 5', () => {
      expect(() =>
        settingsSchema.parse({ ...validSettings, session_timeout_minutes: 5 })
      ).not.toThrow()
    })

    test('accepts maximum 120', () => {
      expect(() =>
        settingsSchema.parse({ ...validSettings, session_timeout_minutes: 120 })
      ).not.toThrow()
    })

    test('rejects below minimum', () => {
      expect(() =>
        settingsSchema.parse({ ...validSettings, session_timeout_minutes: 4 })
      ).toThrow()
    })

    test('rejects above maximum', () => {
      expect(() =>
        settingsSchema.parse({ ...validSettings, session_timeout_minutes: 121 })
      ).toThrow()
    })
  })

  describe('risk threshold cross-field validation', () => {
    test('rejects when green is not greater than amber', () => {
      expect(() =>
        settingsSchema.parse({
          ...validSettings,
          risk_threshold_green: 10,
          risk_threshold_amber: 10,
        })
      ).toThrow('Green threshold must be greater than amber threshold')
    })

    test('rejects when amber is greater than green', () => {
      expect(() =>
        settingsSchema.parse({
          ...validSettings,
          risk_threshold_green: 5,
          risk_threshold_amber: 10,
        })
      ).toThrow()
    })

    test('accepts when green is greater than amber', () => {
      expect(() =>
        settingsSchema.parse({
          ...validSettings,
          risk_threshold_green: 30,
          risk_threshold_amber: 10,
        })
      ).not.toThrow()
    })
  })

  describe('status threshold cross-field validation', () => {
    test('rejects when green_max is not less than amber_max', () => {
      expect(() =>
        settingsSchema.parse({
          ...validSettings,
          status_green_max: 75,
          status_amber_max: 75,
          status_red_max: 89,
        })
      ).toThrow('Green threshold must be less than amber threshold')
    })

    test('rejects when amber_max is not less than red_max', () => {
      expect(() =>
        settingsSchema.parse({
          ...validSettings,
          status_green_max: 60,
          status_amber_max: 89,
          status_red_max: 89,
        })
      ).toThrow('Amber threshold must be less than red threshold')
    })

    test('accepts correct status threshold ordering', () => {
      expect(() =>
        settingsSchema.parse({
          ...validSettings,
          status_green_max: 60,
          status_amber_max: 75,
          status_red_max: 89,
        })
      ).not.toThrow()
    })
  })

  describe('custom_alert_threshold', () => {
    test('accepts null', () => {
      const result = settingsSchema.parse({ ...validSettings, custom_alert_threshold: null })
      expect(result.custom_alert_threshold).toBeNull()
    })

    test('accepts value within range', () => {
      const result = settingsSchema.parse({ ...validSettings, custom_alert_threshold: 70 })
      expect(result.custom_alert_threshold).toBe(70)
    })

    test('accepts minimum 60', () => {
      expect(() =>
        settingsSchema.parse({ ...validSettings, custom_alert_threshold: 60 })
      ).not.toThrow()
    })

    test('accepts maximum 85', () => {
      expect(() =>
        settingsSchema.parse({ ...validSettings, custom_alert_threshold: 85 })
      ).not.toThrow()
    })

    test('rejects below 60', () => {
      expect(() =>
        settingsSchema.parse({ ...validSettings, custom_alert_threshold: 59 })
      ).toThrow()
    })

    test('rejects above 85', () => {
      expect(() =>
        settingsSchema.parse({ ...validSettings, custom_alert_threshold: 86 })
      ).toThrow()
    })
  })

  describe('calendar_load_mode', () => {
    test('accepts all_employees', () => {
      expect(() =>
        settingsSchema.parse({ ...validSettings, calendar_load_mode: 'all_employees' })
      ).not.toThrow()
    })

    test('accepts employees_with_trips', () => {
      expect(() =>
        settingsSchema.parse({ ...validSettings, calendar_load_mode: 'employees_with_trips' })
      ).not.toThrow()
    })

    test('rejects invalid mode', () => {
      expect(() =>
        settingsSchema.parse({ ...validSettings, calendar_load_mode: 'none' })
      ).toThrow()
    })
  })

  describe('notification toggles', () => {
    test('accepts all notifications on', () => {
      const result = settingsSchema.parse({
        ...validSettings,
        notify_70_days: true,
        notify_85_days: true,
        notify_90_days: true,
        weekly_digest: true,
      })
      expect(result.weekly_digest).toBe(true)
    })

    test('accepts all notifications off', () => {
      const result = settingsSchema.parse({
        ...validSettings,
        notify_70_days: false,
        notify_85_days: false,
        notify_90_days: false,
        weekly_digest: false,
      })
      expect(result.notify_70_days).toBe(false)
    })
  })
})

describe('dataPrivacySchema', () => {
  test('accepts valid retention and timeout', () => {
    const result = dataPrivacySchema.parse({
      retention_months: 36,
      session_timeout_minutes: 60,
    })
    expect(result.retention_months).toBe(36)
  })

  test('rejects out-of-range retention', () => {
    expect(() =>
      dataPrivacySchema.parse({ retention_months: 6, session_timeout_minutes: 30 })
    ).toThrow()
  })
})

describe('riskThresholdsSchema', () => {
  test('accepts valid thresholds', () => {
    const result = riskThresholdsSchema.parse({
      risk_threshold_green: 30,
      risk_threshold_amber: 10,
    })
    expect(result.risk_threshold_green).toBe(30)
  })

  test('rejects green not greater than amber', () => {
    expect(() =>
      riskThresholdsSchema.parse({ risk_threshold_green: 10, risk_threshold_amber: 10 })
    ).toThrow()
  })
})

describe('statusThresholdsSchema', () => {
  test('accepts valid ordered thresholds', () => {
    const result = statusThresholdsSchema.parse({
      status_green_max: 60,
      status_amber_max: 75,
      status_red_max: 89,
    })
    expect(result.status_amber_max).toBe(75)
  })

  test('rejects green >= amber', () => {
    expect(() =>
      statusThresholdsSchema.parse({
        status_green_max: 75,
        status_amber_max: 75,
        status_red_max: 89,
      })
    ).toThrow()
  })

  test('rejects amber >= red', () => {
    expect(() =>
      statusThresholdsSchema.parse({
        status_green_max: 60,
        status_amber_max: 89,
        status_red_max: 89,
      })
    ).toThrow()
  })
})

describe('forecastingSchema', () => {
  test('accepts valid warning threshold', () => {
    expect(() =>
      forecastingSchema.parse({ future_job_warning_threshold: 75 })
    ).not.toThrow()
  })

  test('rejects below 50', () => {
    expect(() =>
      forecastingSchema.parse({ future_job_warning_threshold: 49 })
    ).toThrow()
  })

  test('rejects above 89', () => {
    expect(() =>
      forecastingSchema.parse({ future_job_warning_threshold: 90 })
    ).toThrow()
  })
})

describe('calendarPreferencesSchema', () => {
  test('accepts all_employees', () => {
    const result = calendarPreferencesSchema.parse({ calendar_load_mode: 'all_employees' })
    expect(result.calendar_load_mode).toBe('all_employees')
  })

  test('accepts employees_with_trips', () => {
    const result = calendarPreferencesSchema.parse({ calendar_load_mode: 'employees_with_trips' })
    expect(result.calendar_load_mode).toBe('employees_with_trips')
  })
})

describe('notificationsSchema', () => {
  test('accepts all notification settings', () => {
    const result = notificationsSchema.parse({
      notify_70_days: true,
      notify_85_days: false,
      notify_90_days: true,
      weekly_digest: true,
      custom_alert_threshold: 75,
    })
    expect(result.custom_alert_threshold).toBe(75)
  })

  test('accepts null custom threshold', () => {
    const result = notificationsSchema.parse({
      notify_70_days: false,
      notify_85_days: false,
      notify_90_days: false,
      weekly_digest: false,
      custom_alert_threshold: null,
    })
    expect(result.custom_alert_threshold).toBeNull()
  })
})
