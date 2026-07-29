'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, MessageSquare, X } from 'lucide-react'

interface ChatLauncherProps {
  isOpen: boolean
  onClick: () => void
}

export default function ChatLauncher({ isOpen, onClick }: ChatLauncherProps) {
  return (
    <div className="fixed bottom-20 end-6 lg:bottom-6 lg:end-6 z-50">
      {/* Pulse backdrop animation */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0.5 }}
            animate={{
              scale: [1, 1.25, 1],
              opacity: [0.5, 0, 0.5],
            }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 blur-md"
          />
        )}
      </AnimatePresence>

      <motion.button
        onClick={onClick}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 outline-none hover:from-blue-700 hover:to-indigo-700 dark:shadow-indigo-900/30"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <X className="h-6 w-6" />
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ scale: 0.5, rotate: 45, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 0.5, rotate: -45, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative"
            >
              <MessageSquare className="h-6 w-6" />
              <motion.div
                animate={{
                  y: [0, -3, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-black"
              >
                <Sparkles className="h-2.5 w-2.5" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  )
}
