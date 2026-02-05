'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { Plus, Loader2 } from 'lucide-react'
import { addEmployeeAction } from '@/app/(dashboard)/actions'
import { employeeSchema, type EmployeeFormData } from '@/lib/validations/employee'
import { NATIONALITY_TYPE_LABELS, type NationalityType } from '@/lib/constants/nationality-types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { showSuccess, showError } from '@/lib/toast'
import { FormError } from '@/components/forms'

type AddEmployeeFormData = EmployeeFormData

export function AddEmployeeDialog() {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const router = useRouter()

  const form = useForm<AddEmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      name: '',
      nationality_type: 'uk_citizen',
    },
    mode: 'onBlur',
  })

  async function onSubmit(data: AddEmployeeFormData) {
    setIsLoading(true)
    setFormError(null)

    try {
      await addEmployeeAction(data)
      showSuccess('Employee added successfully')
      form.reset()
      setOpen(false)
      router.refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add employee'
      setFormError(message)
      showError('Failed to add employee', message)
    } finally {
      setIsLoading(false)
    }
  }

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen)
    if (!isOpen) {
      form.reset()
      setFormError(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Employee
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Employee</DialogTitle>
          <DialogDescription>
            Add a new employee to track their Schengen compliance.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {formError && (
              <FormError
                message={formError}
                onDismiss={() => setFormError(null)}
              />
            )}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter employee name"
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
              name="nationality_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nationality Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isLoading}
                      className="gap-2"
                    >
                      {(Object.entries(NATIONALITY_TYPE_LABELS) as [NationalityType, string][]).map(
                        ([value, label]) => (
                          <div key={value} className="flex items-center gap-2">
                            <RadioGroupItem value={value} id={`add-${value}`} />
                            <Label htmlFor={`add-${value}`} className="font-normal cursor-pointer">
                              {label}
                            </Label>
                          </div>
                        )
                      )}
                    </RadioGroup>
                  </FormControl>
                  <p className="text-xs text-slate-500">
                    EU/Schengen citizens are exempt from 90/180-day compliance tracking.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Employee'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
