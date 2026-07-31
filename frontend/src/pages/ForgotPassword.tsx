import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import * as authService from '../services/authService'

import type { ForgotPasswordInput, ResetPasswordInput } from '@expense-tracker/shared/auth'
import { forgotPasswordSchema, resetPasswordSchema } from '@expense-tracker/shared/auth'

const inp = (hasError: boolean) =>
  `w-full h-11 border rounded-xl px-3.5 text-sm outline-none transition ${
    hasError ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-[#3D6B4F]'
  }`

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [step, setStep] = useState<'request' | 'reset'>('request')
  const [email, setEmail] = useState('')
  const [apiError, setApiError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Step 1: request a code
  const requestForm = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onRequestSubmit = async (data: ForgotPasswordInput) => {
    setApiError('')
    setIsSubmitting(true)
    try {
      await authService.forgotPassword(data)
      setEmail(data.email)
      setStep('reset')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      setApiError(e.response?.data?.message ?? 'Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Step 2: submit code + new password
  const resetForm = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email },
  })

  const onResetSubmit = async (data: ResetPasswordInput) => {
    setApiError('')
    setIsSubmitting(true)
    try {
      await authService.resetPassword({ ...data, email })
      navigate('/login', { replace: true })
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      setApiError(e.response?.data?.message ?? 'Invalid or expired code. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex w-[420px] shrink-0 bg-[#2D5240] flex-col justify-between p-12">
        <div className="text-3xl text-white font-bold">Expense Tracker</div>
        <div>
          <h1 className="text-4xl font-light text-white leading-tight mb-4">Reset your <strong>password</strong></h1>
          <p className="text-white/60 text-sm leading-relaxed">
            We'll send a 6-digit code to your email so you can get back into your account.
          </p>
        </div>
        <div />
      </div>
      <div className="flex-1 flex items-center justify-center p-8 bg-[#F2F0EA]">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-10">
          {step === 'request' ? (
            <>
              <h2 className="text-2xl font-semibold text-gray-900 mb-1">Forgot password</h2>
              <p className="text-sm text-gray-500 mb-6">Enter your email and we'll send you a reset code</p>
              {apiError && (
                <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
                  ⚠ {apiError}
                </div>
              )}
              <form onSubmit={requestForm.handleSubmit(onRequestSubmit)} noValidate>
                <div className="mb-6">
                  <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1.5">Email</label>
                  <input {...requestForm.register('email')} type="email" placeholder="alex@dal.ca" autoComplete="email"
                    className={inp(!!requestForm.formState.errors.email)} />
                  {requestForm.formState.errors.email && (
                    <p className="mt-1 text-xs text-red-600">{requestForm.formState.errors.email.message}</p>
                  )}
                </div>
                <button type="submit" disabled={isSubmitting}
                  className="w-full h-12 bg-[#3D6B4F] text-white rounded-xl font-semibold text-sm hover:bg-[#2D5240] transition disabled:opacity-60">
                  {isSubmitting ? 'Sending...' : 'Send reset code →'}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-semibold text-gray-900 mb-1">Enter code</h2>
              <p className="text-sm text-gray-500 mb-6">
                If an account exists for <span className="font-medium text-gray-700">{email}</span>, a 6-digit code was sent
              </p>
              {apiError && (
                <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
                  ⚠ {apiError}
                </div>
              )}
              <form onSubmit={resetForm.handleSubmit(onResetSubmit)} noValidate>
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1.5">Code</label>
                  <input {...resetForm.register('code')} type="text" inputMode="numeric" maxLength={6} placeholder="123456"
                    className={inp(!!resetForm.formState.errors.code)} />
                  {resetForm.formState.errors.code && (
                    <p className="mt-1 text-xs text-red-600">{resetForm.formState.errors.code.message}</p>
                  )}
                </div>
                <div className="mb-6">
                  <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1.5">New password</label>
                  <input {...resetForm.register('password')} type="password" placeholder="••••••••" autoComplete="new-password"
                    className={inp(!!resetForm.formState.errors.password)} />
                  {resetForm.formState.errors.password && (
                    <p className="mt-1 text-xs text-red-600">{resetForm.formState.errors.password.message}</p>
                  )}
                </div>
                <button type="submit" disabled={isSubmitting}
                  className="w-full h-12 bg-[#3D6B4F] text-white rounded-xl font-semibold text-sm hover:bg-[#2D5240] transition disabled:opacity-60">
                  {isSubmitting ? 'Resetting...' : 'Reset password →'}
                </button>
              </form>
              <button onClick={() => setStep('request')} className="text-center w-full text-sm text-gray-500 mt-4 hover:underline">
                Use a different email
              </button>
            </>
          )}
          <p className="text-center text-sm text-gray-500 mt-5">
            Remembered it?{' '}
            <Link to="/login" className="text-[#3D6B4F] font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}