'use client'

import { useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { cn } from '@/lib/utils'

export interface AccountOption {
  code: string
  name: string
  /** optional id — use when backend expects id rather than code */
  id?: string
}

interface Props {
  /** current value — either code or id depending on valueKey */
  value: string
  accounts: AccountOption[]
  onChange: (value: string) => void
  /** which field to use as the option value (default: 'code') */
  valueKey?: 'code' | 'id'
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function AccountCombobox({
  value,
  accounts,
  onChange,
  valueKey = 'code',
  placeholder = 'اختر الحساب...',
  className,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false)

  const selected = accounts.find(a => (valueKey === 'id' ? a.id : a.code) === value)

  return (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'flex h-9 w-full items-center justify-between rounded-md border border-border/50 bg-secondary/30 px-3 text-xs transition-colors',
            'hover:bg-secondary/50 focus:outline-none focus:ring-1 focus:ring-primary/50',
            !selected && 'text-muted-foreground',
            disabled && 'cursor-not-allowed opacity-50',
            className
          )}
        >
          <span className="truncate">
            {selected ? `${selected.code} — ${selected.name}` : placeholder}
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-[340px] p-0" align="start" dir="rtl">
        <Command>
          <CommandInput
            placeholder="ابحث باسم الحساب أو الرمز..."
            className="h-9 text-xs"
          />
          <CommandList className="max-h-56">
            <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">
              لا توجد نتائج
            </CommandEmpty>
            <CommandGroup>
              {accounts.map(a => {
                const optVal = valueKey === 'id' ? (a.id ?? a.code) : a.code
                return (
                  <CommandItem
                    key={optVal}
                    value={`${a.code} ${a.name}`}
                    onSelect={() => { onChange(optVal); setOpen(false) }}
                    className="flex items-center gap-2 text-xs cursor-pointer"
                  >
                    <Check className={cn(
                      'h-3.5 w-3.5 shrink-0',
                      value === optVal ? 'opacity-100 text-primary' : 'opacity-0'
                    )} />
                    <span className="font-numeric text-cyan-400 shrink-0 w-16 truncate">{a.code}</span>
                    <span className="truncate">{a.name}</span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
