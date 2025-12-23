import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, RotateCcw, Sparkles, Plus, History, Trash2, Clock, Maximize2, Minimize2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// --- IndexedDB Utils ---
const DB_NAME = 'FangzhouAIChatDB';
const STORE_NAME = 'sessions';

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ChatSession {
  id: string;
  userId: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

const AIChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  useEffect(() => {
    const loadSessions = async () => {
      const db = await initDB();
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => {
        const all = request.result as ChatSession[];
        const userSessions = all.filter(s => s.userId === currentUser.id).sort((a, b) => b.updatedAt - a.updatedAt);
        setSessions(userSessions);
        if (userSessions.length > 0 && !currentSessionId) {
          setCurrentSessionId(userSessions[0].id);
        } else if (userSessions.length === 0 && isOpen) {
          createNewSession();
        }
      };
    };
    if (isOpen && currentUser.id) loadSessions();
  }, [isOpen, currentUser.id]);

  useEffect(() => scrollToBottom(), [currentSessionId, sessions, isLoading]);

  const saveSession = async (session: ChatSession) => {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(session);
  };

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      userId: currentUser.id,
      title: '新对话 ' + new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      messages: [],
      updatedAt: Date.now()
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    saveSession(newSession);
    setShowHistory(false);
  };

  const deleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    setSessions(prev => prev.filter(s => s.id !== id));
    if (currentSessionId === id) setCurrentSessionId(null);
  };

  const currentSession = sessions.find(s => s.id === currentSessionId);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !currentSessionId) return;

    const encryptedKey = localStorage.getItem('deepseek_api_key');
    if (!encryptedKey) {
      const msg: Message = { role: 'assistant', content: '⚠️ 请先在【系统设置】中配置您的 DeepSeek API Key。', timestamp: new Date().toLocaleString() };
      updateCurrentSessionMessages(msg);
      return;
    }

    const userMsgContent = input.trim();
    const userMsg: Message = { role: 'user', content: userMsgContent, timestamp: new Date().toLocaleString() };
    setInput('');
    setIsLoading(true);

    const updatedMessages = [...(currentSession?.messages || []), userMsg];
    updateCurrentSessionMessages(userMsg);

    try {
      const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:3001/api/ai/chat' : '/api/ai/chat';
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.filter(m => !m.content.includes('⚠️')).map(m => ({ role: m.role, content: m.content })),
          apiKey: encryptedKey,
          userRole: currentUser.role,
          userDepartment: currentUser.department
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      const assistantMsg: Message = { role: 'assistant', content: data.content, timestamp: new Date().toLocaleString() };
      updateCurrentSessionMessages(assistantMsg);
    } catch (error: any) {
      const errorMsg: Message = { role: 'assistant', content: `**错误**: ${error.message}`, timestamp: new Date().toLocaleString() };
      updateCurrentSessionMessages(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const updateCurrentSessionMessages = (newMsg: Message) => {
    setSessions(prev => prev.map(s => {
      if (s.id === currentSessionId) {
        const updated = { ...s, messages: [...s.messages, newMsg], updatedAt: Date.now() };
        if (s.messages.length === 0 && newMsg.role === 'user') {
            updated.title = newMsg.content.slice(0, 15) + (newMsg.content.length > 15 ? '...' : '');
        }
        saveSession(updated);
        return updated;
      }
      return s;
    }));
  };

  return (
    <div className={`fixed z-[200] font-sans transition-all duration-300 ease-in-out ${isMaximized && isOpen ? 'inset-4' : 'bottom-6 right-6'}`}>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex h-14 w-14 items-center justify-center rounded-full shadow-2xl bg-primary hover:scale-110 active:scale-95 transition-all text-white"
        >
          <MessageCircle className="h-7 w-7" />
        </button>
      )}

      {isOpen && (
        <div className={`flex flex-col overflow-hidden rounded-3xl border bg-card shadow-2xl animate-in slide-in-from-bottom-5 duration-300 transition-all ${isMaximized ? 'w-full h-full' : 'w-[400px] h-[600px]'}`}>
          {/* Header */}
          <div className="bg-primary p-4 text-white flex items-center justify-between shadow-lg shrink-0">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                <Bot className="h-5 w-5" />
              </div>
              <div className="overflow-hidden">
                <h3 className="font-bold text-sm truncate max-w-[180px]">{currentSession?.title || '方舟助手'}</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-[9px] text-white/70 uppercase font-black tracking-widest">Intelligent Agent</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setIsMaximized(!isMaximized)} className="p-2 hover:bg-white/10 rounded-xl transition-all" title={isMaximized ? "还原" : "放大"}>
                {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
              <button onClick={() => setShowHistory(!showHistory)} className="p-2 hover:bg-white/10 rounded-xl transition-all" title="历史记录"><History className="h-4 w-4" /></button>
              <button onClick={createNewSession} className="p-2 hover:bg-white/10 rounded-xl transition-all" title="新对话"><Plus className="h-4 w-4" /></button>
              <button onClick={() => {setIsOpen(false); setIsMaximized(false);}} className="p-2 hover:bg-white/10 rounded-xl transition-all"><X className="h-4 w-4" /></button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden relative flex">
            {/* History Sidebar */}
            {showHistory && (
              <div className="absolute inset-0 z-20 bg-background/95 backdrop-blur-md animate-in slide-in-from-left duration-300 border-r">
                <div className="p-4 border-b flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">历史对话</span>
                  <button onClick={() => setShowHistory(false)}><X className="h-4 w-4" /></button>
                </div>
                <div className="overflow-y-auto h-[calc(100%-60px)] p-2 space-y-1">
                  {sessions.map(s => (
                    <div 
                      key={s.id} 
                      onClick={() => { setCurrentSessionId(s.id); setShowHistory(false); }}
                      className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${currentSessionId === s.id ? 'bg-primary/10 border-primary/20 border' : 'hover:bg-muted'}`}
                    >
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-sm font-bold truncate pr-2">{s.title}</span>
                        <span className="text-[10px] text-muted-foreground">{new Date(s.updatedAt).toLocaleDateString()}</span>
                      </div>
                      <button onClick={(e) => deleteSession(s.id, e)} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-destructive/10 text-destructive rounded-lg transition-all"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Chat Content */}
            <div className="flex-1 flex flex-col bg-muted/20 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar scroll-smooth">
                {currentSession?.messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-4">
                    <div className="bg-primary/10 p-5 rounded-full shadow-inner"><Sparkles className="h-8 w-8 text-primary" /></div>
                    <div className="space-y-2">
                        <h4 className="font-bold text-sm uppercase tracking-widest text-foreground">欢迎，{currentUser.name}</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed max-w-[250px] mx-auto">
                          我是方舟智能助手。由于我仅限本机查看，您可以放心地询问关于项目数据的敏感问题。
                        </p>
                    </div>
                  </div>
                )}
                {currentSession?.messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className="relative group max-w-[95%] sm:max-w-[85%]">
                      <div className="absolute -top-6 left-0 right-0 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none duration-200">
                        <span className="bg-foreground/90 text-background text-[10px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 shadow-xl backdrop-blur-sm">
                          <Clock className="h-3 w-3" /> {msg.timestamp}
                        </span>
                      </div>
                      
                      <div className={`rounded-2xl px-4 py-3 text-sm shadow-sm transition-all duration-200 ${
                        msg.role === 'user' 
                          ? 'bg-primary text-primary-foreground rounded-tr-none shadow-primary/10' 
                          : 'bg-card border border-border/50 rounded-tl-none text-foreground shadow-sm'
                      }`}>
                        <div className={`flex items-center gap-2 mb-2 opacity-50 text-[9px] font-black uppercase tracking-tighter ${msg.role === 'user' ? 'justify-end' : ''}`}>
                          {msg.role === 'user' ? <><span className="mt-0.5">YOU</span><User className="h-3 w-3" /></> : <><Bot className="h-3 w-3" /><span className="mt-0.5">ARK AI</span></>}
                        </div>
                        {msg.role === 'assistant' ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none break-words overflow-x-hidden
                            prose-p:leading-relaxed prose-pre:bg-muted prose-pre:p-4 prose-pre:rounded-xl prose-pre:overflow-x-auto 
                            prose-code:text-primary prose-code:bg-primary/5 prose-code:px-1 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {msg.content}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <div className="whitespace-pre-wrap font-medium leading-relaxed">{msg.content}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-card border border-border/50 rounded-2xl rounded-tl-none px-5 py-4 shadow-sm flex gap-1.5 items-center">
                      <div className="h-1.5 w-1.5 bg-primary rounded-full animate-bounce" />
                      <div className="h-1.5 w-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                      <div className="h-1.5 w-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} className="h-4" />
              </div>

              {/* Input Area */}
              <div className="p-4 bg-card border-t border-border/50 shrink-0">
                <div className="relative flex items-center gap-2 max-w-4xl mx-auto w-full">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="在这里输入您的问题..."
                    className="flex-1 bg-muted/40 border-border/40 border rounded-2xl py-3.5 pl-5 pr-14 text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all placeholder:text-muted-foreground/40"
                  />
                  <button
                    onClick={handleSend}
                    disabled={isLoading || !input.trim()}
                    className="absolute right-2 p-2.5 bg-primary text-white rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-20 shadow-lg shadow-primary/20"
                  >
                    {isLoading ? <RotateCcw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </div>
                <p className="mt-3 text-[10px] text-center text-muted-foreground/50 font-bold uppercase tracking-[0.2em]">
                  Local History • Privacy Protected
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIChat;
