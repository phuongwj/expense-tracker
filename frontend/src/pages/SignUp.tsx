import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

const schema = z.object({
  firstName:       z.string().min(1, 'First name is required'),
  lastName:        z.string().min(1, 'Last name is required'),
  email:           z.string().email('Please enter a valid email'),
  university:      z.string().min(1, 'University is required'),
  password:        z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

type FormData = z.infer<typeof schema>

export default function SignUp() {
  const navigate  = useNavigate()
  const { login } = useAuth()
  const [apiError, setApiError]         = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setApiError('')
    setIsSubmitting(true)
    try {
      const res = await api.post('/auth/register', {
        firstName: data.firstName, lastName: data.lastName,
        email: data.email, university: data.university, password: data.password,
      })
      login(res.data.token, res.data.user)
      navigate('/dashboard')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      setApiError(e.response?.data?.message ?? 'Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const input = (hasError: boolean) =>
    `w-full h-11 border rounded-xl px-3.5 text-sm outline-none transition ${
      hasError ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-[#3D6B4F]'
    }`

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex w-[420px] shrink-0 bg-[#2D5240] flex-col justify-between p-12">
        <div className="text-3xl text-white font-bold">Expense Tracker</div>
        <div>
          <h1 className="text-4xl font-light text-white leading-tight mb-4">
            Take control of your <strong>student finances</strong>
          </h1>
          <p className="text-white/60 text-sm leading-relaxed">
            Track expenses, split costs with roommates, and get AI-powered insights.
          </p>
        </div>
        <div className="flex gap-10">
          <div><div className="text-3xl font-semibold text-white">2,400+</div><div className="text-xs text-white/50 mt-1">Dal students</div></div>
          <div><div className="text-3xl font-semibold text-white">$180</div><div className="text-xs text-white/50 mt-1">Avg. saved/month</div></div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-[#F2F0EA]">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm p-10">
          <h2 className="text-2xl font-semibold text-gray-900 mb-1">Create your account</h2>
          <p className="text-sm text-gray-500 mb-7">Free for university students</p>

          {apiError && (
            <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">⚠ {apiError}</div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1.5">First name</label>
                <input {...register('firstName')} placeholder="Alex" className={input(!!errors.firstName)} />
                {errors.firstName && <p className="mt-1 text-xs text-red-600">{errors.firstName.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1.5">Last name</label>
                <input {...register('lastName')} placeholder="Chen" className={input(!!errors.lastName)} />
                {errors.lastName && <p className="mt-1 text-xs text-red-600">{errors.lastName.message}</p>}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1.5">Student email</label>
              <input {...register('email')} type="email" placeholder="alex@dal.ca" className={input(!!errors.email)} />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1.5">University</label>
              <input {...register('university')} placeholder="Dalhousie University" className={input(!!errors.university)} />
              {errors.university && <p className="mt-1 text-xs text-red-600">{errors.university.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div>
                <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1.5">Password</label>
                <input {...register('password')} type="password" placeholder="Min 8 chars" className={input(!!errors.password)} />
                {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1.5">Confirm password</label>
                <input {...register('confirmPassword')} type="password" placeholder="Repeat" className={input(!!errors.confirmPassword)} />
                {errors.confirmPassword && <p className="mt-1 text-xs text-red-600">⚠ {errors.confirmPassword.message}</p>}
              </div>
            </div>

            <button type="submit" disabled={isSubmitting}
              className="w-full h-12 bg-[#3D6B4F] text-white rounded-xl font-semibold text-sm hover:bg-[#2D5240] transition disabled:opacity-60">
              {isSubmitting ? 'Creating account...' : 'Create account →'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-[#3D6B4F] font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}