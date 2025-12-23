import React, { useState, useEffect } from 'react';
import { login } from '../services/api';
import { RotateCcw, User, Lock, ArrowRight, ShieldCheck, Sparkles, X, Info } from 'lucide-react';

interface LoginProps {
  onLogin: (username: string, department?: string, role?: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [randomId, setRandomId] = useState(0);
  const [modal, setModal] = useState<{ title: string; message: string } | null>(null);

  useEffect(() => {
    setRandomId(Math.floor(Math.random() * 1000));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
        const user = await login(username, password);
        onLogin(user.name, user.department, user.role);
    } catch (err: any) {
        setError(err.message || '登录验证失败');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background font-sans antialiased text-foreground selection:bg-primary/30">
      {/* 左侧视觉区 */}
      <div className="relative hidden lg:flex lg:w-1/2 xl:w-3/5 overflow-hidden border-r border-border/50">
        <img
          src={`https://picsum.photos/1600/1200?random=${randomId}`}
          alt="Atmospheric Background"
          className="absolute inset-0 h-full w-full object-cover grayscale-[10%] brightness-[0.85] transition-transform duration-[10s] ease-linear hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-background/20 via-transparent to-background/40" />
        <div className="relative z-10 flex flex-col justify-between h-full p-16">
          <div className="flex items-center gap-3">
            <div className="bg-primary/20 backdrop-blur-xl p-2.5 rounded-2xl border border-white/20 shadow-2xl">
              <ShieldCheck className="h-9 w-9 text-white" />
            </div>
            <span className="text-2xl font-black tracking-tighter text-white drop-shadow-md">FANGZHOU.</span>
          </div>
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-bold mb-6">
              <Sparkles className="h-3 w-3 text-yellow-300" /> 
              <span>Next Generation Management</span>
            </div>
            <h1 className="text-6xl font-extrabold text-white mb-6 leading-[1.1] tracking-tight drop-shadow-lg">
              管理不仅仅是记录，更是协作的艺术。
            </h1>
            <p className="text-xl text-white/80 font-light leading-relaxed">
              沉淀每一个环节，连接每一位伙伴，方舟为您构建数字时代的敏捷资产。
            </p>
          </div>
        </div>
      </div>

      {/* 右侧表单区 */}
      <div className="flex w-full flex-col justify-center px-8 py-12 lg:w-1/2 xl:w-2/5 sm:px-16 lg:px-24 bg-background relative">
        <div className="mx-auto w-full max-w-sm">
          <div className="flex flex-col mb-12">
            <div className="lg:hidden flex items-center gap-2 mb-6">
              <div className="bg-primary p-2 rounded-xl">
                <ShieldCheck className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold tracking-tight">方舟管理</span>
            </div>
            <h2 className="text-4xl font-black tracking-tight mb-3">登录</h2>
            <p className="text-muted-foreground text-sm font-medium">
              欢迎回来。请验证您的身份以继续。
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-5">
              <div className="group">
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 ml-1 group-focus-within:text-primary transition-colors">
                  账户标识
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                    <User className="h-5 w-5 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
                  </div>
                  <input
                    type="text"
                    required
                    className="block w-full rounded-2xl border-border bg-card py-4 pl-12 pr-4 text-foreground shadow-sm ring-1 ring-inset ring-border placeholder:text-muted-foreground/40 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm transition-all outline-none"
                    placeholder="请输入用户名"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </div>

              <div className="group">
                <div className="flex items-center justify-between mb-2 ml-1">
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest group-focus-within:text-primary transition-colors">
                    安全访问凭据
                  </label>
                  <button 
                    type="button" 
                    onClick={() => setModal({ title: '重置密码', message: '出于安全考虑，系统不提供自助找回功能。请直接联系超级管理员为您重设密码。' })}
                    className="text-xs font-bold text-primary hover:underline underline-offset-4"
                  >
                    忘记了?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                    <Lock className="h-5 w-5 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
                  </div>
                  <input
                    type="password"
                    required
                    className="block w-full rounded-2xl border-border bg-card py-4 pl-12 pr-4 text-foreground shadow-sm ring-1 ring-inset ring-border placeholder:text-muted-foreground/40 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm transition-all outline-none"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center gap-3 text-destructive text-sm font-bold animate-in fade-in slide-in-from-top-1">
                <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="relative group flex w-full items-center justify-center rounded-2xl bg-primary px-6 py-4 text-sm font-bold text-primary-foreground shadow-xl shadow-primary/20 hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-70 transition-all active:scale-[0.98] overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:animate-shimmer" />
              {loading ? (
                <RotateCcw className="h-5 w-5 animate-spin" />
              ) : (
                <span className="flex items-center gap-2">
                  确认登录 <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </span>
              )}
            </button>
          </form>

          <div className="mt-12 text-center">
            <p className="text-sm text-muted-foreground">
              首次使用?{' '}
              <button 
                onClick={() => setModal({ title: '申请访问', message: '您好！由于本系统涉及内部敏感项目数据，账号需由部门负责人或超级管理员统一分配。请联系您的直属领导进行申请。' })}
                className="font-bold text-primary hover:underline underline-offset-4 transition-all"
              >
                向管理员申请访问权限
              </button>
            </p>
          </div>
        </div>

        <footer className="mt-auto pt-12 flex justify-between items-center text-[10px] uppercase tracking-widest font-bold text-muted-foreground/50">
          <span>© 2025 FANGZHOU OS</span>
          <div className="flex gap-4">
            <span className="hover:text-primary cursor-pointer transition-colors">Privacy</span>
            <span className="hover:text-primary cursor-pointer transition-colors">Terms</span>
          </div>
        </footer>

        {/* 内部模态框 */}
        {modal && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-background/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-card w-full max-w-xs rounded-3xl shadow-2xl border border-border p-6 animate-in zoom-in-95 duration-200 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
              <button 
                onClick={() => setModal(null)}
                className="absolute top-4 right-4 p-1 hover:bg-muted rounded-full transition-colors text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-primary/10 p-2 rounded-xl text-primary">
                  <Info className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-black tracking-tight">{modal.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6 font-medium">
                {modal.message}
              </p>
              <button 
                onClick={() => setModal(null)}
                className="w-full py-3 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-2xl text-xs font-bold transition-all"
              >
                返回登录
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
