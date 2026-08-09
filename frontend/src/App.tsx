import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import ProtectedRoute from './components/ProtectedRoute'
import Signup from './pages/Signup'
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Visualisation from './pages/Visualisation'
import Groups from './pages/Groups'
import GroupDetail from './pages/GroupDetail'
import SmartScan from './pages/SmartScan'
import ImportCsv from './pages/ImportCsv'
import ExportData from './pages/ExportData'
import AIInsights from './pages/AIInsights'
import Settings from './pages/Settings'
import Help from './pages/Help'

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Routes>
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/dashboard" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />
          <Route path="/transactions" element={
            <ProtectedRoute><Transactions /></ProtectedRoute>
          } />
          <Route path="/visualisation" element={
            <ProtectedRoute><Visualisation /></ProtectedRoute>
          } />
          <Route path="/groups" element={
            <ProtectedRoute><Groups /></ProtectedRoute>
          } />
          <Route path="/groups/:id" element={
            <ProtectedRoute><GroupDetail /></ProtectedRoute>
          } />
          <Route path="/smart-scan" element={
            <ProtectedRoute><SmartScan /></ProtectedRoute>
          } />
          <Route path="/import-csv" element={
            <ProtectedRoute><ImportCsv /></ProtectedRoute>
          } />
          <Route path="/export" element={
            <ProtectedRoute><ExportData /></ProtectedRoute>
          } />
          <Route path="/ai-insights" element={
            <ProtectedRoute><AIInsights /></ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute><Settings /></ProtectedRoute>
          } />
          <Route path="/help" element={
            <ProtectedRoute><Help /></ProtectedRoute>
          } />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </ToastProvider>
  )
}
