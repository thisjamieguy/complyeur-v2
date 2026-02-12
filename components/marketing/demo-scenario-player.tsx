'use client'

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react'
import { cn } from '@/lib/utils'
import { DemoEmployeeList, type DemoEmployee } from '@/components/marketing/demo-employee-list'

export type DemoSceneId = 'baseline' | 'risk' | 'recommendation' | 'resolved'

export interface DemoScene {
  id: DemoSceneId
  title: string
  description: string
  action: string
  employees: DemoEmployee[]
  highlightedEmployeeName?: string
  kpis: {
    compliant: number
    atRisk: number
    nonCompliant: number
    leadTimeDays: number
  }
}

export interface DemoScenarioPlayerProps {
  autoPlay?: boolean
  intervalMs?: number
  onSceneChange?: (sceneId: DemoScene['id']) => void
  onPlaybackChange?: (isPaused: boolean) => void
}

export interface DemoScenarioPlayerHandle {
  goToPrevious: () => void
  goToNext: () => void
  togglePause: () => void
  setPaused: (paused: boolean) => void
}

export const DEMO_SCENES: DemoScene[] = [
  {
    id: 'baseline',
    title: 'Baseline: team operating in the safe zone',
    description: 'Most travellers remain compliant with enough buffer for upcoming trips.',
    action: 'Action: Continue monitoring planned travel against the rolling window.',
    kpis: {
      compliant: 4,
      atRisk: 1,
      nonCompliant: 0,
      leadTimeDays: 19,
    },
    employees: [
      { id: 1, name: 'Ken Adams', daysUsed: 68, daysRemaining: 22, status: 'amber', lastTrip: '03 Feb 2026' },
      { id: 2, name: 'James Davies', daysUsed: 44, daysRemaining: 46, status: 'green', lastTrip: '28 Jan 2026' },
      { id: 3, name: 'Emma Thompson', daysUsed: 57, daysRemaining: 33, status: 'green', lastTrip: '25 Jan 2026' },
      { id: 4, name: 'Michael Park', daysUsed: 39, daysRemaining: 51, status: 'green', lastTrip: '21 Jan 2026' },
      { id: 5, name: 'Lisa Martinez', daysUsed: 61, daysRemaining: 29, status: 'green', lastTrip: '02 Feb 2026' },
    ],
  },
  {
    id: 'risk',
    title: 'Risk detected: upcoming itinerary creates a breach',
    description: 'A newly logged trip pushes Ken Adams beyond the 90-day threshold.',
    action: 'Action: Flag raised automatically before travel approval is finalized.',
    highlightedEmployeeName: 'Ken Adams',
    kpis: {
      compliant: 3,
      atRisk: 1,
      nonCompliant: 1,
      leadTimeDays: 9,
    },
    employees: [
      { id: 1, name: 'Ken Adams', daysUsed: 93, daysRemaining: -3, status: 'red', lastTrip: '10 Feb 2026' },
      { id: 2, name: 'James Davies', daysUsed: 47, daysRemaining: 43, status: 'green', lastTrip: '28 Jan 2026' },
      { id: 3, name: 'Emma Thompson', daysUsed: 63, daysRemaining: 27, status: 'amber', lastTrip: '25 Jan 2026' },
      { id: 4, name: 'Michael Park', daysUsed: 41, daysRemaining: 49, status: 'green', lastTrip: '21 Jan 2026' },
      { id: 5, name: 'Lisa Martinez', daysUsed: 65, daysRemaining: 25, status: 'green', lastTrip: '02 Feb 2026' },
    ],
  },
  {
    id: 'recommendation',
    title: 'Recommendation: delay trip by 3 days',
    description: 'ComplyEur suggests shifting travel dates to avoid a hard breach.',
    action: 'Action: Proposed change is shared with ops and traveler for approval.',
    highlightedEmployeeName: 'Ken Adams',
    kpis: {
      compliant: 3,
      atRisk: 2,
      nonCompliant: 0,
      leadTimeDays: 14,
    },
    employees: [
      { id: 1, name: 'Ken Adams', daysUsed: 86, daysRemaining: 4, status: 'amber', lastTrip: '13 Feb 2026 (proposed)' },
      { id: 2, name: 'James Davies', daysUsed: 47, daysRemaining: 43, status: 'green', lastTrip: '28 Jan 2026' },
      { id: 3, name: 'Emma Thompson', daysUsed: 67, daysRemaining: 23, status: 'amber', lastTrip: '25 Jan 2026' },
      { id: 4, name: 'Michael Park', daysUsed: 41, daysRemaining: 49, status: 'green', lastTrip: '21 Jan 2026' },
      { id: 5, name: 'Lisa Martinez', daysUsed: 65, daysRemaining: 25, status: 'green', lastTrip: '02 Feb 2026' },
    ],
  },
  {
    id: 'resolved',
    title: 'Resolved: schedule adjusted, team back in control',
    description: 'The itinerary change removes the immediate breach and restores compliance.',
    action: 'Action: Continue with approved trip and monitor remaining buffer in real time.',
    kpis: {
      compliant: 4,
      atRisk: 1,
      nonCompliant: 0,
      leadTimeDays: 17,
    },
    employees: [
      { id: 1, name: 'Ken Adams', daysUsed: 79, daysRemaining: 11, status: 'amber', lastTrip: '13 Feb 2026' },
      { id: 2, name: 'James Davies', daysUsed: 49, daysRemaining: 41, status: 'green', lastTrip: '28 Jan 2026' },
      { id: 3, name: 'Emma Thompson', daysUsed: 61, daysRemaining: 29, status: 'green', lastTrip: '25 Jan 2026' },
      { id: 4, name: 'Michael Park', daysUsed: 43, daysRemaining: 47, status: 'green', lastTrip: '21 Jan 2026' },
      { id: 5, name: 'Lisa Martinez', daysUsed: 63, daysRemaining: 27, status: 'green', lastTrip: '02 Feb 2026' },
    ],
  },
]

const LOOP_PAUSE_MS = 1500

export const DEMO_SCENE_STEPS: Array<{ id: DemoSceneId; label: string }> = [
  { id: 'baseline', label: 'Baseline' },
  { id: 'risk', label: 'Risk Detected' },
  { id: 'recommendation', label: 'Recommendation' },
  { id: 'resolved', label: 'Resolved' },
]

export const DemoScenarioPlayer = forwardRef<DemoScenarioPlayerHandle, DemoScenarioPlayerProps>(
  function DemoScenarioPlayer(
    {
      autoPlay = true,
      intervalMs = 6000,
      onSceneChange,
      onPlaybackChange,
    }: DemoScenarioPlayerProps,
    ref
  ) {
    const [sceneIndex, setSceneIndex] = useState(0)
    const [isInteractionPaused, setIsInteractionPaused] = useState(false)
    const [isManuallyPaused, setIsManuallyPaused] = useState(false)
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

    useEffect(() => {
      if (typeof window === 'undefined' || !window.matchMedia) return

      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
      const updateMotionPreference = () => setPrefersReducedMotion(mediaQuery.matches)

      updateMotionPreference()
      mediaQuery.addEventListener('change', updateMotionPreference)

      return () => mediaQuery.removeEventListener('change', updateMotionPreference)
    }, [])

    const isPaused = isInteractionPaused || isManuallyPaused || prefersReducedMotion
    const isPlaybackToggledOff = isManuallyPaused || prefersReducedMotion

    const goToNext = useCallback(() => {
      setSceneIndex((prev) => (prev + 1) % DEMO_SCENES.length)
    }, [])

    const goToPrevious = useCallback(() => {
      setSceneIndex((prev) => (prev - 1 + DEMO_SCENES.length) % DEMO_SCENES.length)
    }, [])

    useImperativeHandle(
      ref,
      () => ({
        goToNext,
        goToPrevious,
        togglePause: () => setIsManuallyPaused((prev) => !prev),
        setPaused: (paused: boolean) => setIsManuallyPaused(paused),
      }),
      [goToNext, goToPrevious]
    )

    useEffect(() => {
      if (!autoPlay || isPaused) return

      const isLastScene = sceneIndex === DEMO_SCENES.length - 1
      const delay = isLastScene ? intervalMs + LOOP_PAUSE_MS : intervalMs

      const timer = setTimeout(() => {
        setSceneIndex((prev) => (prev + 1) % DEMO_SCENES.length)
      }, delay)

      return () => clearTimeout(timer)
    }, [autoPlay, intervalMs, isPaused, sceneIndex])

    const currentScene = DEMO_SCENES[sceneIndex]

    useEffect(() => {
      onSceneChange?.(currentScene.id)
    }, [currentScene.id, onSceneChange])

    useEffect(() => {
      onPlaybackChange?.(isPlaybackToggledOff)
    }, [isPlaybackToggledOff, onPlaybackChange])

    const sceneLabel = useMemo(
      () =>
        `${sceneIndex + 1} of ${DEMO_SCENES.length}: ${currentScene.title}. ${currentScene.description}`,
      [currentScene.description, currentScene.title, sceneIndex]
    )

    return (
      <div
        className="bg-white"
        onMouseEnter={() => setIsInteractionPaused(true)}
        onMouseLeave={() => setIsInteractionPaused(false)}
        onFocusCapture={() => setIsInteractionPaused(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setIsInteractionPaused(false)
          }
        }}
      >
        <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3 sm:px-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">
            Guided walkthrough
          </p>
          <h3 className="mt-1 text-base font-semibold text-slate-900">{currentScene.title}</h3>
          <p className="mt-1 text-sm text-slate-600">{currentScene.description}</p>
          <p className="mt-2 text-sm font-medium text-slate-700">{currentScene.action}</p>
        </div>

        <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {sceneLabel}
        </p>

        <DemoEmployeeList
          employees={currentScene.employees}
          highlightedEmployeeName={currentScene.highlightedEmployeeName}
        />

        {prefersReducedMotion && (
          <div
            className={cn(
              'border-t border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600 sm:px-5',
              'motion-reduce:transition-none'
            )}
          >
            Autoplay is disabled because reduced motion is enabled in your system settings.
          </div>
        )}
      </div>
    )
  }
)
