import { Route, Routes } from 'react-router-dom'
import { AdminOnly } from '../../components/auth/AdminOnly'
import { FamilyListPage } from '../../features/families/FamilyListPage'
import { FamilyDetailPage } from '../../features/families/FamilyDetailPage'
import { FamilyFormPage } from '../../features/families/FamilyFormPage'

export function SettingsRoutes() {
  return (
    <Routes>
      <Route
        path="families"
        element={
          <AdminOnly>
            <FamilyListPage />
          </AdminOnly>
        }
      />
      <Route
        path="families/new"
        element={
          <AdminOnly>
            <FamilyFormPage mode="create" />
          </AdminOnly>
        }
      />
      <Route
        path="families/:id"
        element={
          <AdminOnly>
            <FamilyDetailPage />
          </AdminOnly>
        }
      />
      <Route
        path="families/:id/edit"
        element={
          <AdminOnly>
            <FamilyFormPage mode="edit" />
          </AdminOnly>
        }
      />
    </Routes>
  )
} 