'use client'

import React, { useRef, useEffect } from 'react'
import { Send, ArrowUp } from 'lucide-react'

interface ChatInputProps {
  value: string
  onChange: (val: string) => void
  onSubmit: () => void
  disabled?: boolean
  placeholder?: string
}

export default function ChatInput({ value, onChange, onSubmit, disabled, placeholder }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea height to accommodate multiline input
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      const scrollHeight = textareaRef.current.scrollHeight
      textareaRef.current.style.height = Math.min(scrollHeight, 120) + 'px'
      textareaRef.current.style.overflowY = scrollHeight > 120 ? 'auto' : 'hidden'
    }
  }, [value])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSubmit()
    }
  }

  return (
    <div className="relative flex items-end gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500 shadow-sm transition-shadow">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder || 'اسأل المساعد... / Ask AI Assistant...'}
        rows={1}
        className="flex-1 max-h-[120px] bg-transparent text-[13px] border-none outline-none focus:ring-0 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 resize-none py-1.5 pl-3 pr-10 min-h-[36px]"
      />
      <button
        onClick={onSubmit}
        disabled={disabled || !value.trim()}
        className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:scale-100 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600"
      >
        <ArrowUp className="h-4.5 w-4.5" />
      </button>
    </div>
  )
}
