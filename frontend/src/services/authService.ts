import api, { setAccessToken } from './api'
import type { SignupInput, LoginInput, ForgotPasswordInput, ResetPasswordInput } from '@expense-tracker/shared/auth'

export async function signUp(data: SignupInput) {
    const response = await api.post('/auth/signup', data)
    setAccessToken(response.data.accessToken)
    return response.data.user
}

export async function logIn(data: LoginInput) {
    const response = await api.post('/auth/login', data)
    setAccessToken(response.data.accessToken)
    return response.data.user
}

export async function logOut() {
  await api.post('/auth/logout')
  setAccessToken(null)
}

export async function getMe() {
  const response = await api.get('/auth/me')
  return response.data.user
}

export async function forgotPassword(data: ForgotPasswordInput) {
  const response = await api.post('/auth/forgot-password', data)
  return response.data
}

export async function resetPassword(data: ResetPasswordInput) {
  const response = await api.post('/auth/reset-password', data)
  return response.data
}