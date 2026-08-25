'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkles, AlertCircle, RefreshCw, Bot } from 'lucide-react'
import { useAuthStore } from '@/lib/stores/auth-store'
import ChatMessage, { MessageType } from './ChatMessage'
import ChatInput from './ChatInput'
import ChatActivity from './ChatActivity'
import ChatSuggestions from './ChatSuggestions'

interface ChatPanelProps {
  isOpen: boolean
  onClose: () => void
}

export default function ChatPanel({ isOpen, onClose }: ChatPanelProps) {
  const [messages, setMessages] = useState<MessageType[]>([
    {
      role: 'model',
      content: 'مرحباً! أنا المساعد الذكي لمعرض الأصدقاء للسيارات. 🚗\nيمكنني مساعدتك في الاستعلام عن مخزون السيارات المتوفرة، ملخص الأقساط المتأخرة، تقرير المبيعات، ومؤشرات الأرباح والعملاء. كيف يمكنني مساعدتك اليوم؟\n\n*Hi! I am the AI Assistant for Al-Asdiqaa Cars. Ask me about inventory, overdue installments, sales summaries, and profitability metrics.*',
    },
  ])
  const [input, setInput] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([
    'ما هي أرباح المعرض الإجمالية؟',
    'أرني السيارات المتوفرة من نوع تويوتا',
    'كم عدد الأقساط المتأخرة حالياً؟',
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const token = useAuthStore((state) => state.token)

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
    }
  }, [messages, status, isOpen])

  useEffect(() => {
    const handleTriggerChat = (e: Event) => {
      const customEvent = e as CustomEvent;
      const query = customEvent.detail?.query;
      if (query && token) {
        handleSend(query);
      }
    };
    window.addEventListener('trigger-ai-chat', handleTriggerChat);
    return () => window.removeEventListener('trigger-ai-chat', handleTriggerChat);
  }, [token, messages, isLoading]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return
    
    setInput('')
    setIsLoading(true)
    setError(null)
    setStatus('Analyzing query...')

    const userMessage: MessageType = { role: 'user', content: textToSend.trim() }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)

    // Add temporary empty response model message
    const modelMessageIdx = updatedMessages.length
    setMessages((prev) => [...prev, { role: 'model', content: '' }])

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: textToSend.trim(),
          history: updatedMessages.slice(0, -1), // Exclude the new user message to let route handle history length limit
        }),
      })

      if (!response.ok) {
        throw new Error(response.status === 401 ? 'Unauthorized session' : 'Failed to connect to assistant')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) throw new Error('No readable stream available')

      let responseText = ''
      let buffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Save last partial chunk

        for (const line of lines) {
          if (line.trim() === '') continue
          
          if (line.startsWith('event: ')) {
            const eventType = line.replace('event: ', '').trim()
            
            // Search for next line representing data
            const nextLine = lines[lines.indexOf(line) + 1] || buffer
            if (nextLine && nextLine.startsWith('data: ')) {
              const dataStr = nextLine.replace('data: ', '').trim()

              if (eventType === 'status') {
                setStatus(dataStr)
              } else if (eventType === 'content') {
                responseText += dataStr
                setMessages((prev) => {
                  const copy = [...prev]
                  copy[modelMessageIdx] = { role: 'model', content: responseText }
                  return copy
                })
              } else if (eventType === 'suggestions') {
                try {
                  const parsedSuggestions = JSON.parse(dataStr)
                  setSuggestions(parsedSuggestions)
                } catch {
                  // Keep old suggestions
                }
              } else if (eventType === 'done') {
                setStatus(null)
              }
            }
          }
        }
      }
      
      // Completed streaming
      setStatus(null)
    } catch (err: any) {
      console.error(err)
      setError(
        err.message === 'Unauthorized session'
          ? 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مجدداً.\nSession expired. Please log in again.'
          : 'خطأ في الاتصال بالمساعد الذكي. يرجى إعادة المحاولة.\nFailed to connect to the AI assistant. Please try again.'
      )
      // Remove the blank AI response message if error occurred
      setMessages((prev) => prev.slice(0, -1))
    } finally {
      setIsLoading(false)
      setStatus(null)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    handleSend(suggestion)
  }

  const handleClearHistory = () => {
    setMessages([
      {
        role: 'model',
        content: 'تم مسح المحادثة. كيف يمكنني مساعدتك بخصوص بيانات المعرض؟\n*Chat history cleared. How can I help you today?*',
      },
    ])
    setSuggestions([
      'ما هي أرباح المعرض الإجمالية؟',
      'أرني السيارات المتوفرة من نوع تويوتا',
      'كم عدد الأقساط المتأخرة حالياً؟',
    ])
    setError(null)
    setStatus(null)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Blur backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-slate-950 backdrop-blur-xs"
          />

          {/* Sliding sidebar panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed top-0 right-0 z-50 flex h-full w-full max-w-[420px] flex-col border-l border-slate-200 bg-white/95 shadow-2xl backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/95"
            dir="rtl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/40">
                  <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex flex-col text-right">
                  <h2 className="text-[13px] font-bold text-slate-800 dark:text-slate-200">
                    المساعد الذكي للأصدقاء
                  </h2>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                    Al-Asdiqaa AI Assistant
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleClearHistory}
                  title="مسح المحادثة / Clear chat"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-900 dark:hover:text-slate-300"
                >
                  <RefreshCw className="h-4.5 w-4.5" />
                </button>
                <button
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-900 dark:hover:text-slate-300"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>

            {/* Chat Body (Messages List) */}
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
              {messages.map((msg, index) => (
                <ChatMessage key={index} message={msg} />
              ))}

              {/* Status loader */}
              <AnimatePresence>
                {status && <ChatActivity status={status} />}
              </AnimatePresence>

              {/* Error boundary feedback */}
              {error && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/50 p-3.5 text-xs text-red-700 dark:border-red-950/30 dark:bg-red-950/20 dark:text-red-300">
                  <AlertCircle className="h-4.5 w-4.5 flex-shrink-0 text-red-600 dark:text-red-400" />
                  <div className="flex flex-col whitespace-pre-wrap">{error}</div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Suggestions panel (Only shown when not loading) */}
            {!isLoading && (
              <div className="px-5 pb-2 border-t border-slate-100 dark:border-slate-900 pt-3 bg-slate-50/30 dark:bg-slate-950/10">
                <ChatSuggestions
                  suggestions={suggestions}
                  onClick={handleSuggestionClick}
                  disabled={isLoading}
                />
              </div>
            )}

            {/* Input area */}
            <div className="border-t border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
              <ChatInput
                value={input}
                onChange={setInput}
                onSubmit={() => handleSend(input)}
                disabled={isLoading}
                placeholder="اسأل بخصوص المبيعات والأرباح والمخزون..."
              />
              <div className="mt-2 text-center text-[9px] text-slate-400 dark:text-slate-500">
                المساعد الذكي يقوم بجلب بيانات حية وآمنة عبر ERP.
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
