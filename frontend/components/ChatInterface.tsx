import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Paperclip, Send, Brain, ListTodo, FileText, Loader2, Zap } from 'lucide-react';
import { Message, MemoryItem, FileAttachment } from '../types';
import { processChat, processStreamingChat, extractMemories, generateTaskPlan, generateReasoning } from '../services/aiService';
import { LoadingIndicator } from './LoadingIndicator';

interface ChatInterfaceProps {
  memories: MemoryItem[];
  onAddMemory: (memory: Omit<MemoryItem, 'id' | 'createdAt'>) => void;
}

type AiProvider = 'gemini' | 'claude' | 'gpt';

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ memories, onAddMemory }) => {
  const [messages, setMessages] = useState<Message[]>([{
    id: '1',
    role: 'assistant',
    content: 'Greetings. I am Mythical, your personal intelligence interface. How may I assist you today?',
    timestamp: Date.now(),
  }]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<FileAttachment[]>([]);
  const [aiProvider, setAiProvider] = useState<AiProvider>('gemini');
  const [useStreaming, setUseStreaming] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // File Understanding Flow
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const base64String = (event.target?.result as string).split(',')[1];
      const newAttachment: FileAttachment = {
        id: Date.now().toString(),
        name: file.name,
        size: file.size,
        type: file.type,
        base64Data: base64String
      };
      setPendingFiles(prev => [...prev, newAttachment]);
    };
    
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Main Chat Flow
  const handleSend = async () => {
    if (!inputValue.trim() && pendingFiles.length === 0) return;
    
    const userText = inputValue;
    const currentFiles = [...pendingFiles];
    
    const newUserMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userText,
      timestamp: Date.now(),
      attachments: currentFiles.length > 0 ? currentFiles : undefined
    };
    
    setMessages(prev => [...prev, newUserMsg]);
    setInputValue('');
    setPendingFiles([]);
    setIsProcessing(true);

    // Architecture Flow: 1. Extract Memory (Background)
    extractMemories(userText).then(newMemories => {
      if (newMemories && newMemories.length > 0) {
        newMemories.forEach(m => onAddMemory(m));
      }
    });

    // Architecture Flow: 2. Process Chat with Context
    try {
      let responseText = '';

      if (useStreaming) {
        // Real-time streaming from AI provider
        responseText = await processStreamingChat(userText, aiProvider, (chunk) => {
          // Update the last message with streaming chunk
          setMessages(prev => {
            const updated = [...prev];
            if (updated[updated.length - 1]?.role === 'assistant') {
              updated[updated.length - 1].content = chunk;
            } else {
              updated.push({
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: chunk,
                timestamp: Date.now(),
              });
            }
            return updated;
          });
        }) || '';
      } else {
        // Standard fallback response
        responseText = await processChat(userText, messages, memories, currentFiles) || '';
      }

      if (responseText && !useStreaming) {
        const newAssistantMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: responseText,
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, newAssistantMsg]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'An error occurred while processing your message. Please try again.',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMsg]);
    }
    
    setIsProcessing(false);
  };

  // Task Planning Flow
  const handlePlanTask = async () => {
    if (!inputValue.trim()) return;
    const objective = inputValue;
    setInputValue('');
    setIsProcessing(true);

    const newUserMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: `[Task Planning] ${objective}`,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, newUserMsg]);

    try {
      const plan = await generateTaskPlan(objective);
      
      const planContent = plan && plan.length > 0
        ? plan.map((t, i) => `${i + 1}. **${t.title}**: ${t.description}`).join('\n\n')
        : `Unable to generate a task plan for: ${objective}`;

      const newAssistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: planContent,
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, newAssistantMsg]);
    } catch (error) {
      console.error('Task planning error:', error);
    }

    setIsProcessing(false);
  };

  // Reasoning Flow
  const handleReason = async () => {
    if (!inputValue.trim()) return;
    const query = inputValue;
    setInputValue('');
    setIsProcessing(true);

    const newUserMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: `[Reasoning] ${query}`,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, newUserMsg]);

    try {
      const reasoning = await generateReasoning(query);
      const newAssistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: reasoning || 'Unable to generate reasoning.',
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, newAssistantMsg]);
    } catch (error) {
      console.error('Reasoning error:', error);
    }

    setIsProcessing(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#030303]">
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-2xl px-4 py-3 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-white/10 text-zinc-100 border border-white/10'
                  : 'bg-white/5 text-zinc-300 border border-white/5'
              }`}>
                <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {msg.attachments.map(att => (
                      <div key={att.id} className="text-xs text-zinc-500 flex items-center gap-1">
                        <FileText className="w-3 h-3" /> {att.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isProcessing && <LoadingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* File Attachments Preview */}
      {pendingFiles.length > 0 && (
        <motion.div className="px-6 py-2 border-t border-white/5 space-y-2">
          <p className="text-xs text-zinc-500">Attachments:</p>
          {pendingFiles.map(file => (
            <div key={file.id} className="flex items-center justify-between p-2 bg-white/5 rounded text-xs text-zinc-400">
              <span>{file.name}</span>
              <button onClick={() => setPendingFiles(prev => prev.filter(f => f.id !== file.id))} className="text-red-400 hover:text-red-300">✕</button>
            </div>
          ))}
        </motion.div>
      )}

      {/* Input Area */}
      <div className="border-t border-white/5 p-4 space-y-3 bg-gradient-to-t from-black/50">
        {/* Provider & Mode Selection */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">Provider:</span>
            {(['gemini', 'claude', 'gpt'] as AiProvider[]).map(provider => (
              <motion.button
                key={provider}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setAiProvider(provider)}
                className={`px-2 py-1 text-xs rounded transition-all ${
                  aiProvider === provider
                    ? 'bg-white/20 text-zinc-100 border border-white/20'
                    : 'bg-white/5 text-zinc-400 border border-white/10 hover:bg-white/10'
                }`}
              >
                {provider.charAt(0).toUpperCase() + provider.slice(1)}
              </motion.button>
            ))}
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setUseStreaming(!useStreaming)}
            className={`px-2 py-1 text-xs rounded transition-all flex items-center gap-1 ${
              useStreaming
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-white/5 text-zinc-400 border border-white/10 hover:bg-white/10'
            }`}
          >
            <Zap className="w-3 h-3" /> {useStreaming ? 'Streaming' : 'Standard'}
          </motion.button>
        </div>

        {/* Input Field */}
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
          />
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 transition-colors disabled:opacity-50"
          >
            <Paperclip className="w-5 h-5" />
          </motion.button>

          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type your message... (Shift+Enter for multiline)"
            disabled={isProcessing}
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-400 transition-colors disabled:opacity-50"
          />

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSend}
            disabled={isProcessing || (!inputValue.trim() && pendingFiles.length === 0)}
            className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 transition-colors disabled:opacity-50"
          >
            {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </motion.button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 text-xs">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleReason}
            disabled={isProcessing || !inputValue.trim()}
            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-zinc-400 transition-colors disabled:opacity-50 flex items-center gap-1"
          >
            <Brain className="w-3 h-3" /> Reason
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handlePlanTask}
            disabled={isProcessing || !inputValue.trim()}
            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-zinc-400 transition-colors disabled:opacity-50 flex items-center gap-1"
          >
            <ListTodo className="w-3 h-3" /> Plan
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
