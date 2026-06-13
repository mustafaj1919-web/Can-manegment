import { useQuery, useMutation, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query'
import { useToast } from './useToast'
import { ArabicMessages } from '@/lib/constants/messages'

/**
 * Wrapper around useQuery that adds automatic error toast notifications
 */
export function useQueryWithToast<TData>(
  options: UseQueryOptions<TData> & {
    showErrorToast?: boolean
    errorMessage?: string
  }
) {
  const toast = useToast()
  const { showErrorToast = true, errorMessage, ...queryOptions } = options

  return useQuery({
    ...queryOptions,
    retry: queryOptions.retry ?? 2,
  } as UseQueryOptions<TData>)
}

interface UseMutationWithToastOptions<TData, TVariables> {
  successMessage?: string | ((data: TData) => string)
  errorMessage?: string | ((error: Error) => string)
  showSuccessToast?: boolean
  showErrorToast?: boolean
  onMutationStart?: () => void
}

/**
 * Wrapper around useMutation that adds automatic success/error toast notifications
 */
export function useMutationWithToast<TData, TVariables>(
  options: UseMutationOptions<TData, Error, TVariables> & UseMutationWithToastOptions<TData, TVariables>
) {
  const toast = useToast()
  const {
    successMessage = ArabicMessages.SUCCESS.SAVED,
    errorMessage = ArabicMessages.API.GENERIC,
    showSuccessToast = true,
    showErrorToast = true,
    onMutationStart,
    onSuccess,
    onError,
    ...mutationOptions
  } = options

  return useMutation({
    ...mutationOptions,
    onSuccess: (data, variables, context) => {
      if (showSuccessToast) {
        const message =
          typeof successMessage === 'function'
            ? successMessage(data)
            : successMessage
        toast.success(message)
      }
      onSuccess?.(data, variables, context, undefined as any)
    },
    onError: (error, variables, context) => {
      if (showErrorToast) {
        const message =
          typeof errorMessage === 'function'
            ? errorMessage(error)
            : errorMessage
        toast.error(message)
      }
      onError?.(error, variables, context, undefined as any)
    },
  })
}

/**
 * Common mutation configurations for CRUD operations
 */
export const mutationConfigs = {
  create: {
    successMessage: ArabicMessages.SUCCESS.CREATED,
    errorMessage: ArabicMessages.API.GENERIC,
  },
  update: {
    successMessage: ArabicMessages.SUCCESS.UPDATED,
    errorMessage: ArabicMessages.API.GENERIC,
  },
  delete: {
    successMessage: ArabicMessages.SUCCESS.DELETED,
    errorMessage: ArabicMessages.API.GENERIC,
  },
  save: {
    successMessage: ArabicMessages.SUCCESS.SAVED,
    errorMessage: ArabicMessages.API.GENERIC,
  },
  pay: {
    successMessage: ArabicMessages.SUCCESS.PAID,
    errorMessage: ArabicMessages.API.GENERIC,
  },
}
