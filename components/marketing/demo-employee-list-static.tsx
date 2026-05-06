import {
  DemoEmployeeListRows,
  getAutonomousEmployees,
  type DemoEmployee,
} from '@/components/marketing/demo-employee-list-shared'

interface DemoEmployeeListStaticProps {
  employees?: DemoEmployee[]
  highlightedEmployeeName?: string
}

export function DemoEmployeeListStatic({
  employees,
  highlightedEmployeeName,
}: DemoEmployeeListStaticProps) {
  return (
    <DemoEmployeeListRows
      rows={employees ?? getAutonomousEmployees()}
      highlightedEmployeeName={highlightedEmployeeName}
    />
  )
}
