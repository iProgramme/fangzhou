import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { fetchUsers } from '../services/api';

interface LoginProps {
  onLogin: (username: string, department?: string, role?: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [dynamicUsers, setDynamicUsers] = useState<User[]>([]);

  useEffect(() => {
    const loadUsers = async () => {
        try {
            const u = await fetchUsers();
            setDynamicUsers(u);
        } catch (e) {
            console.error('Failed to load users for login');
        }
    };
    loadUsers();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 1. Check for hardcoded admin first (for safety)
    if (username === 'admin' && password === 'admin') {
        onLogin(username, undefined, 'admin');
        return;
    }

    // 2. Search in dynamic users list
    const user = dynamicUsers.find(u => u.name === username && u.status === 'active');

    if (user) {
        // Check password (default to '123' if not set)
        const userPassword = user.password || '123';
        if (password === userPassword) {
            onLogin(user.name, user.department, user.role);
        } else {
            setError('密码错误');
        }
    } else {
      setError('用户不存在或已被禁用');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-10 shadow-xl border border-gray-200">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            登录到项目管理系统
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="-space-y-px rounded-md shadow-sm">
            <div>
              <label htmlFor="username" className="sr-only">
                用户名
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                className="relative block w-full appearance-none rounded-none rounded-t-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                placeholder="用户名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                密码
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="relative block w-full appearance-none rounded-none rounded-b-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                placeholder="密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-center text-sm text-red-600">{error}</p>}

          <div>
            <button
              type="submit"
              className="group relative flex w-full justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              登录
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
