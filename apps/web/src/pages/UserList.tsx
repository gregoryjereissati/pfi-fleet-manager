import { useTranslation } from 'react-i18next'
import { useUsers } from '@/hooks/useUsers'

export function UserList() {
  const { t } = useTranslation()
  const { users, loading, error, savingId, updateRole, roles } = useUsers()

  if (loading) return <p className="text-gray-500">{t('common.loading')}</p>
  if (error) return <p className="text-red-500">{error}</p>

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
                <th className="px-4 py-3 font-medium">{t('users.columns.role')}</th>
                <th className="px-4 py-3 font-medium">{t('users.columns.createdAt')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                    {t('users.empty')}
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{user.name}</td>
                    <td className="px-4 py-3 text-gray-600">{user.email}</td>
                    <td className="px-4 py-3">
                      <select
                        value={user.role}
                        disabled={savingId === user.id}
                        onChange={(event) => void updateRole(user.id, event.target.value as typeof user.role)}
                        className="rounded-md border border-gray-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        {roles.map((role) => (
                          <option key={role} value={role}>
                            {t(`users.roles.${role}`)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
