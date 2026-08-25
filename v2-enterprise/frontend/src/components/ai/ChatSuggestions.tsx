'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'

interface ChatSuggestionsProps {
  suggestions: string[]
  onClick: (suggestion: string) => void
  disabled?: boolean
}

export default function ChatSuggestions({ suggestions, onClick, disabled }: ChatSuggestionsProps) {
  if (!suggestions || suggestions.length === 0) return null

  return (
    <div className="flex flex-col gap-2 p-2">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
        <Sparkles className="h-3 w-3 text-amber-500" />
        الأسئلة المقترحة / Suggested Questions
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion, index) => (
          <motion.button
            key={index}
            onClick={() => onClick(suggestion)}
            disabled={disabled}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="text-right text-xs bg-slate-50 hover:bg-blue-50 dark:bg-slate-900/60 dark:hover:bg-blue-950/30 text-slate-700 hover:text-blue-700 dark:text-slate-300 dark:hover:text-blue-300 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800/80 hover:border-blue-200 dark:hover:border-blue-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {suggestion}
          </motion.button>
        ))}
      </div>
    </div>
  )
}
