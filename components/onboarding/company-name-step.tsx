'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { companyNameSchema, type CompanyNameInput } from '@/lib/validations/onboarding'
import { updateCompanyName } from '@/app/(onboarding)/onboarding/actions'
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
import { toast } from 'sonner'

interface CompanyNameStepProps {
  initialName: string
  onComplete: () => void
}

export function CompanyNameStep({ initialName, onComplete }: CompanyNameStepProps) {
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<CompanyNameInput>({
    resolver: zodResolver(companyNameSchema),
    defaultValues: {
      companyName: initialName,
    },
  })

  async function onSubmit(data: CompanyNameInput) {
    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append('companyName', data.companyName)
      await updateCompanyName(formData)
      onComplete()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update company name')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl">What's your company called?</CardTitle>
        <CardDescription>
          This is how your company will appear across ComplyEur.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Acme Ltd"
                      autoFocus
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Continue'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
