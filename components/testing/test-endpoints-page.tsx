'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { login, signup, forgotPassword, resetPassword, logout } from '@/app/(auth)/actions'
import { toast } from 'sonner'

type TestResult = {
  endpoint: string
  status: 'idle' | 'testing' | 'success' | 'error'
  message: string
  timestamp?: string
}

export function TestEndpointsPage() {
  const [results, setResults] = useState<Record<string, TestResult>>({})
  const [testData, setTestData] = useState({
    name: 'Test User',
    email: 'test@example.com',
    password: 'TestPassword123!',
    confirmPassword: 'TestPassword123!',
    companyName: 'Test Company',
  })

  const updateResult = (endpoint: string, status: TestResult['status'], message: string) => {
    setResults((prev) => ({
      ...prev,
      [endpoint]: {
        endpoint,
        status,
        message,
        timestamp: new Date().toISOString(),
      },
    }))
  }

  const testLogin = async () => {
    updateResult('login', 'testing', 'Testing login...')
    try {
      const formData = new FormData()
      formData.append('email', testData.email)
      formData.append('password', testData.password)

      await login(formData)
      updateResult('login', 'success', 'Login successful (redirected)')
      toast.success('Login test completed')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      updateResult('login', 'error', message)
      toast.error(`Login test failed: ${message}`)
    }
  }

  const testSignup = async () => {
    updateResult('signup', 'testing', 'Testing signup...')
    try {
      const formData = new FormData()
      formData.append('name', testData.name)
      formData.append('email', testData.email)
      formData.append('password', testData.password)
      formData.append('confirmPassword', testData.confirmPassword)
      formData.append('companyName', testData.companyName)

      await signup(formData)
      updateResult('signup', 'success', 'Signup successful (redirected)')
      toast.success('Signup test completed')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      updateResult('signup', 'error', message)
      toast.error(`Signup test failed: ${message}`)
    }
  }

  const testForgotPassword = async () => {
    updateResult('forgotPassword', 'testing', 'Testing forgot password...')
    try {
      const formData = new FormData()
      formData.append('email', testData.email)

      const result = await forgotPassword(formData)
      if (result?.success) {
        updateResult('forgotPassword', 'success', result.message || 'Password reset email sent')
        toast.success('Forgot password test completed')
      } else {
        updateResult('forgotPassword', 'error', 'Unexpected response format')
        toast.error('Forgot password test failed')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      updateResult('forgotPassword', 'error', message)
      toast.error(`Forgot password test failed: ${message}`)
    }
  }

  const testResetPassword = async () => {
    updateResult('resetPassword', 'testing', 'Testing reset password...')
    try {
      const formData = new FormData()
      formData.append('password', testData.password)
      formData.append('confirmPassword', testData.confirmPassword)

      await resetPassword(formData)
      updateResult('resetPassword', 'success', 'Password reset successful (redirected)')
      toast.success('Reset password test completed')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      updateResult('resetPassword', 'error', message)
      toast.error(`Reset password test failed: ${message}`)
    }
  }

  const testLogout = async () => {
    updateResult('logout', 'testing', 'Testing logout...')
    try {
      await logout()
      updateResult('logout', 'success', 'Logout successful (redirected)')
      toast.success('Logout test completed')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      updateResult('logout', 'error', message)
      toast.error(`Logout test failed: ${message}`)
    }
  }

  const testAuthCallback = async () => {
    updateResult('authCallback', 'testing', 'Testing auth callback...')
    try {
      const baseUrl = window.location.origin
      const response = await fetch(`${baseUrl}/auth/callback`)

      if (response.ok || response.redirected) {
        updateResult(
          'authCallback',
          'success',
          `Status: ${response.status}, Redirected: ${response.redirected}`
        )
        toast.success('Auth callback test completed')
      } else {
        updateResult('authCallback', 'error', `Status: ${response.status}`)
        toast.error(`Auth callback test failed: ${response.status}`)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      updateResult('authCallback', 'error', message)
      toast.error(`Auth callback test failed: ${message}`)
    }
  }

  const testAuthCallbackWithCode = async () => {
    updateResult('authCallbackWithCode', 'testing', 'Testing auth callback with code...')
    try {
      const baseUrl = window.location.origin
      const response = await fetch(`${baseUrl}/auth/callback?code=test_code&next=/dashboard`)

      if (response.ok || response.redirected) {
        updateResult(
          'authCallbackWithCode',
          'success',
          `Status: ${response.status}, Redirected: ${response.redirected}`
        )
        toast.success('Auth callback with code test completed')
      } else {
        updateResult('authCallbackWithCode', 'error', `Status: ${response.status}`)
        toast.error(`Auth callback with code test failed: ${response.status}`)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      updateResult('authCallbackWithCode', 'error', message)
      toast.error(`Auth callback with code test failed: ${message}`)
    }
  }

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return 'text-green-600'
      case 'error':
        return 'text-red-600'
      case 'testing':
        return 'text-blue-600'
      default:
        return 'text-gray-600'
    }
  }

  const getStatusBadge = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return '✓'
      case 'error':
        return '✗'
      case 'testing':
        return '⟳'
      default:
        return '○'
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Endpoint Testing</h1>
        <p className="mt-2 text-gray-600">Test all server actions and API routes in your application</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Test Data</CardTitle>
          <CardDescription>Configure test data for server actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={testData.name}
                onChange={(e) => setTestData({ ...testData, name: e.target.value })}
                placeholder="Test User"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={testData.email}
                onChange={(e) => setTestData({ ...testData, email: e.target.value })}
                placeholder="test@example.com"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={testData.password}
                onChange={(e) => setTestData({ ...testData, password: e.target.value })}
                placeholder="TestPassword123!"
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={testData.confirmPassword}
                onChange={(e) => setTestData({ ...testData, confirmPassword: e.target.value })}
                placeholder="TestPassword123!"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={testData.companyName}
                onChange={(e) => setTestData({ ...testData, companyName: e.target.value })}
                placeholder="Test Company"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Authentication Actions</CardTitle>
          <CardDescription>Test auth server actions and callback route behavior</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          <Button onClick={testLogin}>Test Login</Button>
          <Button onClick={testSignup}>Test Signup</Button>
          <Button onClick={testForgotPassword}>Test Forgot Password</Button>
          <Button onClick={testResetPassword}>Test Reset Password</Button>
          <Button onClick={testLogout}>Test Logout</Button>
          <Button onClick={testAuthCallback}>Test Auth Callback</Button>
          <Button onClick={testAuthCallbackWithCode}>Test Callback With Code</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test Summary</CardTitle>
          <CardDescription>Overview of all test results</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.keys(results).length === 0 ? (
              <p className="text-sm text-gray-500">
                No tests run yet. Click &quot;Test&quot; buttons above to start testing.
              </p>
            ) : (
              Object.values(results).map((result) => (
                <div key={result.endpoint} className="flex items-center justify-between rounded border p-2">
                  <div className="flex items-center gap-2">
                    <span className={getStatusColor(result.status)}>{getStatusBadge(result.status)}</span>
                    <span className="font-medium">{result.endpoint}</span>
                  </div>
                  <div className={`text-sm ${getStatusColor(result.status)}`}>{result.message}</div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
