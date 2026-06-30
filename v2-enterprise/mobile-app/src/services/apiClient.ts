import AsyncStorage from '@react-native-async-storage/async-storage';

// Base API URL linked to the production server.
export const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://100.75.153.105/api';

interface RequestOptions extends RequestInit {
  token?: string;
}

export async function requestApi<T>(endpoint: string, options: RequestOptions = {}): Promise<{
  success: boolean;
  message?: string;
  data?: T;
  errors?: any;
}> {
  try {
    const url = `${BASE_URL}/${endpoint.replace(/^\//, '')}`;
    
    // Attempt to load token from AsyncStorage if not provided in options
    let token = options.token;
    if (!token) {
      token = (await AsyncStorage.getItem('customer_token')) || undefined;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const responseText = await response.text();
    let jsonResponse: any;
    
    try {
      jsonResponse = JSON.parse(responseText);
    } catch {
      jsonResponse = null;
    }

    if (!response.ok) {
      return {
        success: false,
        message: jsonResponse?.message || `خطأ في الاتصال: ${response.status}`,
        errors: jsonResponse?.errors,
      };
    }

    // Unify API response format
    if (jsonResponse && typeof jsonResponse === 'object' && 'success' in jsonResponse) {
      return jsonResponse;
    }

    return {
      success: true,
      data: jsonResponse as T,
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'تعذر الاتصال بالسيرفر. يرجى التحقق من اتصال الإنترنت الخاص بك.',
      errors: error,
    };
  }
}
