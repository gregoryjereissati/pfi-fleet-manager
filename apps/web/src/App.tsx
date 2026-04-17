import { Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'
import { Landing } from '@/pages/Landing'
import { Dashboard } from '@/pages/Dashboard'
import { VehicleList } from '@/pages/VehicleList'
import { VehicleForm } from '@/pages/VehicleForm'
import { VehicleDetail } from '@/pages/VehicleDetail'
import { VehicleDrivers } from '@/pages/VehicleDrivers'
import { DriverList } from '@/pages/DriverList'
import { DriverForm } from '@/pages/DriverForm'
import { ExpenseList } from '@/pages/ExpenseList'
import { ExpenseForm } from '@/pages/ExpenseForm'
import { MaintenanceList } from '@/pages/MaintenanceList'
import { MaintenanceForm } from '@/pages/MaintenanceForm'
import { DocumentList } from '@/pages/DocumentList'
import { DocumentForm } from '@/pages/DocumentForm'
import { AlertCenter } from '@/pages/AlertCenter'
import { ProtectedRoute } from '@/components/ProtectedRoute'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/vehicles" element={<VehicleList />} />
        <Route path="/vehicles/new" element={<VehicleForm />} />
        <Route path="/vehicles/:id" element={<VehicleDetail />} />
        <Route path="/vehicles/:id/edit" element={<VehicleForm />} />
        <Route path="/vehicles/:id/drivers" element={<VehicleDrivers />} />
        <Route path="/drivers" element={<DriverList />} />
        <Route path="/drivers/new" element={<DriverForm />} />
        <Route path="/drivers/:id/edit" element={<DriverForm />} />
        <Route path="/expenses" element={<ExpenseList />} />
        <Route path="/expenses/new" element={<ExpenseForm />} />
        <Route path="/maintenances" element={<MaintenanceList />} />
        <Route path="/maintenances/new" element={<MaintenanceForm />} />
        <Route path="/documents" element={<DocumentList />} />
        <Route path="/documents/new" element={<DocumentForm />} />
        <Route path="/documents/:id/edit" element={<DocumentForm />} />
        <Route path="/alerts" element={<AlertCenter />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
