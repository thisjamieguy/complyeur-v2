'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { Plus, Loader2 } from 'lucide-react'
import { z } from 'zod'
import { addEmployeeAction } from '@/app/(dashboard)/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

// Name pattern: allows letters (including accented), spaces, hyphens, apostrophes
const namePattern = /^[\p{L}\s\-']+$/u

// Schema for the add employee form (matches database structure)
const addEmployeeSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .trim()
    .refine(
      (val) => namePattern.test(val),
      'Name can only contain letters, spaces, hyphens, and apostrophes'
    ),
})

type AddEmployeeFormData = z.infer<typeof addEmployeeSchema>

export function AddEmployeeDialog() {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const router = useRouter()

  const form = useForm<AddEmployeeFormData>({
    resolver: zodResolver(addEmployeeSchema),
    defaultValues: {
      name: '',
    },
    mode: 'onBlur', // Validate on blur for immediate feedback
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
