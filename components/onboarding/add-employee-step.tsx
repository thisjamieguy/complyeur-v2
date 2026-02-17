'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { addEmployeeSchema, type AddEmployeeInput } from '@/lib/validations/onboarding'
import { addFirstEmployee } from '@/app/(onboarding)/onboarding/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

interface AddEmployeeStepProps {
  onComplete: () => void
  onSkip: () => void
  onBack: () => void
}

export function AddEmployeeStep({ onComplete, onSkip, onBack }: AddEmployeeStepProps) {
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<AddEmployeeInput>({
    resolver: zodResolver(addEmployeeSchema),
    defaultValues: {
      name: '',
      nationalityType: 'uk_citizen',
    },
  })

  async function onSubmit(data: AddEmployeeInput) {
    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append('name', data.name)
      formData.append('nationalityType', data.nationalityType)
      await addFirstEmployee(formData)
      toast.success('Employee added')
      onComplete()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add employee')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl">Add your first employee</CardTitle>
        <CardDescription>
          Start tracking Schengen compliance. You can add more employees later.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Employee name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Jane Smith"
                      autoFocus
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="nationalityType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nationality type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select nationality type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="uk_citizen">UK Citizen</SelectItem>
                      <SelectItem value="eu_schengen_citizen">EU/Schengen Citizen</SelectItem>
                      <SelectItem value="rest_of_world">Rest of World</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onBack} disabled={isLoading} className="flex-1">
                Back
              </Button>
              <Button type="button" variant="ghost" onClick={onSkip} disabled={isLoading}>
                Skip
              </Button>
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? 'Adding...' : 'Continue'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
