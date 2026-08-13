import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MessageCircle, X, Send, Bot, User, RotateCcw, Sparkles, Plus, History, Trash2, Clock, Maximize2, Minimize2, Copy, Check } from 'lucide-react';
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
  id?: string;
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

// --- Markdown 渲染组件：增强各元素样式，尤其表格 ---
const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  return (
    <div className="ai-markdown text-sm leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // 表格：横向滚动容器 + 斑马纹 + 表头样式
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-xl border border-border/60 shadow-sm">
              <table className="w-full min-w-[400px] border-collapse text-xs">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-primary/10 text-foreground font-bold">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="border-b border-border/60 px-3 py-2 text-left font-bold whitespace-nowrap">{children}</th>
          ),
          td: ({ children }) => (
            <td className="border-b border-border/40 px-3 py-2 align-top whitespace-nowrap">{children}</td>
          ),
          tr: ({ children }) => (
            <tr className="odd:bg-background even:bg-muted/30 hover:bg-primary/5 transition-colors">{children}</tr>
          ),
          // 代码块：带浅色背景和横向滚动
          code: (props: any) => {
            const { inline, children, className } = props;
            if (inline) {
              return <code className="rounded bg-primary/10 px-1.5 py-0.5 text-[0.85em] font-semibold text-primary before:content-none after:content-none">{children}</code>;
            }
            return (
              <code className={className || ''}>{children}</code>
            );
          },
          pre: ({ children }) => (
            <pre className="my-3 overflow-x-auto rounded-xl bg-muted p-4 text-xs leading-relaxed shadow-inner">{children}</pre>
          ),
          // 标题
          h1: ({ children }) => <h1 className="mt-4 mb-2 text-lg font-black border-b border-border/40 pb-1.5">{children}</h1>,
          h2: ({ children }) => <h2 className="mt-4 mb-2 text-base font-extrabold">{children}</h2>,
          h3: ({ children }) => <h3 className="mt-3 mb-1.5 text-sm font-bold">{children}</h3>,
          h4: ({ children }) => <h4 className="mt-2 mb-1 text-sm font-bold">{children}</h4>,
          // 列表
          ul: ({ children }) => <ul className="my-2 space-y-1 pl-5 list-disc marker:text-primary">{children}</ul>,
          ol: ({ children }) => <ol className="my-2 space-y-1 pl-5 list-decimal marker:text-primary">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          // 段落/引用/分隔线
          p: ({ children }) => <p className="my-1.5">{children}</p>,
          blockquote: ({ children }) => (
            <blockquote className="my-2 border-l-4 border-primary/40 bg-primary/5 px-3 py-1.5 rounded-r-lg text-muted-foreground italic">{children}</blockquote>
          ),
          hr: () => <hr className="my-3 border-border/50" />,
          // 加粗/斜体
          strong: ({ children }) => <strong className="font-extrabold text-foreground">{children}</strong>,
          em: ({ children }) => <em className="text-foreground">{children}</em>,
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noreferrer" className="text-primary font-medium underline underline-offset-2 hover:text-primary/80">{children}</a>
          ),
          input: (props: any) => {
            const { checked, disabled } = props;
            return checked ? <span className="text-primary">☑</span> : <span className="text-muted-foreground">☐</span>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

const AIChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // 一键复制消息内容
  const handleCopyMessage = async (id: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMsgId(id);
      setTimeout(() => setCopiedMsgId(prev => (prev === id ? null : prev)), 1500);
    } catch {
      // 降级方案：textarea 复制
      const ta = document.createElement('textarea');
      ta.value = content;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedMsgId(id);
      setTimeout(() => setCopiedMsgId(prev => (prev === id ? null : prev)), 1500);
    }
  };

  // 点击轮次轴节点，滚动到对应提问位置
  const jumpToTurn = (msgId: string) => {
    const el = messageRefs.current[msgId];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // 可拖拽/缩放窗口：位置与尺寸（持久化到 localStorage）
  const [windowPos, setWindowPos] = useState(() => {
    try {
      const saved = localStorage.getItem('ai_chat_window');
      if (saved) return JSON.parse(saved);
    } catch {}
    return { x: null as number | null, y: null as number | null }; // null = 默认右下角
  });
  const [windowSize, setWindowSize] = useState(() => {
    try {
      const saved = localStorage.getItem('ai_chat_size');
      if (saved) return JSON.parse(saved);
    } catch {}
    return { w: 820, h: 600 };
  });
  const dragStateRef = useRef<{ startX: number, startY: number, origX: number, origY: number } | null>(null);
  const resizeStateRef = useRef<{ startX: number, startY: number, origW: number, origH: number } | null>(null);
  const winRef = useRef<HTMLDivElement>(null);

  // 持久化窗口位置与尺寸
  useEffect(() => {
    localStorage.setItem('ai_chat_window', JSON.stringify(windowPos));
  }, [windowPos]);
  useEffect(() => {
    localStorage.setItem('ai_chat_size', JSON.stringify(windowSize));
  }, [windowSize]);

  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  // ===== 拖拽逻辑 =====
  const onHeaderMouseDown = (e: React.MouseEvent) => {
    if (isMaximized) return;
    // 忽略点击按钮时的拖拽
    if ((e.target as HTMLElement).closest('button')) return;
    const vw = window.innerWidth, vh = window.innerHeight;
    const rect = winRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragStateRef.current = { startX: e.clientX, startY: e.clientY, origX: rect.left, origY: rect.top };
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
    const onMove = (ev: MouseEvent) => {
      const s = dragStateRef.current;
      if (!s) return;
      const dx = ev.clientX - s.startX;
      const dy = ev.clientY - s.startY;
      let nx = s.origX + dx;
      let ny = s.origY + dy;
      // 边界约束：至少保留标题栏在可视区内
      nx = Math.min(Math.max(nx, -rect.width + 120), vw - 120);
      ny = Math.min(Math.max(ny, 0), vh - 60);
      setWindowPos({ x: nx, y: ny });
    };
    const onUp = () => {
      dragStateRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // ===== 缩放逻辑 =====
  const onResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMaximized) return;
    const rect = winRef.current?.getBoundingClientRect();
    if (!rect) return;
    resizeStateRef.current = { startX: e.clientX, startY: e.clientY, origW: rect.width, origH: rect.height };
    document.body.style.cursor = 'nwse-resize';
    document.body.style.userSelect = 'none';
    const onMove = (ev: MouseEvent) => {
      const s = resizeStateRef.current;
      if (!s) return;
      const dx = ev.clientX - s.startX;
      const dy = ev.clientY - s.startY;
      const nw = Math.min(Math.max(s.origW + dx, 420), window.innerWidth - 40);
      const nh = Math.min(Math.max(s.origH + dy, 320), window.innerHeight - 40);
      setWindowSize({ w: nw, h: nh });
    };
    const onUp = () => {
      resizeStateRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // 计算窗口定位样式：null = 默认右下角
  const windowStyle: React.CSSProperties = (() => {
    if (isMaximized) return { inset: 16 };
    const base: React.CSSProperties = { width: windowSize.w, height: windowSize.h };
    if (windowPos.x !== null && windowPos.y !== null) {
      base.left = windowPos.x;
      base.top = windowPos.y;
    } else {
      base.right = 24;
      base.bottom = 24;
    }
    return base;
  })();

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

  useEffect(() => {
    scrollToBottom();
  }, [currentSessionId, sessions, isLoading]);

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

  // 计算对话轮次：每一轮 = 一条用户提问（+ 紧随其后的 AI 回复）
  const turns = useMemo(() => {
    const msgs = currentSession?.messages || [];
    const result: { turn: number, msgId: string, preview: string, timestamp: string, index: number }[] = [];
    let turnCount = 0;
    msgs.forEach((m, idx) => {
      if (m.role === 'user') {
        turnCount++;
        const preview = m.content.slice(0, 20) + (m.content.length > 20 ? '…' : '');
        result.push({ turn: turnCount, msgId: m.id || `idx_${idx}`, preview, timestamp: m.timestamp, index: idx });
      }
    });
    return result;
  }, [currentSession?.messages]);

  // 稳定的消息 key（兼容旧数据无 id 的情况）
  const msgKey = (m: Message, idx: number) => m.id || `idx_${idx}`;

  // 生成消息唯一 id（供复制/轮次跳转使用）
  const genMsgId = () => `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const handleSend = async () => {
    if (!input.trim() || isLoading || !currentSessionId) return;

    const encryptedKey = localStorage.getItem('deepseek_api_key');
    if (!encryptedKey) {
      const msg: Message = { id: genMsgId(), role: 'assistant', content: '⚠️ 请先在【系统设置】中配置您的 DeepSeek API Key。', timestamp: new Date().toLocaleString() };
      updateCurrentSessionMessages(msg);
      return;
    }

    const userMsgContent = input.trim();
    const userMsg: Message = { id: genMsgId(), role: 'user', content: userMsgContent, timestamp: new Date().toLocaleString() };
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
          userDepartment: currentUser.department,
          userName: currentUser.name
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      const assistantMsg: Message = { id: genMsgId(), role: 'assistant', content: data.content, timestamp: new Date().toLocaleString() };
      updateCurrentSessionMessages(assistantMsg);
    } catch (error: any) {
      const errorMsg: Message = { id: genMsgId(), role: 'assistant', content: `**错误**: ${error.message}`, timestamp: new Date().toLocaleString() };
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
    <div className="fixed z-[200] font-sans">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full shadow-2xl bg-primary hover:scale-110 active:scale-95 transition-all text-white"
          title="打开方舟助手"
        >
          <MessageCircle className="h-7 w-7" />
        </button>
      )}

      {isOpen && (
        <div
          ref={winRef}
          style={windowStyle}
          className="fixed flex flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl"
        >
          {/* Header（可拖拽移动） */}
          <div
            onMouseDown={onHeaderMouseDown}
            className="bg-primary px-4 py-3 text-white flex items-center justify-between shadow-lg shrink-0 cursor-grab active:cursor-grabbing select-none"
          >
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
              <button onClick={() => {setIsOpen(false); setIsMaximized(false);}} className="p-2 hover:bg-white/10 rounded-xl transition-all" title="关闭"><X className="h-4 w-4" /></button>
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
                {currentSession?.messages.map((msg, i) => {
                  const key = msgKey(msg, i);
                  // 该消息是否是一轮提问的起始（用户消息）
                  const isTurnStart = msg.role === 'user';
                  const turnInfo = turns.find(t => t.msgId === key);
                  return (
                  <div key={key} ref={el => { messageRefs.current[key] = el; }} className={`relative flex items-start ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {/* 轮次圆点（仅提问消息显示，固定在行最左侧，不与复制按钮冲突） */}
                    {isTurnStart && (
                      <button
                        onClick={() => jumpToTurn(key)}
                        title={turnInfo?.preview || msg.content}
                        className="group absolute left-0 top-3 z-10"
                      >
                        <span className="block h-2.5 w-2.5 rounded-full border border-border bg-muted-foreground/40 transition-all group-hover:bg-primary group-hover:scale-125 group-hover:shadow-md group-hover:shadow-primary/30" />
                        {/* 悬停预览：立即显示，前20个字，气泡向右展开 */}
                        <span className="pointer-events-none absolute left-4 top-1/2 z-30 -translate-y-1/2 whitespace-nowrap rounded-lg border border-border bg-foreground px-2.5 py-1.5 text-[11px] font-medium text-background opacity-0 shadow-lg group-hover:opacity-100 transition-opacity duration-75">
                          {turnInfo?.preview || msg.content.slice(0, 20)}
                        </span>
                      </button>
                    )}
                    <div className={`relative group max-w-[95%] sm:max-w-[85%] ${isTurnStart ? 'ml-7' : ''}`}>
                      <div className="absolute -top-6 left-0 right-0 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none duration-200">
                        <span className="bg-foreground/90 text-background text-[10px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 shadow-xl backdrop-blur-sm">
                          <Clock className="h-3 w-3" /> {msg.timestamp}
                        </span>
                      </div>

                      {/* 复制按钮（hover 显示）：用户消息在气泡内左上角，AI消息在右外侧 */}
                      <button
                        onClick={() => handleCopyMessage(key, msg.content)}
                        title="复制内容"
                        className={`absolute top-2 z-10 flex h-7 w-7 items-center justify-center rounded-lg border bg-card text-muted-foreground shadow-sm transition-all hover:text-primary hover:border-primary/30 ${msg.role === 'user' ? 'left-2 opacity-0 group-hover:opacity-100' : '-right-9 opacity-0 group-hover:opacity-100'}`}
                      >
                        {copiedMsgId === key ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                      {copiedMsgId === key && (
                        <span className={`absolute top-9 text-[10px] font-bold text-green-500 ${msg.role === 'user' ? 'left-2' : '-right-9'}`}>已复制</span>
                      )}

                      <div className={`rounded-2xl px-4 py-3 text-sm shadow-sm transition-all duration-200 ${
                        msg.role === 'user' 
                          ? 'bg-primary text-primary-foreground rounded-tr-none shadow-primary/10' 
                          : 'bg-card border border-border/50 rounded-tl-none text-foreground shadow-sm'
                      }`}>
                        <div className={`flex items-center gap-2 mb-2 opacity-50 text-[9px] font-black uppercase tracking-tighter ${msg.role === 'user' ? 'justify-end' : ''}`}>
                          {msg.role === 'user' ? <><span className="mt-0.5">YOU</span><User className="h-3 w-3" /></> : <><Bot className="h-3 w-3" /><span className="mt-0.5">ARK AI</span></>}
                        </div>
                        {msg.role === 'assistant' ? (
                          <div className="max-w-none break-words overflow-x-hidden">
                            <MarkdownRenderer content={msg.content} />
                          </div>
                        ) : (
                          <div className="whitespace-pre-wrap font-medium leading-relaxed">{msg.content}</div>
                        )}
                      </div>
                    </div>
                  </div>
                  );
                })}
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

          {/* 右下角缩放手柄 */}
          {!isMaximized && (
            <div
              onMouseDown={onResizeMouseDown}
              className="absolute bottom-0 right-0 z-30 flex h-6 w-6 cursor-nwse-resize items-end justify-end p-1"
              title="拖动调整大小"
            >
              <div className="h-3 w-3 rounded-sm border-r-2 border-b-2 border-muted-foreground/40" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AIChat;
