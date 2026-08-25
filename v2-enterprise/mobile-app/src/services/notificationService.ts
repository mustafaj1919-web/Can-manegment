import * as Notifications from 'expo-notifications'
import { safeLogger } from './loggerService'

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }

    return finalStatus === 'granted'
  } catch (err) {
    safeLogger.warn('Notification permission request failed', err)
    return false
  }
}

export async function getExpoPushToken(): Promise<string | null> {
  try {
    const granted = await requestNotificationPermission()
    if (!granted) return null

    const tokenData = await Notifications.getExpoPushTokenAsync()
    return tokenData.data
  } catch (err) {
    safeLogger.warn('Failed to obtain Expo Push Token', err)
    return null
  }
}

export function configureNotificationHandling(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  })
}

export function handleNotificationDeepLink(
  notification: Notifications.Notification,
  router: any,
  sessionType: 'employee' | 'customer' | null
): void {
  try {
    const data = notification.request.content.data || {}
    const type = data.type as string
    const targetId = data.targetId as string

    if (!type || !sessionType) return

    safeLogger.info(`Handling notification deep link type: ${type}`, { targetId })

    if (sessionType === 'customer') {
      switch (type) {
        case 'INSTALLMENT_DUE':
        case 'INSTALLMENT_OVERDUE':
          router.push('/(customer)/installments')
          break
        case 'PAYMENT_RECEIVED':
          router.push('/(customer)/payments')
          break
        case 'CONTRACT_UPDATE':
          router.push('/(customer)/contracts')
          break
        default:
          router.push('/(customer)')
          break
      }
    } else if (sessionType === 'employee') {
      switch (type) {
        case 'CRM_FOLLOWUP':
          if (targetId) router.push(`/(sales)/crm/${targetId}`)
          else router.push('/(sales)/crm')
          break
        case 'INSTALLMENT_ALERT':
          if (targetId) router.push(`/(cashier)/contracts/${targetId}`)
          else router.push('/(cashier)/contracts')
          break
        default:
          break
      }
    }
  } catch (err) {
    safeLogger.error('Deep link handling error', err)
  }
}
