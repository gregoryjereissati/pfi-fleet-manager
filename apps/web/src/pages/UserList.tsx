import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { UserStatus, UserRole } from '@fleet-manager/shared'
import { UserCog } from 'lucide-react'
import { useUsers } from '@/hooks/useUsers'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { EmptyState, LoadingState, PageHeader } from '@/components/ledger/Ui'
import { RowActions } from '@/components/ledger/RowActions'

type ConfirmDialogVariant = 'danger' | 'warning' | 'default'

const PROTECTED_ADMIN_EMAIL = 'admin@fleet-manager.com'

// Seletores dentro da tabela: o campo do design system em tamanho compacto.
const inputClass = 'lg-input px-2 py-1 text-xs'

const statusColors: Record<UserStatus, string> = {
  [UserStatus.ACTIVE]: 'lg-tag-ok',
  [UserStatus.PENDING]: 'lg-tag-warn',
  [UserStatus.BLOCKED]: 'lg-tag-danger',
  [UserStatus.REJECTED]: 'lg-tag-muted',
}

export function UserList() {
  const { t } = useTranslation()
  const { users, loading, error, savingId, updateRole, updateStatus, deleteUser, roles } =
    useUsers()
  const [approveRole, setApproveRole] = useState<Record<string, UserRole>>({})
  const [dialog, setDialog] = useState<{
    title: string
    message: string
    confirmLabel: string
    variant: ConfirmDialogVariant
    onConfirm: () => void
  } | null>(null)

  if (loading) return <LoadingState label={t('common.loading')} />
  if (error) return <p className="lg-alert lg-alert-error">{error}</p>

  function closeDialog() {
    setDialog(null)
  }

  function handleReject(id: string) {
    setDialog({
      title: t('users.actions.reject'),
      message: t('users.rejectConfirm'),
      confirmLabel: t('users.actions.reject'),
      variant: 'danger',
      onConfirm: () => {
        closeDialog()
        void updateStatus(id, UserStatus.REJECTED)
      },
    })
  }

  function handleDelete(id: string, name: string) {
    setDialog({
      title: t('users.actions.delete'),
      message: t('users.deleteConfirm', { name }),
      confirmLabel: t('users.actions.delete'),
      variant: 'danger',
      onConfirm: () => {
        closeDialog()
        void deleteUser(id)
      },
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('users.title')} subtitle={t('users.subtitle')} />

      <div className="lg-inner lg-reveal overflow-hidden">
        <div className="overflow-x-auto">
          <table className="lg-table min-w-full">
            <thead>
              <tr>
                <th>{t('users.columns.name')}</th>
                <th>{t('users.columns.email')}</th>
                <th>{t('users.columns.status')}</th>
                <th>{t('users.columns.requestedRole')}</th>
                <th>{t('users.columns.role')}</th>
                <th>{t('users.columns.createdAt')}</th>
                <th className="text-right">{t('users.columns.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      icon={<UserCog size={20} strokeWidth={1.5} />}
                      message={t('users.empty')}
                    />
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const isSaving = savingId === user.id
                  const isProtectedAdmin = user.email === PROTECTED_ADMIN_EMAIL

                  return (
                    <tr key={user.id}>
                      <td className="font-medium text-white">
                        {user.name}
                        {user.driverId && (
                          <span className="lg-tag lg-tag-accent ml-2">
                            {t('users.driverBadge')}
                          </span>
                        )}
                      </td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`lg-tag ${statusColors[user.status]}`}>
                          {t(`users.statuses.${user.status}`)}
                        </span>
                      </td>
                      {/*
                        O papel pedido no cadastro fica visível ao lado do papel
                        efetivo: um pedido não vira permissão sozinho, e quem
                        aprova precisa ver os dois para decidir.
                      */}
                      <td className="text-neutral-500">
                        {t(`users.roles.${user.requestedRole}`)}
                      </td>
                      <td>
                        {isProtectedAdmin ? (
                          <span className="lg-tag">
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
                      <td className="tabular-nums text-neutral-500">
                        {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td>
                        {!isProtectedAdmin && (
                          <div className="flex items-center justify-end gap-3">
                            {user.status === UserStatus.PENDING && (
                              <div className="flex items-center gap-3">
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
                                  className="lg-action lg-action-ok"
                                >
                                  {t('users.actions.approve')}
                                </button>
                              </div>
                            )}
                            {/*
                              Os itens do menu não têm estado desabilitado; enquanto
                              a linha salva, a escolha é ignorada, como faziam os
                              botões desabilitados.
                            */}
                            <RowActions
                              actions={[
                                user.status === UserStatus.PENDING && {
                                  label: t('users.actions.reject'),
                                  onSelect: () => {
                                    if (!isSaving) handleReject(user.id)
                                  },
                                  tone: 'danger',
                                },
                                user.status === UserStatus.REJECTED && {
                                  label: t('users.actions.unblock'),
                                  onSelect: () => {
                                    if (!isSaving) void updateStatus(user.id, UserStatus.PENDING)
                                  },
                                  tone: 'ok',
                                },
                                user.status === UserStatus.ACTIVE && {
                                  label: t('users.actions.block'),
                                  onSelect: () => {
                                    if (!isSaving) void updateStatus(user.id, UserStatus.BLOCKED)
                                  },
                                  tone: 'warn',
                                },
                                user.status === UserStatus.BLOCKED && {
                                  label: t('users.actions.unblock'),
                                  onSelect: () => {
                                    if (!isSaving) void updateStatus(user.id, UserStatus.ACTIVE)
                                  },
                                  tone: 'ok',
                                },
                                {
                                  label: t('users.actions.delete'),
                                  onSelect: () => {
                                    if (!isSaving) handleDelete(user.id, user.name)
                                  },
                                  tone: 'danger',
                                },
                              ]}
                            />
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

      {dialog && (
        <ConfirmDialog
          isOpen
          title={dialog.title}
          message={dialog.message}
          confirmLabel={dialog.confirmLabel}
          cancelLabel={t('actions.cancel')}
          variant={dialog.variant}
          onConfirm={dialog.onConfirm}
          onCancel={closeDialog}
        />
      )}
    </div>
  )
}
