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

export default function TestEndpointsPage() {
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
        updateResult('authCallback', 'success', `Status: ${response.status}, Redirected: ${response.redirected}`)
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
        updateResult('authCallbackWithCode', 'success', `Status: ${response.status}, Redirected: ${response.redirected}`)
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
        <p className="text-gray-600 mt-2">
          Test all server actions and API routes in your application
        </p>
      </div>

      {/* Test Data Input */}
      <Card>
        <CardHeader>
          <CardTitle>Test Data</CardTitle>
          <CardDescription>Configure test data for server actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div>
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

      {/* Server Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Server Actions</CardTitle>
          <CardDescription>Test server actions from app/(auth)/actions.ts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <div className="font-medium">login</div>
                <div className="text-sm text-gray-600">Authenticate user with email and password</div>
                {results.login && (
                  <div className={`text-sm mt-2 ${getStatusColor(results.login.status)}`}>
                    <span className="mr-2">{getStatusBadge(results.login.status)}</span>
                    {results.login.message}
                  </div>
                )}
              </div>
              <Button onClick={testLogin} disabled={results.login?.status === 'testing'}>
                Test
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <div className="font-medium">signup</div>
                <div className="text-sm text-gray-600">Create new user account and company</div>
                {results.signup && (
                  <div className={`text-sm mt-2 ${getStatusColor(results.signup.status)}`}>
                    <span className="mr-2">{getStatusBadge(results.signup.status)}</span>
                    {results.signup.message}
                  </div>
                )}
              </div>
              <Button onClick={testSignup} disabled={results.signup?.status === 'testing'}>
                Test
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <div className="font-medium">forgotPassword</div>
                <div className="text-sm text-gray-600">Send password reset email</div>
                {results.forgotPassword && (
                  <div className={`text-sm mt-2 ${getStatusColor(results.forgotPassword.status)}`}>
                    <span className="mr-2">{getStatusBadge(results.forgotPassword.status)}</span>
                    {results.forgotPassword.message}
                  </div>
                )}
              </div>
              <Button onClick={testForgotPassword} disabled={results.forgotPassword?.status === 'testing'}>
                Test
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <div className="font-medium">resetPassword</div>
                <div className="text-sm text-gray-600">Update user password</div>
                {results.resetPassword && (
                  <div className={`text-sm mt-2 ${getStatusColor(results.resetPassword.status)}`}>
                    <span className="mr-2">{getStatusBadge(results.resetPassword.status)}</span>
                    {results.resetPassword.message}
                  </div>
                )}
              </div>
              <Button onClick={testResetPassword} disabled={results.resetPassword?.status === 'testing'}>
                Test
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <div className="font-medium">logout</div>
                <div className="text-sm text-gray-600">Sign out current user</div>
                {results.logout && (
                  <div className={`text-sm mt-2 ${getStatusColor(results.logout.status)}`}>
                    <span className="mr-2">{getStatusBadge(results.logout.status)}</span>
                    {results.logout.message}
                  </div>
                )}
              </div>
              <Button onClick={testLogout} disabled={results.logout?.status === 'testing'}>
                Test
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Routes */}
      <Card>
        <CardHeader>
          <CardTitle>API Routes</CardTitle>
          <CardDescription>Test API routes from app/api/ and app/auth/</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <div className="font-medium">GET /auth/callback</div>
                <div className="text-sm text-gray-600">Auth callback handler (no code)</div>
                {results.authCallback && (
                  <div className={`text-sm mt-2 ${getStatusColor(results.authCallback.status)}`}>
                    <span className="mr-2">{getStatusBadge(results.authCallback.status)}</span>
                    {results.authCallback.message}
                  </div>
                )}
              </div>
              <Button onClick={testAuthCallback} disabled={results.authCallback?.status === 'testing'}>
                Test
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <div className="font-medium">GET /auth/callback?code=test_code</div>
                <div className="text-sm text-gray-600">Auth callback handler (with code)</div>
                {results.authCallbackWithCode && (
                  <div className={`text-sm mt-2 ${getStatusColor(results.authCallbackWithCode.status)}`}>
                    <span className="mr-2">{getStatusBadge(results.authCallbackWithCode.status)}</span>
                    {results.authCallbackWithCode.message}
                  </div>
                )}
              </div>
              <Button
                onClick={testAuthCallbackWithCode}
                disabled={results.authCallbackWithCode?.status === 'testing'}
              >
                Test
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Test Summary</CardTitle>
          <CardDescription>Overview of all test results</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.keys(results).length === 0 ? (
              <p className="text-gray-500 text-sm">
                No tests run yet. Click &quot;Test&quot; buttons above to start testing.
              </p>
            ) : (
              Object.values(results).map((result) => (
                <div key={result.endpoint} className="flex items-center justify-between p-2 border rounded">
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
