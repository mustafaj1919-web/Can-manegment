import * as LocalAuthentication from 'expo-local-authentication'
import { getSecureItem, setSecureItem, deleteSecureItem } from './storageService'

const BIOMETRIC_PREF_KEY = 'biometric_enabled'

export interface BiometricCapability {
  available: boolean
  biometricType: 'FaceID' | 'TouchID' | 'Biometrics' | 'None'
}

export async function checkBiometricCapability(): Promise<BiometricCapability> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync()
    const isEnrolled = await LocalAuthentication.isEnrolledAsync()

    if (!hasHardware || !isEnrolled) {
      return { available: false, biometricType: 'None' }
    }

    const types = await LocalAuthentication.supportedAuthenticationTypesAsync()
    let typeName: 'FaceID' | 'TouchID' | 'Biometrics' = 'Biometrics'

    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      typeName = 'FaceID'
    } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      typeName = 'TouchID'
    }

    return { available: true, biometricType: typeName }
  } catch (err) {
    return { available: false, biometricType: 'None' }
  }
}

export async function getBiometricPreference(): Promise<boolean> {
  try {
    const val = await getSecureItem(BIOMETRIC_PREF_KEY)
    return val === 'true'
  } catch (err) {
    return false
  }
}

export async function setBiometricPreference(enabled: boolean): Promise<void> {
  try {
    if (enabled) {
      await setSecureItem(BIOMETRIC_PREF_KEY, 'true')
    } else {
      await deleteSecureItem(BIOMETRIC_PREF_KEY)
    }
  } catch (err) {
    // ignore
  }
}

export async function authenticateWithBiometrics(
  promptMessage: string = 'يرجى التحقق من البصمة لفتح التطبيق'
): Promise<boolean> {
  try {
    const capability = await checkBiometricCapability()
    if (!capability.available) return false

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      fallbackLabel: 'استخدام كلمة المرور',
      cancelLabel: 'إلغاء',
      disableDeviceFallback: false,
    })

    return result.success
  } catch (err) {
    return false
  }
}
