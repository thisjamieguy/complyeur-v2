'use client'

import { useEffect, useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  DEFAULT_DATE_DISPLAY_FORMAT,
  DEFAULT_IMPORT_DATE_FORMAT,
  getStoredDateDisplayFormat,
  getStoredImportDateFormat,
  setStoredDateDisplayFormat,
  setStoredImportDateFormat,
  type DateDisplayFormat,
  type PreferredImportDateFormat,
} from '@/lib/import/date-preferences'

export function DateFormatPreferences() {
  const [importFormat, setImportFormat] = useState<PreferredImportDateFormat>(
    DEFAULT_IMPORT_DATE_FORMAT
  )
  const [displayFormat, setDisplayFormat] = useState<DateDisplayFormat>(
    DEFAULT_DATE_DISPLAY_FORMAT
  )

  useEffect(() => {
    setImportFormat(getStoredImportDateFormat())
    setDisplayFormat(getStoredDateDisplayFormat())
  }, [])

  const handleImportFormatChange = (value: string) => {
    const next = value === 'MM/DD' ? 'MM/DD' : 'DD/MM'
    setImportFormat(next)
    setStoredImportDateFormat(next)
  }

  const handleDisplayFormatChange = (value: string) => {
    const next = value === 'YYYY-MM-DD' ? 'YYYY-MM-DD' : 'DD-MM-YYYY'
    setDisplayFormat(next)
    setStoredDateDisplayFormat(next)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Date Format Preferences</CardTitle>
        <CardDescription>
          Set your default import interpretation and how dates are shown in import previews.
          These preferences are saved in this browser.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-900">Default import interpretation</p>
          <RadioGroup value={importFormat} onValueChange={handleImportFormatChange}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="DD/MM" id="import-ddmm" />
              <Label htmlFor="import-ddmm">DD/MM/YYYY (European)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="MM/DD" id="import-mmdd" />
              <Label htmlFor="import-mmdd">MM/DD/YYYY (US)</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-3 border-t pt-4">
          <p className="text-sm font-medium text-slate-900">Date display in import preview</p>
          <RadioGroup value={displayFormat} onValueChange={handleDisplayFormatChange}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="DD-MM-YYYY" id="display-ddmmyyyy" />
              <Label htmlFor="display-ddmmyyyy">DD-MM-YYYY</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="YYYY-MM-DD" id="display-yyyymmdd" />
              <Label htmlFor="display-yyyymmdd">YYYY-MM-DD</Label>
            </div>
          </RadioGroup>
        </div>
      </CardContent>
    </Card>
  )
}

