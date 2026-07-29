'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Loader2, BrainCircuit } from 'lucide-react'

interface ChatActivityProps {
  status: string | null
}

export default function ChatActivity({ status }: ChatActivityProps) {
  if (!status) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 5 }}
      className="flex items-center gap-2.5 rounded-xl border border-blue-100 bg-blue-50/50 px-4 py-2.5 text-xs text-blue-700 dark:border-blue-900/30 dark:bg-blue-950/20 dark:text-blue-300"
    >
      <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
      <div className="flex flex-col">
        <span className="flex items-center gap-1 font-semibold">
          <BrainCircuit className="h-3.5 w-3.5" />
          مساعد الذكاء الاصطناعي / AI Assistant
        </span>
        <span className="text-[11px] opacity-80 mt-0.5">{status}</span>
      </div>
    </motion.div>
  )
}
