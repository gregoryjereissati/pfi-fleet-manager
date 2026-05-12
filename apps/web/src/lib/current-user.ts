import type { CurrentUserDto } from '@fleet-manager/shared'

const CURRENT_USER_UPDATED_EVENT = 'fm-current-user-updated'

export function notifyCurrentUserUpdated(user: CurrentUserDto) {
  window.dispatchEvent(
    new CustomEvent<CurrentUserDto>(CURRENT_USER_UPDATED_EVENT, {
      detail: user,
    }),
  )
}

export function subscribeToCurrentUserUpdates(
  listener: (user: CurrentUserDto) => void,
) {
  const handleEvent = (event: Event) => {
    listener((event as CustomEvent<CurrentUserDto>).detail)
  }

  window.addEventListener(CURRENT_USER_UPDATED_EVENT, handleEvent)

  return () => {
    window.removeEventListener(CURRENT_USER_UPDATED_EVENT, handleEvent)
  }
}
