'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useMutation } from '@tanstack/react-query'
import {
  Settings, User, Lock, Sun, Moon, Building2,
  Phone, MapPin, Save, Check, Eye, EyeOff,
  Globe, Shield, Info, ChevronLeft,
} from 'lucide-react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useBranchStore } from '@/lib/stores/branch-store'
import { post } from '@/lib/api/client'
import { SHOWROOM } from '@/lib/showroom-config'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/shared/PageHeader'

/* ─── Helpers ────────────────────────────────────────────────────────────── */

const ROLE_LABEL: Record<string, string> = {
  Owner:      'مالك / صاحب المعرض',
  Admin:      'مدير النظام',
  Accountant: 'محاسب',
  Sales:      'موظف مبيعات',
  Viewer:     'مشاهد',
}

function SectionCard({ title, icon: Icon, children }: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
      <div className="flex items-center gap-2.5 border-b border-border/40 bg-secondary/20 px-5 py-3.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
          <Icon className="h-3.5 w-3.5 text-primary" />
        </div>
        <p className="text-[12px] font-black text-foreground">{title}</p>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  )
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-[12px] font-semibold text-muted-foreground shrink-0">{label}</p>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}

function InfoValue({ value }: { value: string }) {
  return (
    <p className="text-[12px] font-bold text-foreground text-left truncate">{value}</p>
  )
}

/* ─── Theme Toggle ───────────────────────────────────────────────────────── */

function ThemeRow() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window === 'undefined') return 'dark'
    return (localStorage.getItem('dashboardTheme') as 'dark' | 'light') || 'dark'
  })

  function toggle(next: 'dark' | 'light') {
    document.documentElement.classList.toggle('light', next === 'light')
    localStorage.setItem('dashboardTheme', next)
    setTheme(next)
  }

  return (
    <SettingRow label="مظهر الواجهة">
      <div className="flex items-center gap-2 justify-end">
        <button
          type="button"
          onClick={() => toggle('dark')}
          className={cn(
            'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-bold transition-all',
            theme === 'dark'
              ? 'border-primary/40 bg-primary/10 text-primary'
              : 'border-border/40 text-muted-foreground hover:border-border/60 hover:text-foreground'
          )}
        >
          <Moon className="h-3.5 w-3.5" /> داكن
        </button>
        <button
          type="button"
          onClick={() => toggle('light')}
          className={cn(
            'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-bold transition-all',
            theme === 'light'
              ? 'border-amber-400/40 bg-amber-400/10 text-amber-400'
              : 'border-border/40 text-muted-foreground hover:border-border/60 hover:text-foreground'
          )}
        >
          <Sun className="h-3.5 w-3.5" /> فاتح
        </button>
      </div>
    </SettingRow>
  )
}

/* ─── Change Password Form ───────────────────────────────────────────────── */

function ChangePasswordForm({ userId }: { userId: string }) {
  const [newPass, setNewPass]       = useState('')
  const [confirmPass, setConfirm]   = useState('')
  const [showPass, setShowPass]     = useState(false)
  const [savedOk, setSavedOk]       = useState(false)
  const [error, setError]           = useState('')

  const mutation = useMutation({
    mutationFn: (password: string) =>
      post(`/Users/${userId}/reset-password`, { password }),
    onSuccess: () => {
      setSavedOk(true)
      setNewPass('')
      setConfirm('')
      setError('')
      setTimeout(() => setSavedOk(false), 3000)
    },
    onError: () => setError('حدث خطأ أثناء تغيير كلمة المرور'),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (newPass.length < 8) {
      setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل')
      return
    }
    if (newPass !== confirmPass) {
      setError('كلمتا المرور غير متطابقتين')
      return
    }
    mutation.mutate(newPass)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="relative">
        <input
          type={showPass ? 'text' : 'password'}
          value={newPass}
          onChange={(e) => setNewPass(e.target.value)}
          placeholder="كلمة المرور الجديدة (8 أحرف على الأقل)"
          className="w-full h-9 rounded-lg border border-border/50 bg-secondary/20 px-3 pr-3 pl-9 text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40"
          dir="ltr"
        />
        <button
          type="button"
          onClick={() => setShowPass(s => !s)}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label="إظهار / إخفاء كلمة المرور"
        >
          {showPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      </div>

      <input
        type={showPass ? 'text' : 'password'}
        value={confirmPass}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="تأكيد كلمة المرور"
        className="w-full h-9 rounded-lg border border-border/50 bg-secondary/20 px-3 text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40"
        dir="ltr"
      />

      {error && (
        <p className="text-[11px] text-rose-400">{error}</p>
      )}

      <button
        type="submit"
        disabled={mutation.isPending || !newPass || !confirmPass}
        className={cn(
          'flex items-center gap-2 rounded-lg px-4 py-2 text-[11px] font-bold transition-all',
          savedOk
            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
            : 'bg-primary text-white hover:bg-primary/90 disabled:opacity-50'
        )}
      >
        {savedOk
          ? <><Check className="h-3.5 w-3.5" /> تم الحفظ</>
          : mutation.isPending
            ? 'جاري الحفظ...'
            : <><Save className="h-3.5 w-3.5" /> حفظ كلمة المرور</>
        }
      </button>
    </form>
  )
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function SettingsPage() {
  const user         = useAuthStore(s => s.user)
  const activeBranch = useBranchStore(s => s.activeBranch)

  const roleLabel = ROLE_LABEL[user?.role ?? ''] ?? user?.role ?? '—'

  return (
    <div className="space-y-6 max-w-3xl" dir="rtl">
      <PageHeader
        title="الإعدادات العامة"
        subtitle="إدارة ملفك الشخصي وتخصيص تجربة استخدام النظام"
      />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-5"
      >

        {/* ── Profile ── */}
        <SectionCard title="الملف الشخصي" icon={User}>
          <SettingRow label="اسم المستخدم">
            <InfoValue value={user?.username ?? '—'} />
          </SettingRow>
          <SettingRow label="الصلاحية">
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary">
              {roleLabel}
            </span>
          </SettingRow>
          <SettingRow label="الفرع النشط">
            <div className="flex items-center gap-1.5 justify-end">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              <InfoValue value={activeBranch?.name ?? 'الفرع الرئيسي'} />
            </div>
          </SettingRow>
        </SectionCard>

        {/* ── Change Password ── */}
        {user?.id && (
          <SectionCard title="تغيير كلمة المرور" icon={Lock}>
            <p className="text-[11px] text-muted-foreground">
              اختر كلمة مرور قوية تحتوي على حروف وأرقام ورموز.
            </p>
            <ChangePasswordForm userId={String(user.id)} />
          </SectionCard>
        )}

        {/* ── Appearance ── */}
        <SectionCard title="المظهر واللغة" icon={Sun}>
          <ThemeRow />
          <SettingRow label="لغة الواجهة">
            <div className="flex items-center gap-1.5 justify-end">
              <Globe className="h-3.5 w-3.5 text-muted-foreground" />
              <InfoValue value="العربية (RTL)" />
            </div>
          </SettingRow>
        </SectionCard>

        {/* ── Showroom Info ── */}
        <SectionCard title="معلومات المعرض" icon={Building2}>
          <SettingRow label="اسم المعرض">
            <InfoValue value={SHOWROOM.name} />
          </SettingRow>
          <SettingRow label="العنوان">
            <div className="flex items-center gap-1.5 justify-end">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <p className="text-[11px] font-bold text-foreground text-left">{SHOWROOM.address}</p>
            </div>
          </SettingRow>
          {SHOWROOM.phones.map((phone, i) => (
            <SettingRow key={phone} label={i === 0 ? 'الهاتف' : ''}>
              <div className="flex items-center gap-1.5 justify-end">
                <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <p className="text-[12px] font-bold text-foreground font-mono" dir="ltr">{phone}</p>
              </div>
            </SettingRow>
          ))}
        </SectionCard>

        {/* ── About System ── */}
        <SectionCard title="حول النظام" icon={Info}>
          <SettingRow label="الإصدار">
            <InfoValue value="v2.0.0 Enterprise" />
          </SettingRow>
          <SettingRow label="المنصة">
            <InfoValue value=".NET 8 + Next.js 16" />
          </SettingRow>
          <SettingRow label="قاعدة البيانات">
            <InfoValue value="PostgreSQL 16" />
          </SettingRow>
          <SettingRow label="حالة الاتصال">
            <div className="flex items-center gap-1.5 justify-end">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping [animation-duration:2.5s]" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <p className="text-[11px] font-bold text-emerald-400">متصل</p>
            </div>
          </SettingRow>
        </SectionCard>

        {/* Quick Links */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'إدارة المستخدمين', href: '/users',   icon: User   },
            { label: 'الأدوار والصلاحيات', href: '/roles', icon: Shield  },
            { label: 'النسخ الاحتياطي',  href: '/backup',  icon: Save   },
            { label: 'سجل التدقيق',       href: '/audit',  icon: Settings },
          ].map(({ label, href, icon: Icon }) => (
            <a
              key={href}
              href={href}
              className="flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-card px-4 py-3.5 hover:border-primary/30 hover:bg-primary/5 transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-[12px] font-bold text-foreground">{label}</span>
              </div>
              <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary/60 transition-colors" />
            </a>
          ))}
        </div>

      </motion.div>
    </div>
  )
}
