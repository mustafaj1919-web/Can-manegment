'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { KeyRound, LogOut, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/lib/stores/auth-store'
import { changePassword, logoutUser } from '@/lib/api/auth'
import { cn } from '@/lib/utils'

const ROLE_LABELS: Record<string, string> = {
  Owner: 'مالك المعرض',
  Admin: 'مدير النظام',
  Accountant: 'محاسب',
  Sales: 'موظف مبيعات',
  Viewer: 'مشاهد',
}

function getInitials(username: string): string {
  return username.slice(0, 2).toUpperCase()
}

export function UserMenu() {
  const router = useRouter()
  const { user, clearAuth } = useAuthStore()
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const displayUser = user ?? { username: 'admin', role: 'Owner' as const }
  const roleLabel = ROLE_LABELS[displayUser.role] ?? displayUser.role

  const handleLogout = async () => {
    await logoutUser()
    clearAuth()
    router.push('/login')
  }

  const resetPasswordForm = () => {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setError('')
  }

  const handleChangePassword = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    if (newPassword.length < 8) {
      setError('كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('تأكيد كلمة المرور غير مطابق')
      return
    }
    setSaving(true)
    try {
      await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      })
      toast.success('تم تغيير كلمة المرور. سجل الدخول مرة أخرى.')
      resetPasswordForm()
      setPasswordOpen(false)
      await logoutUser()
      clearAuth()
      router.push('/login')
    } catch (err: unknown) {
      const ae = err as { response?: { data?: { error?: string; message?: string } } }
      setError(ae?.response?.data?.error ?? ae?.response?.data?.message ?? 'تعذر تغيير كلمة المرور')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              'h-8 gap-2 rounded-lg px-2 transition-colors',
              'text-slate-400 hover:text-slate-200 hover:bg-white/[0.07]'
            )}
          >
            <Avatar className="h-6 w-6 ring-1 ring-white/[0.12]">
              <AvatarFallback className="bg-gradient-to-br from-primary/80 to-violet-600/80 text-white text-[10px] font-bold">
                {getInitials(displayUser.username)}
              </AvatarFallback>
            </Avatar>
            <span className="hidden sm:block max-w-[80px] truncate text-xs font-medium">
              {displayUser.username}
            </span>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          className="w-[210px] rounded-xl p-1.5"
          style={{
            background: 'var(--surface-3)',
            border: '1px solid var(--glass-border-strong)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
          }}
        >
          <DropdownMenuLabel className="font-normal px-3 py-2.5">
            <div className="flex items-center gap-2.5">
              <Avatar className="h-8 w-8 ring-1 ring-white/[0.1]">
                <AvatarFallback className="bg-gradient-to-br from-primary/80 to-violet-600/80 text-white text-[11px] font-bold">
                  {getInitials(displayUser.username)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-semibold text-foreground leading-tight">{displayUser.username}</p>
                <p className="text-[11px] text-muted-foreground leading-tight">{roleLabel}</p>
              </div>
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator className="bg-white/[0.06] mx-2 my-1" />

          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault()
              resetPasswordForm()
              setPasswordOpen(true)
            }}
            className="gap-2.5 text-slate-300 focus:text-slate-100 focus:bg-white/[0.06] rounded-lg px-3 py-2.5 cursor-pointer"
          >
            <KeyRound className="h-3.5 w-3.5 shrink-0" />
            <span className="text-sm">تغيير كلمة المرور</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={handleLogout}
            className="gap-2.5 text-rose-400 focus:text-rose-300 focus:bg-rose-500/10 rounded-lg px-3 py-2.5 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5 shrink-0" />
            <span className="text-sm">تسجيل الخروج</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader>
            <DialogTitle>تغيير كلمة المرور</DialogTitle>
            <DialogDescription>
              أدخل كلمة المرور الحالية ثم كلمة المرور الجديدة.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">كلمة المرور الحالية</Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="bg-white/5 border-white/10 h-9"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">كلمة المرور الجديدة</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-white/5 border-white/10 h-9"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">تأكيد كلمة المرور الجديدة</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-white/5 border-white/10 h-9"
                required
              />
            </div>
            {error && <p className="text-xs text-rose-400">{error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                className="border border-white/10"
                disabled={saving}
                onClick={() => setPasswordOpen(false)}
              >
                إلغاء
              </Button>
              <Button type="submit" disabled={saving} className="gap-2 bg-violet-600 text-white hover:bg-violet-500">
                {saving && <RefreshCw className="h-4 w-4 animate-spin" />}
                حفظ
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
