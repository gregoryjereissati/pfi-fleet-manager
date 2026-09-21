import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AppLayout } from '@/layouts/AppLayout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AccessGate } from '@/components/AccessGate'

// O caminho de entrada é carregado junto com a aplicação: quem abre o login
// precisa ver o campo de senha, não esperar o resto do sistema.
import { Landing } from '@/pages/Landing'
import { Login } from '@/pages/Login'
import { Register } from '@/pages/Register'

// As demais telas chegam quando são abertas. É o que tira do pacote inicial os
// gráficos e todas as telas internas.
const Dashboard = lazy(() => import('@/pages/Dashboard').then((m) => ({ default: m.Dashboard })))
const VehicleList = lazy(() => import('@/pages/VehicleList').then((m) => ({ default: m.VehicleList })))
const VehicleForm = lazy(() => import('@/pages/VehicleForm').then((m) => ({ default: m.VehicleForm })))
const VehicleDetail = lazy(() => import('@/pages/VehicleDetail').then((m) => ({ default: m.VehicleDetail })))
const VehicleDrivers = lazy(() => import('@/pages/VehicleDrivers').then((m) => ({ default: m.VehicleDrivers })))
const DriverList = lazy(() => import('@/pages/DriverList').then((m) => ({ default: m.DriverList })))
const DriverDetail = lazy(() => import('@/pages/DriverDetail').then((m) => ({ default: m.DriverDetail })))
const DriverForm = lazy(() => import('@/pages/DriverForm').then((m) => ({ default: m.DriverForm })))
const ExpenseList = lazy(() => import('@/pages/ExpenseList').then((m) => ({ default: m.ExpenseList })))
const ExpenseForm = lazy(() => import('@/pages/ExpenseForm').then((m) => ({ default: m.ExpenseForm })))
const MaintenanceList = lazy(() => import('@/pages/MaintenanceList').then((m) => ({ default: m.MaintenanceList })))
const MaintenanceForm = lazy(() => import('@/pages/MaintenanceForm').then((m) => ({ default: m.MaintenanceForm })))
const DocumentList = lazy(() => import('@/pages/DocumentList').then((m) => ({ default: m.DocumentList })))
const DocumentForm = lazy(() => import('@/pages/DocumentForm').then((m) => ({ default: m.DocumentForm })))
const AlertCenter = lazy(() => import('@/pages/AlertCenter').then((m) => ({ default: m.AlertCenter })))
const CompanyList = lazy(() => import('@/pages/CompanyList').then((m) => ({ default: m.CompanyList })))
const UserList = lazy(() => import('@/pages/UserList').then((m) => ({ default: m.UserList })))
const Profile = lazy(() => import('@/pages/Profile').then((m) => ({ default: m.Profile })))

/**
 * Estado de carregamento da troca de tela.
 *
 * Sem isto, dividir o pacote apenas trocaria espera na abertura por uma tela
 * em branco na navegação.
 */
function RouteFallback() {
  const { t } = useTranslation()

  return (
    <div className="flex items-center justify-center py-20">
      <span className="text-sm text-white/40">{t('common.loading')}</span>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        element={
          <ProtectedRoute>
            <AccessGate>
              <AppLayout />
            </AccessGate>
          </ProtectedRoute>
        }
      >
        <Route
          path="/dashboard"
          element={
            <Suspense fallback={<RouteFallback />}>
              <Dashboard />
            </Suspense>
          }
        />
        <Route
          path="/vehicles"
          element={
            <Suspense fallback={<RouteFallback />}>
              <VehicleList />
            </Suspense>
          }
        />
        <Route
          path="/vehicles/new"
          element={
            <Suspense fallback={<RouteFallback />}>
              <VehicleForm />
            </Suspense>
          }
        />
        <Route
          path="/vehicles/:id"
          element={
            <Suspense fallback={<RouteFallback />}>
              <VehicleDetail />
            </Suspense>
          }
        />
        <Route
          path="/vehicles/:id/edit"
          element={
            <Suspense fallback={<RouteFallback />}>
              <VehicleForm />
            </Suspense>
          }
        />
        <Route
          path="/vehicles/:id/drivers"
          element={
            <Suspense fallback={<RouteFallback />}>
              <VehicleDrivers />
            </Suspense>
          }
        />
        <Route
          path="/drivers"
          element={
            <Suspense fallback={<RouteFallback />}>
              <DriverList />
            </Suspense>
          }
        />
        <Route
          path="/drivers/new"
          element={
            <Suspense fallback={<RouteFallback />}>
              <DriverForm />
            </Suspense>
          }
        />
        <Route
          path="/drivers/:id/edit"
          element={
            <Suspense fallback={<RouteFallback />}>
              <DriverForm />
            </Suspense>
          }
        />
        <Route
          path="/drivers/:id"
          element={
            <Suspense fallback={<RouteFallback />}>
              <DriverDetail />
            </Suspense>
          }
        />
        <Route
          path="/expenses"
          element={
            <Suspense fallback={<RouteFallback />}>
              <ExpenseList />
            </Suspense>
          }
        />
        <Route
          path="/expenses/new"
          element={
            <Suspense fallback={<RouteFallback />}>
              <ExpenseForm />
            </Suspense>
          }
        />
        <Route
          path="/expenses/:id/edit"
          element={
            <Suspense fallback={<RouteFallback />}>
              <ExpenseForm />
            </Suspense>
          }
        />
        <Route
          path="/maintenances"
          element={
            <Suspense fallback={<RouteFallback />}>
              <MaintenanceList />
            </Suspense>
          }
        />
        <Route
          path="/maintenances/new"
          element={
            <Suspense fallback={<RouteFallback />}>
              <MaintenanceForm />
            </Suspense>
          }
        />
        <Route
          path="/maintenances/:id/edit"
          element={
            <Suspense fallback={<RouteFallback />}>
              <MaintenanceForm />
            </Suspense>
          }
        />
        <Route
          path="/documents"
          element={
            <Suspense fallback={<RouteFallback />}>
              <DocumentList />
            </Suspense>
          }
        />
        <Route
          path="/documents/new"
          element={
            <Suspense fallback={<RouteFallback />}>
              <DocumentForm />
            </Suspense>
          }
        />
        <Route
          path="/documents/:id/edit"
          element={
            <Suspense fallback={<RouteFallback />}>
              <DocumentForm />
            </Suspense>
          }
        />
        <Route
          path="/alerts"
          element={
            <Suspense fallback={<RouteFallback />}>
              <AlertCenter />
            </Suspense>
          }
        />
        <Route
          path="/profile"
          element={
            <Suspense fallback={<RouteFallback />}>
              <Profile />
            </Suspense>
          }
        />
        <Route
          path="/users"
          element={
            <Suspense fallback={<RouteFallback />}>
              <UserList />
            </Suspense>
          }
        />
        {/*
          Tela de plataforma. A rota existe para todos, e o servidor recusa com
          403 quem não for super administrador — a barra lateral simplesmente
          não a oferece aos demais.
        */}
        <Route
          path="/companies"
          element={
            <Suspense fallback={<RouteFallback />}>
              <CompanyList />
            </Suspense>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
