'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  DemoEmployeeListRows,
  getAutonomousEmployees,
  getAutonomousFrameCount,
  type DemoEmployee,
} from '@/components/marketing/demo-employee-list-shared'

interface DemoEmployeeListProps {
  employees?: DemoEmployee[]
  highlightedEmployeeName?: string
}

export function DemoEmployeeList({ employees, highlightedEmployeeName }: DemoEmployeeListProps) {
  const isControlled = Boolean(employees)
  const [frameIndex, setFrameIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  const autonomousEmployees = useMemo(() => getAutonomousEmployees(frameIndex), [frameIndex])
  const rows = employees ?? autonomousEmployees

  // Wait for browser idle before starting animation — keeps first paint free of interval work
  useEffect(() => {
    if (isControlled) return
    let id: number

    if ('requestIdleCallback' in window) {
      id = window.requestIdleCallback(() => setIsAnimating(true), { timeout: 2000 })
      return () => window.cancelIdleCallback(id)
    } else {
      id = setTimeout(() => setIsAnimating(true), 1000) as unknown as number
      return () => clearTimeout(id)
    }
  }, [isControlled])

  useEffect(() => {
    if (isControlled || !isAnimating) return

    const interval = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % getAutonomousFrameCount())
    }, 2500)

    return () => clearInterval(interval)
  }, [isControlled, isAnimating])

  return (
    <DemoEmployeeListRows
      rows={rows}
      highlightedEmployeeName={highlightedEmployeeName}
      animated
    />
  )
}

export { type DemoEmployee } from '@/components/marketing/demo-employee-list-shared'
export { DemoEmployeeList as DemoEmployeeListAnimated }
