'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Sparkles, X, RotateCcw } from 'lucide-react';
import { useShowroomStore } from '@/store/useStore';

export default function AICarDesigner() {
  const lang = useShowroomStore((state) => state.lang);
  const chatMessages = useShowroomStore((state) => state.chatMessages);
  const isChatLoading = useShowroomStore((state) => state.isChatLoading);
  
  const addChatMessage = useShowroomStore((state) => state.addChatMessage);
  const setChatLoading = useShowroomStore((state) => state.setChatLoading);
  const clearChat = useShowroomStore((state) => state.clearChat);

  // Store actions to apply commands
  const setColor = useShowroomStore((state) => state.setColor);
  const setWheels = useShowroomStore((state) => state.setWheels);
  const setEnvironment = useShowroomStore((state) => state.setEnvironment);
  const toggleLights = useShowroomStore((state) => state.toggleLights);
  const toggleDoors = useShowroomStore((state) => state.toggleDoors);
  const toggleHood = useShowroomStore((state) => state.toggleHood);

  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatLoading]);

  // Execute commands returned by AI
  const executeCommands = (commands: { action: string; value: string | null }[]) => {
    commands.forEach((cmd) => {
      switch (cmd.action) {
        case 'setColor':
          if (cmd.value) setColor(cmd.value);
          break;
        case 'setWheels':
          if (cmd.value) setWheels(cmd.value);
          break;
        case 'setEnvironment':
          if (cmd.value && (cmd.value === 'city' || cmd.value === 'desert' || cmd.value === 'mountain' || cmd.value === 'sea')) {
            setEnvironment(cmd.value);
          }
          break;
        case 'toggleLights':
          toggleLights();
          break;
        case 'toggleDoors':
          toggleDoors();
          break;
        case 'toggleHood':
          toggleHood();
          break;
        default:
          break;
      }
    });
  };

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text) return;

    if (!textToSend) setInputValue('');

    // 1. Add user message
    addChatMessage({ role: 'user', content: text });
    setChatLoading(true);

    // 2. Format history for API
    const apiMessages = chatMessages.map(m => ({ role: m.role, content: m.content }));
    apiMessages.push({ role: 'user', content: text });

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, lang }),
      });

      if (!res.ok) throw new Error('API request failed');

      const data = await res.json();

      // 3. Add AI response
      addChatMessage({ role: 'assistant', content: data.response });

      // 4. Apply commands
      if (data.commands && data.commands.length > 0) {
        executeCommands(data.commands);
      }
    } catch (err) {
      console.error(err);
      addChatMessage({
        role: 'assistant',
        content: lang === 'ar' 
          ? 'عذراً، أواجه مشكلة في الاتصال بالخادم الآن. يرجى تكرار المحاولة.' 
          : 'Sorry, I am having trouble connecting to the server. Please try again.'
      });
    } finally {
      setChatLoading(false);
    }
  };

  // Quick chips actions
  const chips = [
    { labelAr: 'طلاء ذهبي 🎨', labelEn: 'Gold Paint 🎨', text: 'اجعل السيارة باللون الذهبي' },
    { labelAr: 'بيئة الصحراء 🏜️', labelEn: 'Desert Dunes 🏜️', text: 'غير البيئة إلى صحراء' },
    { labelAr: 'افتح الأبواب 🚪', labelEn: 'Open Doors 🚪', text: 'افتح أبواب السيارة' },
    { labelAr: 'شغّل الأنوار 💡', labelEn: 'Turn Lights On 💡', text: 'شغل أنوار السيارة' }
  ];

  return (
    <div className="fixed bottom-6 right-6 z-40 pointer-events-auto font-sans">
      {/* Floating Sparkle Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            layoutId="chat-panel"
            onClick={() => setIsOpen(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-5 py-4 rounded-full bg-gradient-to-r from-amber-500 to-yellow-600 text-black font-semibold shadow-[0_0_20px_rgba(212,175,55,0.4)] border border-yellow-400/20 cursor-pointer"
          >
            <Sparkles className="w-5 h-5 animate-pulse" />
            <span>{lang === 'ar' ? 'مصمم السيارات الذكي' : 'AI Car Designer'}</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            layoutId="chat-panel"
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-[90vw] sm:w-[420px] h-[550px] rounded-3xl flex flex-col justify-between overflow-hidden glass-panel border border-white/10 shadow-[0_10px_50px_rgba(0,0,0,0.8)]"
          >
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-white/5 bg-black/30">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-bold text-sm text-white">{lang === 'ar' ? 'مساعد التصميم الذكي' : 'AI Design Concierge'}</h3>
                  <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span>{lang === 'ar' ? 'متصل بالسيارة' : 'Connected to Vehicle'}</span>
                  </p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={clearChat}
                  title={lang === 'ar' ? 'إعادة تعيين المحادثة' : 'Reset Conversation'}
                  className="p-1.5 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Chat Messages Log */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {chatMessages.map((msg, index) => (
                <div 
                  key={index}
                  className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'ms-auto flex-row-reverse' : ''}`}
                >
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                    msg.role === 'user' 
                      ? 'bg-white/5 border-white/10 text-white' 
                      : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                  }`}>
                    {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  {/* Bubble */}
                  <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-amber-500 text-black font-semibold rounded-tr-none'
                      : 'bg-white/5 border border-white/5 text-gray-200 rounded-tl-none'
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {isChatLoading && (
                <div className="flex gap-3 max-w-[85%]">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 border bg-amber-500/10 border-amber-500/20 text-amber-400">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="p-4 rounded-2xl text-sm bg-white/5 border border-white/5 text-gray-400 rounded-tl-none flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" />
                    <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:0.2s]" />
                    <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick action chips */}
            <div className="px-6 py-2 flex gap-2 overflow-x-auto border-t border-white/5 bg-black/10 shrink-0">
              {chips.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(chip.text)}
                  className="px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 text-[11px] text-gray-300 hover:text-white transition-all whitespace-nowrap cursor-pointer"
                >
                  {lang === 'ar' ? chip.labelAr : chip.labelEn}
                </button>
              ))}
            </div>

            {/* Footer Input */}
            <div className="p-4 border-t border-white/5 bg-black/30 flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={lang === 'ar' ? 'اكتب طلاء ذهبي، افتح الأبواب، كم القسط...' : 'Type gold paint, open doors, installments...'}
                className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/5 text-white text-sm focus:outline-none focus:border-amber-500/50 transition-colors placeholder:text-gray-600"
              />
              <button
                onClick={() => handleSend()}
                disabled={isChatLoading}
                className="p-3 bg-amber-500 text-black hover:bg-amber-400 disabled:bg-gray-700 disabled:text-gray-500 rounded-xl transition-colors shrink-0 cursor-pointer"
              >
                <Send className="w-4 h-4 rtl:rotate-180" />
              </button>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
