import React, { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Paperclip, Send, Bot, User as UserIcon, Brain, ListTodo, FileText } from 'lucide-react';
import { Message, MemoryItem, FileAttachment } from '../types';
import { processChat, extractMemories, generateTaskPlan, generateReasoning } from '../services/aiService';

interface ChatInterfaceProps {
  memories: MemoryItem[];
  onAddMemory: (memory: Omit<MemoryItem, 'id' | 'createdAt'>) => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ memories, onAddMemory }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'assistant-initial',
      role: 'assistant',
      content: 'Greetings. I am Mythical, your personal intelligence interface. How may I assist you today?',
      timestamp: Date.now(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<FileAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageListRef = useRef<HTMLDivElement>(null);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);

  const updateScroll = () => {
    const node = messageListRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' });
  };

  useEffect(() => {
    if (autoScrollEnabled) {
      updateScroll();
    }
  }, [messages, autoScrollEnabled]);

  const handleScroll = () => {
    const node = messageListRef.current;
    if (!node) return;
    const nearBottom = node.scrollHeight - node.scrollTop - node.clientHeight < 120;
    setAutoScrollEnabled(nearBottom);
  };

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
        base64Data: base64String,
      };
      setPendingFiles((prev) => [...prev, newAttachment]);
    };

    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const createAssistantPlaceholder = (): Message => ({
    id: `assistant-${Date.now()}`,
    role: 'assistant',
    content: '',
    timestamp: Date.now(),
  });

  const handleSend = async () => {
    if (!inputValue.trim() && pendingFiles.length === 0) return;

    const userText = inputValue.trim();
    const currentFiles = [...pendingFiles];
    const assistantPlaceholder = createAssistantPlaceholder();

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userText,
      timestamp: Date.now(),
      attachments: currentFiles.length > 0 ? currentFiles : undefined,
    };

    setMessages((prev) => [...prev, userMessage, assistantPlaceholder]);
    setInputValue('');
    setPendingFiles([]);
    setIsProcessing(true);

    extractMemories(userText)
      .then((newMemories) => {
        if (newMemories && newMemories.length > 0) {
          newMemories.forEach((memory) => onAddMemory(memory));
        }
      })
      .catch(() => undefined);

    await processChat(
      userText,
      [...messages, userMessage],
      memories,
      currentFiles,
      (partialText) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantPlaceholder.id ? { ...msg, content: partialText } : msg
          )
        );
      }
    );

    setIsProcessing(false);
  };

  const handlePlanTask = async () => {
    if (!inputValue.trim()) return;

    const objective = inputValue.trim();
    setInputValue('');
    setIsProcessing(true);

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: `Please create a task plan for: ${objective}`,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);

    const tasks = await generateTaskPlan(objective);
    if (tasks) {
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: 'I have analyzed your objective and created the following task plan:',
        timestamp: Date.now(),
        tasks: tasks.map((task, index) => ({ ...task, id: `task-${index}`, status: 'pending' })),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    }

    setIsProcessing(false);
  };

  const handleDeepReasoning = async () => {
    if (!inputValue.trim()) return;

    const query = inputValue.trim();
    setInputValue('');
    setIsProcessing(true);

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);

    const responseText = await generateReasoning(query);
    if (responseText) {
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: responseText,
        timestamp: Date.now(),
        reasoning: 'Deep reasoning engine utilized for this response.',
      };
      setMessages((prev) => [...prev, assistantMessage]);
    }

    setIsProcessing(false);
  };

  return (
    <div className="flex flex-col h-full relative bg-[var(--bg)] text-[var(--text)]">
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/20 to-transparent pointer-events-none" />

      <div
        ref={messageListRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 relative z-10"
      >
        <AnimatePresence mode="popLayout">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
            >
              <MessageBubble message={msg} />
            </motion.div>
          ))}
        </AnimatePresence>

        {isProcessing && (
          <div className="flex items-center gap-3 text-zinc-500 max-w-4xl mx-auto">
            <span className="text-sm">Mythical is thinking</span>
            <div className="flex items-center gap-1">
              {[0, 1, 2].map((index) => (
                <motion.span
                  key={index}
                  className="block w-2 h-2 rounded-full bg-zinc-500"
                  animate={{ y: [0, -6, 0] }}
                  transition={{ repeat: Infinity, duration: 0.7, delay: index * 0.1 }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="p-4 md:p-6 relative z-10 bg-gradient-to-t from-[var(--surface)] via-[var(--surface)]/90 to-transparent pt-10 border-t border-[var(--border)]">
        <div className="max-w-4xl mx-auto">
          {pendingFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {pendingFiles.map((file) => (
                <div key={file.id} className="flex items-center gap-2 bg-white/10 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-zinc-300">
                  <FileText className="w-3 h-3" />
                  <span className="truncate max-w-[170px]">{file.name}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2 mb-3 px-2">
            <button
              onClick={handlePlanTask}
              disabled={!inputValue.trim() || isProcessing}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50"
            >
              <ListTodo className="w-3.5 h-3.5" /> Plan Task
            </button>
            <button
              onClick={handleDeepReasoning}
              disabled={!inputValue.trim() || isProcessing}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50"
            >
              <Brain className="w-3.5 h-3.5" /> Deep Reason
            </button>
          </div>

          <div className="relative flex items-end gap-2 bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-2 focus-within:border-white/20 focus-within:bg-white/[0.05] transition-all shadow-2xl">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*,application/pdf,text/plain"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 text-zinc-400 hover:text-zinc-200 transition-colors rounded-xl hover:bg-white/10 flex-shrink-0"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Message Mythical..."
              className="w-full max-h-48 min-h-[44px] bg-transparent text-[var(--text)] placeholder-zinc-500 resize-none focus:outline-none py-2.5 px-2 text-sm leading-relaxed"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <button
              onClick={handleSend}
              disabled={(!inputValue.trim() && pendingFiles.length === 0) || isProcessing}
              className="p-2.5 text-zinc-900 bg-zinc-100 hover:bg-white disabled:bg-white/10 disabled:text-zinc-600 transition-all rounded-xl flex-shrink-0 shadow-lg disabled:shadow-none"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const MessageBubble: React.FC<{ message: Message }> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <motion.div
      className={`flex gap-4 max-w-4xl mx-auto ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
    >
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 border ${
          isUser
            ? 'bg-white/10 border-white/10 text-zinc-300'
            : 'bg-zinc-100 border-zinc-100 text-zinc-900 shadow-[0_0_15px_rgba(255,255,255,0.2)]'
        }`}
      >
        {isUser ? <UserIcon className="w-4 h-4" /> : <Bot className="w-5 h-5" />}
      </div>
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[80%]`}>
        <div className="text-xs text-zinc-500 mb-1.5 font-medium tracking-wide uppercase flex items-center gap-2">
          {isUser ? 'You' : 'Mythical'}
          {message.reasoning && (
            <span className="flex items-center gap-1 text-[10px] bg-white/5 px-2 py-0.5 rounded-full text-zinc-400">
              <Brain className="w-3 h-3" /> Reasoned
            </span>
          )}
        </div>
        <div
          className={`text-sm leading-relaxed px-5 py-3.5 rounded-2xl ${
            isUser
              ? 'bg-white/10 border border-white/5 text-zinc-200 rounded-tr-sm backdrop-blur-md'
              : 'bg-white/5 border border-white/10 text-zinc-900 dark:text-zinc-100'
          }`}
        >
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {message.attachments.map((attachment) => (
                <div key={attachment.id} className="flex items-center gap-2 bg-black/20 border border-white/5 rounded-lg px-3 py-2 text-xs">
                  <FileText className="w-4 h-4 text-zinc-400" />
                  <span>{attachment.name}</span>
                </div>
              ))}
            </div>
          )}
          <div className="whitespace-pre-wrap break-words">{message.content}</div>
          {message.tasks && message.tasks.length > 0 && (
            <div className="mt-4 space-y-2">
              {message.tasks.map((task) => (
                <div key={task.id} className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-4 h-4 rounded border border-zinc-500 flex-shrink-0" />
                    <span className="font-medium text-zinc-200">{task.title}</span>
                  </div>
                  <p className="text-xs text-zinc-400 pl-6">{task.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
