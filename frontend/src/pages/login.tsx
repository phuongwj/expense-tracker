import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

const schema = z.object({
  email:    z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),})

type FormData = z.infer<typeof schema>

export default function Login() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { login } = useAuth()
  const [apiError, setApiError]         = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const from = (location.state as { from?: string })?.from ?? '/dashboard'

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setApiError('')
    setIsSubmitting(true)
    try {
      const res = await api.post('/auth/login', { email: data.email, password: data.password })
      login(res.data.accessToken, res.data.user)
      navigate(from, { replace: true })
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      setApiError(e.response?.data?.message ?? 'Incorrect email or password. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const inp = (hasError: boolean) =>
    `w-full h-11 border rounded-xl px-3.5 text-sm outline-none transition ${
      hasError || apiError ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-[#3D6B4F]'
    }`

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex w-[420px] shrink-0 bg-[#2D5240] flex-col justify-center p-12">
        <div className="text-3xl text-white font-bold mb-20">Expense Tracker</div>
        <div>
          <h1 className="text-4xl font-light text-white leading-tight mb-4">Welcome <strong>back</strong></h1>
          <p className="text-white/60 text-sm leading-relaxed">
            Sign in to view your transactions, check group balances, and see your AI-powered insights.
          </p>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-8 bg-[#F2F0EA]">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-10">
          <h2 className="text-2xl font-semibold text-gray-900 mb-1">Sign in</h2>
          <p className="text-sm text-gray-500 mb-6">Enter your credentials to continue</p>
          {apiError && (
            <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
              ⚠ {apiError}
            </div>
          )}
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1.5">Email</label>
              <input {...register('email')} type="email" placeholder="alex@dal.ca" autoComplete="email" className={inp(!!errors.email)} />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </div>
            <div className="mb-2">
              <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1.5">Password</label>
              <input {...register('password')} type="password" placeholder="••••••••" autoComplete="current-password" className={inp(!!errors.password)} />
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
            </div>
            <div className="flex justify-end mb-6">
              <Link to="/forgot-password" className="text-sm text-[#3D6B4F] font-medium hover:underline">Forgot password?</Link>
            </div>
            <button type="submit" disabled={isSubmitting}
              className="w-full h-12 bg-[#3D6B4F] text-white rounded-xl font-semibold text-sm hover:bg-[#2D5240] transition disabled:opacity-60">
              {isSubmitting ? 'Signing in...' : 'Sign in →'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-5">
            Do not have an account?{' '}
            <Link to="/signup" className="text-[#3D6B4F] font-semibold hover:underline">Sign up free</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
