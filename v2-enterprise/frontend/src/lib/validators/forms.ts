import { z } from 'zod'
import { ArabicMessages } from '@/lib/constants/messages'

/**
 * Common validation schemas with Arabic error messages
 */

// Common field validators
export const commonValidations = {
  requiredString: z.string().min(1, ArabicMessages.VALIDATION.REQUIRED),
  requiredEmail: z
    .string()
    .min(1, ArabicMessages.VALIDATION.REQUIRED)
    .email(ArabicMessages.VALIDATION.INVALID_EMAIL),
  phone: z
    .string()
    .regex(/^[0-9\-+\s()]+$/, ArabicMessages.VALIDATION.INVALID_PHONE)
    .min(8, ArabicMessages.VALIDATION.INVALID_PHONE),
  vin: z
    .string()
    .regex(/^[A-Z0-9]{17}$/, ArabicMessages.VALIDATION.INVALID_VIN)
    .optional(),
  plate: z
    .string()
    .regex(/^[أ-ي\d]{1,3}[أ-ي]{1,3}\d{1,4}$|^\d{1,6}$/, ArabicMessages.VALIDATION.INVALID_PLATE)
    .optional(),
  idNumber: z
    .string()
    .regex(/^\d{9,10}$/, ArabicMessages.VALIDATION.INVALID_ID)
    .optional(),
  positiveAmount: z
    .number()
    .positive(ArabicMessages.VALIDATION.INVALID_AMOUNT),
  date: z
    .string()
    .or(z.date())
    .refine(
      (val) => {
        if (val instanceof Date) return !isNaN(val.getTime())
        return !isNaN(new Date(val).getTime())
      },
      ArabicMessages.VALIDATION.INVALID_DATE
    ),
}

// Add Sale Form Schema
export const addSaleFormSchema = z.object({
  carId: z.string().min(1, ArabicMessages.VALIDATION.REQUIRED),
  customerId: z.string().min(1, ArabicMessages.VALIDATION.REQUIRED),
  saleDate: commonValidations.date,
  salePrice: commonValidations.positiveAmount,
  notes: z.string().optional(),
  paymentMethod: z.enum(['cash', 'check', 'transfer', 'installment']),
})

export type AddSaleFormData = z.infer<typeof addSaleFormSchema>

// Add Customer Form Schema
export const addCustomerFormSchema = z.object({
  firstName: commonValidations.requiredString,
  lastName: commonValidations.requiredString,
  email: commonValidations.requiredEmail,
  phone: commonValidations.phone,
  idNumber: commonValidations.idNumber,
  address: commonValidations.requiredString,
  city: commonValidations.requiredString,
  birthDate: commonValidations.date.optional(),
})

export type AddCustomerFormData = z.infer<typeof addCustomerFormSchema>

// Add Car Form Schema
export const addCarFormSchema = z.object({
  model: commonValidations.requiredString,
  year: z
    .number()
    .min(1900, 'السنة يجب أن تكون من 1900 فما فوق')
    .max(new Date().getFullYear() + 1, 'السنة غير صحيحة'),
  color: commonValidations.requiredString,
  vin: commonValidations.vin.optional(),
  plate: commonValidations.plate.optional(),
  price: commonValidations.positiveAmount,
  mileage: z.number().min(0, 'قراءة المسافة يجب أن تكون صفر أو أكثر'),
  condition: z.enum(['new', 'excellent', 'good', 'fair', 'poor']),
})

export type AddCarFormData = z.infer<typeof addCarFormSchema>

// Payment Form Schema
export const paymentFormSchema = z.object({
  amount: commonValidations.positiveAmount,
  paymentDate: commonValidations.date,
  paymentMethod: z.enum(['cash', 'check', 'transfer']),
  notes: z.string().optional(),
})

export type PaymentFormData = z.infer<typeof paymentFormSchema>

// Expense Form Schema
export const expenseFormSchema = z.object({
  description: commonValidations.requiredString,
  amount: commonValidations.positiveAmount,
  category: z
    .string()
    .min(1, ArabicMessages.VALIDATION.REQUIRED),
  date: commonValidations.date,
  notes: z.string().optional(),
})

export type ExpenseFormData = z.infer<typeof expenseFormSchema>

// Login Form Schema
export const loginFormSchema = z.object({
  username: z.string().min(3, 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل'),
  password: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
})

export type LoginFormData = z.infer<typeof loginFormSchema>
