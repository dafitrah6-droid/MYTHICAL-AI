import React, { useState, useRef } from 'react';
import { Paperclip, Send, Bot, User as UserIcon, Brain, ListTodo, FileText, Loader2 } from 'lucide-react';
import { Message, MemoryItem, FileAttachment, Task } from '../types';
import { processChat, extractMemories, generateTaskPlan, generateReasoning } from '../services/aiService';

interface ChatInterfaceProps {
  memories: MemoryItem[];
  onAddMemory: (memory: Omit<MemoryItem, 'id' | 'createdAt'>) => void;
}

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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    const responseText = await processChat(userText, messages, memories, currentFiles);
    
    if (responseText) {
      const newAssistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseText,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, newAssistantMsg]);
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
      content: `Please create a task plan for: ${objective}`,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, newUserMsg]);

    const tasks = await generateTaskPlan(objective);
    
    if (tasks) {
      const newAssistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I have analyzed your objective and created the following task plan:`,
        timestamp: Date.now(),
        tasks: tasks.map((t, i) => ({ ...t, id: `t-${i}`, status: 'pending' }))
      };
      setMessages(prev => [...prev, newAssistantMsg]);
    }
    setIsProcessing(false);
  };

  // Reasoning Engine Flow
  const handleDeepReasoning = async () => {
    if (!inputValue.trim()) return;
    const query = inputValue;
    setInputValue('');
    setIsProcessing(true);

    const newUserMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, newUserMsg]);

    const responseText = await generateReasoning(query);
    
    if (responseText) {
      const newAssistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseText,
        timestamp: Date.now(),
        reasoning: "Deep reasoning engine utilized for this response."
      };
      setMessages(prev => [...prev, newAssistantMsg]);
    }
    setIsProcessing(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#030303] relative">
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/20 to-transparent pointer-events-none" />

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 relative z-10">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isProcessing && (
          <div className="flex items-center gap-3 text-zinc-500 max-w-4xl mx-auto">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Mythical is processing...</span>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 md:p-6 relative z-10 bg-gradient-to-t from-[#030303] via-[#030303]/90 to-transparent pt-10">
        <div className="max-w-4xl mx-auto">
          
          {/* Pending Files UI */}
          {pendingFiles.length > 0 && (
            <div className="flex gap-2 mb-3">
              {pendingFiles.map(f => (
                <div key={f.id} className="flex items-center gap-2 bg-white/10 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-zinc-300">
                  <FileText className="w-3 h-3" />
                  <span className="truncate max-w-[150px]">{f.name}</span>
                </div>
              ))}
            </div>
          )}

          {/* AI Feature Toggles (Architecture Demo) */}
          <div className="flex gap-2 mb-3 px-2">
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
              className="w-full max-h-48 min-h-[44px] bg-transparent text-zinc-100 placeholder-zinc-600 resize-none focus:outline-none py-2.5 px-2 text-sm leading-relaxed"
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
    <div className={`flex gap-4 max-w-4xl mx-auto ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 border ${
        isUser 
          ? 'bg-white/10 border-white/10 text-zinc-300' 
          : 'bg-zinc-100 border-zinc-100 text-zinc-900 shadow-[0_0_15px_rgba(255,255,255,0.2)]'
      }`}>
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
        
        <div className={`text-sm leading-relaxed px-5 py-3.5 rounded-2xl ${
          isUser 
            ? 'bg-white/10 border border-white/5 text-zinc-200 rounded-tr-sm backdrop-blur-md' 
            : 'bg-transparent text-zinc-300'
        }`}>
          {/* Attachments Display */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {message.attachments.map(att => (
                <div key={att.id} className="flex items-center gap-2 bg-black/20 border border-white/5 rounded-lg px-3 py-2 text-xs">
                  <FileText className="w-4 h-4 text-zinc-400" />
                  <span>{att.name}</span>
                </div>
              ))}
            </div>
          )}

          {/* Text Content */}
          <div className="whitespace-pre-wrap">{message.content}</div>

          {/* Tasks Display */}
          {message.tasks && message.tasks.length > 0 && (
            <div className="mt-4 space-y-2">
              {message.tasks.map(task => (
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
    </div>
  );
};
