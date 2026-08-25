import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { UserStatus, UserRole } from '@fleet-manager/shared'
import { useUsers } from '@/hooks/useUsers'

const PROTECTED_ADMIN_EMAIL = 'admin@fleet-manager.com'

const inputClass =
  'rounded-md bg-fleet-input border border-white/[0.08] px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-gold/50 disabled:opacity-40'

const statusColors: Record<UserStatus, string> = {
  [UserStatus.ACTIVE]: 'bg-green-500/10 text-green-400',
  [UserStatus.PENDING]: 'bg-amber-500/10 text-amber-400',
  [UserStatus.BLOCKED]: 'bg-red-500/10 text-red-400',
}

export function UserList() {
  const { t } = useTranslation()
  const { users, loading, error, savingId, updateRole, updateStatus, deleteUser, roles } =
    useUsers()
  const [approveRole, setApproveRole] = useState<Record<string, UserRole>>({})

  if (loading) return <p className="text-sm text-white/40">{t('common.loading')}</p>
  if (error) return <p className="text-sm text-red-400">{error}</p>

  function handleDelete(id: string, name: string) {
    if (window.confirm(t('users.deleteConfirm', { name }))) {
      void deleteUser(id)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-white">{t('users.title')}</h1>
        <p className="text-sm text-white/40">{t('users.subtitle')}</p>
      </div>

      <div className="overflow-hidden rounded-lg border border-white/[0.07] bg-fleet-card">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-fleet-darker">
              <tr className="border-b border-white/[0.07] text-left text-white/40">
                <th className="px-4 py-3 font-medium">{t('users.columns.name')}</th>
                <th className="px-4 py-3 font-medium">{t('users.columns.email')}</th>
                <th className="px-4 py-3 font-medium">{t('users.columns.status')}</th>
                <th className="px-4 py-3 font-medium">{t('users.columns.role')}</th>
                <th className="px-4 py-3 font-medium">{t('users.columns.createdAt')}</th>
                <th className="px-4 py-3 font-medium">{t('users.columns.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-white/30">
                    {t('users.empty')}
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const isSaving = savingId === user.id
                  const isProtectedAdmin = user.email === PROTECTED_ADMIN_EMAIL

                  return (
                    <tr key={user.id} className="hover:bg-white/[0.025]">
                      <td className="px-4 py-3 font-medium text-white">{user.name}</td>
                      <td className="px-4 py-3 text-white/60">{user.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusColors[user.status]}`}
                        >
                          {t(`users.statuses.${user.status}`)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {isProtectedAdmin ? (
                          <span className="inline-flex rounded-full bg-gold/10 px-3 py-1 text-xs font-semibold text-gold">
                            {t(`users.roles.${user.role}`)}
                          </span>
                        ) : (
                          <select
                            value={user.role}
                            disabled={isSaving || user.status !== UserStatus.ACTIVE}
                            onChange={(e) =>
                              void updateRole(user.id, e.target.value as typeof user.role)
                            }
                            className={inputClass}
                          >
                            {roles.map((role) => (
                              <option key={role} value={role}>
                                {t(`users.roles.${role}`)}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="px-4 py-3 text-white/50">
                        {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3">
                        {!isProtectedAdmin && (
                          <div className="flex flex-wrap items-center gap-2">
                            {user.status === UserStatus.PENDING && (
                              <div className="flex items-center gap-2">
                                <select
                                  value={approveRole[user.id] ?? user.role}
                                  onChange={(e) =>
                                    setApproveRole((prev) => ({
                                      ...prev,
                                      [user.id]: e.target.value as UserRole,
                                    }))
                                  }
                                  disabled={isSaving}
                                  className={inputClass}
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
                                    void updateStatus(
                                      user.id,
                                      UserStatus.ACTIVE,
                                      approveRole[user.id] ?? user.role,
                                    )
                                  }
                                  className="rounded bg-green-600/80 px-2 py-1 text-xs font-medium text-white hover:bg-green-600 disabled:opacity-50"
                                >
                                  {t('users.actions.approve')}
                                </button>
                              </div>
                            )}
                            {user.status === UserStatus.ACTIVE && (
                              <button
                                disabled={isSaving}
                                onClick={() => void updateStatus(user.id, UserStatus.BLOCKED)}
                                className="rounded bg-amber-600/80 px-2 py-1 text-xs font-medium text-white hover:bg-amber-600 disabled:opacity-50"
                              >
                                {t('users.actions.block')}
                              </button>
                            )}
                            {user.status === UserStatus.BLOCKED && (
                              <button
                                disabled={isSaving}
                                onClick={() => void updateStatus(user.id, UserStatus.ACTIVE)}
                                className="rounded bg-gold/80 px-2 py-1 text-xs font-medium text-fleet-black hover:bg-gold disabled:opacity-50"
                              >
                                {t('users.actions.unblock')}
                              </button>
                            )}
                            <button
                              disabled={isSaving}
                              onClick={() => handleDelete(user.id, user.name)}
                              className="rounded bg-red-600/80 px-2 py-1 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50"
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
