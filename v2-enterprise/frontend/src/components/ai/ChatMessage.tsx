'use client'

import React, { Component } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Bot, User } from 'lucide-react'

// ErrorBoundary class to prevent crash during parsing
class MarkdownErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="text-red-500 text-xs p-2.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl">
          Error rendering markdown: {this.state.error?.message}
        </div>
      )
    }
    return this.props.children
  }
}

export interface MessageType {
  role: 'user' | 'model' | 'assistant'
  content: string
}

interface ChatMessageProps {
  message: MessageType
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'

  // Safe checks for language direction
  const isArabic = /[\u0600-\u06FF]/.test(message.content)
  const dir = isArabic ? 'rtl' : 'ltr'
  const textAlignment = isArabic ? 'text-right' : 'text-left'

  return (
    <div className={`flex gap-3 w-full ${isUser ? 'flex-row-reverse' : 'flex-row'}`} dir={dir}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isUser ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
        {isUser ? <User className="h-4.5 w-4.5" /> : <Bot className="h-4.5 w-4.5" />}
      </div>
      <div className="max-w-[85%] flex flex-col gap-1.5">
        <div className={`p-4 rounded-2xl text-[13px] leading-relaxed shadow-sm border ${
          isUser 
            ? 'bg-blue-600 border-blue-600 text-white rounded-tr-none' 
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none'
        }`}>
          {isUser ? (
            <div className={`whitespace-pre-wrap ${textAlignment}`}>{message.content}</div>
          ) : (
            <MarkdownErrorBoundary>
              {/* Wrapped in typography container for premium look and avoiding react-markdown v10 class crashes */}
              <div className={`prose dark:prose-invert max-w-none text-[13px] leading-relaxed ${textAlignment}
                [&>p]:mb-2 [&>p:last-child]:mb-0 
                [&>ul]:list-disc [&>ul]:ml-5 [&>ul]:mr-5 [&>ul]:mb-2 
                [&>ol]:list-decimal [&>ol]:ml-5 [&>ol]:mr-5 [&>ol]:mb-2
                [&>h1]:text-base [&>h1]:font-bold [&>h1]:mb-2 [&>h1]:mt-4
                [&>h2]:text-sm [&>h2]:font-bold [&>h2]:mb-2 [&>h2]:mt-3
                [&>h3]:text-[13px] [&>h3]:font-semibold [&>h3]:mb-1 [&>h3]:mt-3
                [&_code]:bg-slate-100 dark:[&_code]:bg-slate-950 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:font-mono [&_code]:text-[11px]
                [&_pre]:bg-slate-950 [&_pre]:text-slate-100 [&_pre]:p-3 [&_pre]:rounded-xl [&_pre]:overflow-x-auto [&_pre]:my-2 [&_pre_code]:bg-transparent [&_pre_code]:p-0
                [&>table]:w-full [&>table]:border-collapse [&>table]:my-3 [&>table]:text-xs
                [&>table_th]:border [&>table_th]:border-slate-200 dark:[&>table_th]:border-slate-800 [&>table_th]:bg-slate-50 dark:[&>table_th]:bg-slate-950/60 [&>table_th]:p-2 [&>table_th]:font-bold
                [&>table_td]:border [&>table_td]:border-slate-200 dark:[&>table_td]:border-slate-800 [&>table_td]:p-2
              `}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.content}
                </ReactMarkdown>
              </div>
            </MarkdownErrorBoundary>
          )}
        </div>
      </div>
    </div>
  )
}
