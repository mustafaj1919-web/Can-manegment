import { toast } from 'sonner'

interface ToastOptions {
  duration?: number
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export const useToast = () => {
  return {
    success: (message: string, options?: ToastOptions) => {
      toast.success(message, {
        duration: options?.duration || 3000,
        description: options?.description,
        action: options?.action,
      })
    },

    error: (message: string, options?: ToastOptions) => {
      toast.error(message, {
        duration: options?.duration || 4000,
        description: options?.description,
        action: options?.action,
      })
    },

    warning: (message: string, options?: ToastOptions) => {
      toast.warning(message, {
        duration: options?.duration || 3500,
        description: options?.description,
        action: options?.action,
      })
    },

    info: (message: string, options?: ToastOptions) => {
      toast.info(message, {
        duration: options?.duration || 3000,
        description: options?.description,
        action: options?.action,
      })
    },

    loading: (message: string) => {
      return toast.loading(message)
    },

    dismiss: (toastId?: string | number) => {
      toast.dismiss(toastId)
    },

    promise: async <T,>(
      promise: Promise<T>,
      messages: {
        loading: string
        success: string | ((data: T) => string)
        error: string | ((error: Error) => string)
      }
    ) => {
      return toast.promise(promise, messages)
    },
  }
}
