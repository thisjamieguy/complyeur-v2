import { describe, expect, it } from 'vitest'
import {
  jobCreateSchema,
  jobTripUpdateSchema,
  jobUpdateSchema,
} from '@/lib/validations/job'

const employeeA = '550e8400-e29b-41d4-a716-446655440000'
const employeeB = '550e8400-e29b-41d4-a716-446655440001'

function createValidJobData() {
  return {
    job_ref: ' JOB-1042 ',
    customer: ' Acme GmbH ',
    country: 'de',
    entry_date: '2026-06-01',
    exit_date: '2026-06-05',
    purpose: ' Site visit ',
    employees: [
      {
        employee_id: employeeA,
        country: 'de',
        entry_date: '2026-06-01',
        exit_date: '2026-06-05',
      },
      {
        employee_id: employeeB,
        country: 'fr',
        entry_date: '2026-06-02',
        exit_date: '2026-06-06',
      },
    ],
  }
}

describe('jobCreateSchema', () => {
  it('accepts a valid job and normalizes text and country codes', () => {
    const result = jobCreateSchema.safeParse(createValidJobData())

    expect(result.success).toBe(true)
    if (!result.success) throw new Error('Expected valid job')

    expect(result.data.job_ref).toBe('JOB-1042')
    expect(result.data.customer).toBe('Acme GmbH')
    expect(result.data.country).toBe('DE')
    expect(result.data.purpose).toBe('Site visit')
    expect(result.data.employees[0].country).toBe('DE')
    expect(result.data.employees[1].country).toBe('FR')
  })

  it('requires at least one employee', () => {
    const result = jobCreateSchema.safeParse({
      ...createValidJobData(),
      employees: [],
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message === 'Add at least one employee')).toBe(true)
    }
  })

  it('rejects duplicate employees', () => {
    const data = createValidJobData()
    const result = jobCreateSchema.safeParse({
      ...data,
      employees: [
        data.employees[0],
        {
          ...data.employees[1],
          employee_id: data.employees[0].employee_id,
        },
      ],
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message === 'Employee is already added to this job')).toBe(true)
    }
  })

  it('rejects invalid country codes and date ranges', () => {
    const result = jobCreateSchema.safeParse({
      ...createValidJobData(),
      country: 'ZZ',
      entry_date: '2026-06-10',
      exit_date: '2026-06-01',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message === 'Please select a valid country')).toBe(true)
      expect(result.error.issues.some((issue) => issue.message === 'Exit date must be on or after entry date')).toBe(true)
    }
  })
})

describe('jobUpdateSchema', () => {
  it('requires explicit apply-to-trips choice', () => {
    const result = jobUpdateSchema.safeParse({
      job_ref: 'JOB-1042',
      customer: 'Acme GmbH',
      country: 'DE',
      entry_date: '2026-06-01',
      exit_date: '2026-06-05',
      purpose: '',
    })

    expect(result.success).toBe(false)
  })
})

describe('jobTripUpdateSchema', () => {
  it('validates an employee trip override', () => {
    const result = jobTripUpdateSchema.safeParse({
      country: 'nl',
      entry_date: '2026-07-01',
      exit_date: '2026-07-03',
    })

    expect(result.success).toBe(true)
    if (!result.success) throw new Error('Expected valid trip update')

    expect(result.data.country).toBe('NL')
  })
})
