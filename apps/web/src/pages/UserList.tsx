import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { UserStatus, UserRole } from '@fleet-manager/shared'
import { useUsers } from '@/hooks/useUsers'

const PROTECTED_ADMIN_EMAIL = 'admin@fleet-manager.com'

const statusColors: Record<UserStatus, string> = {
  [UserStatus.ACTIVE]: 'bg-green-100 text-green-700',
  [UserStatus.PENDING]: 'bg-yellow-100 text-yellow-700',
  [UserStatus.BLOCKED]: 'bg-red-100 text-red-700',
}

export function UserList() {
  const { t } = useTranslation()
  const { users, loading, error, savingId, updateRole, updateStatus, deleteUser, roles } =
    useUsers()
  const [approveRole, setApproveRole] = useState<Record<string, UserRole>>({})

  if (loading) return <p className="text-gray-500">{t('common.loading')}</p>
  if (error) return <p className="text-red-500">{error}</p>

  function handleDelete(id: string, name: string) {
    if (window.confirm(t('users.deleteConfirm', { name }))) {
      void deleteUser(id)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('users.title')}</h1>
        <p className="text-sm text-gray-500">{t('users.subtitle')}</p>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="border-b border-gray-200 text-left text-gray-600">
                <th className="px-4 py-3 font-medium">{t('users.columns.name')}</th>
                <th className="px-4 py-3 font-medium">{t('users.columns.email')}</th>
                <th className="px-4 py-3 font-medium">{t('users.columns.status')}</th>
                <th className="px-4 py-3 font-medium">{t('users.columns.role')}</th>
                <th className="px-4 py-3 font-medium">{t('users.columns.createdAt')}</th>
                <th className="px-4 py-3 font-medium">{t('users.columns.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    {t('users.empty')}
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const isSaving = savingId === user.id
                  const isProtectedAdmin = user.email === PROTECTED_ADMIN_EMAIL

                  return (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{user.name}</td>
                      <td className="px-4 py-3 text-gray-600">{user.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusColors[user.status]}`}
                        >
                          {t(`users.statuses.${user.status}`)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {isProtectedAdmin ? (
                          <span className="inline-flex rounded-full bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700">
                            {t(`users.roles.${user.role}`)}
                          </span>
                        ) : (
                          <select
                            value={user.role}
                            disabled={isSaving || user.status !== UserStatus.ACTIVE}
                            onChange={(e) =>
                              void updateRole(user.id, e.target.value as typeof user.role)
                            }
                            className="rounded-md border border-gray-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                          >
                            {roles.map((role) => (
                              <option key={role} value={role}>
                                {t(`users.roles.${role}`)}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3">
                        {!isProtectedAdmin && (
                          <div className="flex items-center gap-2">
                            {user.status === UserStatus.PENDING && (
                              <div className="flex items-center gap-2">
                                <select
                                  value={approveRole[user.id] ?? user.role}
                                  onChange={(e) =>
                                    setApproveRole((prev) => ({ ...prev, [user.id]: e.target.value as UserRole }))
                                  }
                                  disabled={isSaving}
                                  className="rounded-md border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                >
                                  {roles.map((role) => (
                                    <option key={role} value={role}>
                                      {t(`users.roles.${role}`)}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  disabled={isSaving}
                                  onClick={() =>
                                    void updateStatus(user.id, UserStatus.ACTIVE, approveRole[user.id] ?? user.role)
                                  }
                                  className="rounded bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                                >
                                  {t('users.actions.approve')}
                                </button>
                              </div>
                            )}
                            {user.status === UserStatus.ACTIVE && (
                              <button
                                disabled={isSaving}
                                onClick={() => void updateStatus(user.id, UserStatus.BLOCKED)}
                                className="rounded bg-yellow-500 px-2 py-1 text-xs font-medium text-white hover:bg-yellow-600 disabled:opacity-50"
                              >
                                {t('users.actions.block')}
                              </button>
                            )}
                            {user.status === UserStatus.BLOCKED && (
                              <button
                                disabled={isSaving}
                                onClick={() => void updateStatus(user.id, UserStatus.ACTIVE)}
                                className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                              >
                                {t('users.actions.unblock')}
                              </button>
                            )}
                            <button
                              disabled={isSaving}
                              onClick={() => handleDelete(user.id, user.name)}
                              className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                            >
                              {t('users.actions.delete')}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
