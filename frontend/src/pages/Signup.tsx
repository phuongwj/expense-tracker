import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import * as authService from '../services/authService'

import type { SignupInput } from '@expense-tracker/shared/auth'
import { signupSchema } from '@expense-tracker/shared/auth'
import { getErrorMessage, SUPPORT_EMAIL } from '../utils/errors'

type FormData = SignupInput

export default function Signup() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [apiError, setApiError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(signupSchema),
  })

  const onSubmit = async (data: FormData) => {
    setApiError('')
    setIsSubmitting(true)
    try {
      const user = await authService.signUp(data)
      login(user)
      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      setApiError(
        getErrorMessage(
          err,
          `Unable to create an account due to a server issue. Please try again, or contact ${SUPPORT_EMAIL} if the problem persists.`
        )
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const inp = (hasError: boolean) =>
    `w-full h-11 border rounded-xl px-3.5 text-sm outline-none transition ${
      hasError || apiError
        ? 'border-red-400 bg-red-50'
        : 'border-gray-200 focus:border-[#3D6B4F]'
    }`

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex w-[420px] shrink-0 bg-[#2D5240] flex-col justify-center p-12">
        <div className="text-3xl text-white font-bold mb-20">Expense Tracker</div>
        <div>
          <h1 className="text-4xl font-light text-white leading-tight mb-4">
            Get <strong>started</strong>
          </h1>
          <p className="text-white/60 text-sm leading-relaxed">
            Track your spending, split bills with friends, and get AI-powered
            insights into your habits.
          </p>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-8 bg-[#F2F0EA]">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-10">
          <h2 className="text-2xl font-semibold text-gray-900 mb-1">
            Create account
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Start tracking your expenses today
          </p>
          {apiError && (
            <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
              ⚠ {apiError}
            </div>
          )}
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="flex gap-3 mb-4">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1.5">
                  First name
                </label>
                <input
                  {...register('firstName')}
                  type="text"
                  placeholder="Alex"
                  className={inp(!!errors.firstName)}
                />
                {errors.firstName && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.firstName.message}
                  </p>
                )}
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1.5">
                  Last name
                </label>
                <input
                  {...register('lastName')}
                  type="text"
                  placeholder="Chen"
                  className={inp(!!errors.lastName)}
                />
                {errors.lastName && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.lastName.message}
                  </p>
                )}
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1.5">
                Email
              </label>
              <input
                {...register('email')}
                type="email"
                placeholder="alex@dal.ca"
                autoComplete="email"
                className={inp(!!errors.email)}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
              )}
            </div>
            <div className="mb-6">
              <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1.5">
                Password
              </label>
              <input
                {...register('password')}
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                className={inp(!!errors.password)}
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.password.message}
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 bg-[#3D6B4F] text-white rounded-xl font-semibold text-sm hover:bg-[#2D5240] transition disabled:opacity-60"
            >
              {isSubmitting ? 'Creating account...' : 'Create account →'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-5">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-[#3D6B4F] font-semibold hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
