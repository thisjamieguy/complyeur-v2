import {
  DEFAULT_GANTT_TEMPLATE_OPTIONS,
  type GanttTemplateRange,
} from './template-config'

interface DownloadGanttTemplateOptions {
  employeeRows?: number
  pastRange?: GanttTemplateRange
  futureRange?: GanttTemplateRange
}

export async function downloadGanttTemplate(
  options: DownloadGanttTemplateOptions = {}
): Promise<void> {
  const employeeRows = options.employeeRows ?? DEFAULT_GANTT_TEMPLATE_OPTIONS.employeeRows
  const pastRange = options.pastRange ?? DEFAULT_GANTT_TEMPLATE_OPTIONS.pastRange
  const futureRange = options.futureRange ?? DEFAULT_GANTT_TEMPLATE_OPTIONS.futureRange

  const params = new URLSearchParams({
    employeeRows: String(employeeRows),
    pastUnit: pastRange.unit,
    pastValue: String(pastRange.value),
    futureUnit: futureRange.unit,
    futureValue: String(futureRange.value),
  })

  const response = await fetch(`/api/import/gantt-template?${params.toString()}`, {
    cache: 'no-store',
    credentials: 'same-origin',
  })

  if (!response.ok) {
    let message = 'We could not generate the Gantt template workbook.'

    try {
      const payload = (await response.json()) as { error?: string }
      if (payload.error) {
        message = payload.error
      }
    } catch {
      // Ignore JSON parsing failures and fall back to the default message.
    }

    throw new Error(message)
  }

  const blob = await response.blob()
  const filename = getFilenameFromDisposition(response.headers.get('content-disposition'))
  const downloadName = filename ?? 'complyeur-gantt-template.xlsx'
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = downloadName
  document.body.appendChild(link)
  link.click()
  link.remove()

  setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 0)
}

function getFilenameFromDisposition(contentDisposition: string | null): string | null {
  if (!contentDisposition) {
    return null
  }

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1])
  }

  const quotedMatch = contentDisposition.match(/filename="([^"]+)"/i)
  if (quotedMatch?.[1]) {
    return quotedMatch[1]
  }

  const bareMatch = contentDisposition.match(/filename=([^;]+)/i)
  return bareMatch?.[1]?.trim() ?? null
}
