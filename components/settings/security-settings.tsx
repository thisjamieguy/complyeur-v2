"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Shield, Key, Lock, History } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { updatePasswordAction } from "@/lib/actions/security"
import { MfaEnrollmentPanel } from "@/components/mfa/mfa-enrollment"

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[a-z]/, "Must contain a lowercase letter")
    .regex(/[0-9]/, "Must contain a number"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
})

type PasswordFormValues = z.infer<typeof passwordSchema>

export function SecuritySettings() {
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  })

  async function onPasswordSubmit(data: PasswordFormValues) {
    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append('currentPassword', data.currentPassword)
      formData.append('newPassword', data.newPassword)
      
      const result = await updatePasswordAction(null, formData)
      
      if (result.success) {
        toast.success(result.message)
        form.reset()
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error("Failed to update password")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-blue-600" />
            <CardTitle>Password & Authentication</CardTitle>
          </div>
          <CardDescription>
            Manage your password and sign-in methods
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onPasswordSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm New Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Updating..." : "Update Password"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            <CardTitle>Two-Factor Authentication (2FA)</CardTitle>
          </div>
          <CardDescription>
            Add an extra layer of security to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-slate-500">
            Use an app like Google Authenticator or Authy to generate verification codes.
          </p>
          <Separator />
          <MfaEnrollmentPanel />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-slate-600" />
            <CardTitle>Recent Activity</CardTitle>
          </div>
          <CardDescription>
            Recent security events on your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { event: "Password changed", location: "London, UK", time: "2 minutes ago", icon: Key },
              { event: "New login", location: "London, UK", time: "2 hours ago", icon: Shield },
              { event: "Security settings updated", location: "London, UK", time: "1 day ago", icon: Lock },
            ].map((activity, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-slate-100 rounded-full">
                    <activity.icon className="h-4 w-4 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{activity.event}</p>
                    <p className="text-xs text-slate-500">{activity.location}</p>
                  </div>
                </div>
                <span className="text-xs text-slate-400">{activity.time}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
