import React, { useState } from 'react';
import { pb } from '../pocketbase'; // 連結你寫好的 pocketbase.ts
import { User } from '../types';

interface LoginProps {
  onLogin?: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const authData = await pb.collection('users').authWithPassword(email, password);
      const fullUser = await pb.collection('users').getOne<User>(authData.record.id);
      pb.authStore.save(authData.token, fullUser as unknown as Record<string, unknown>);
      onLogin?.(fullUser);
    } catch (error) {
      alert("登入失敗，請檢查帳號密碼");
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '100px auto', textAlign: 'center' }}>
      <h1>文化部計畫管理系統</h1>
      <form onSubmit={handleLogin}>
        <input 
          type="email" 
          placeholder="Email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          style={{ display: 'block', width: '100%', marginBottom: '10px', padding: '10px' }}
        />
        <input 
          type="password" 
          placeholder="Password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          style={{ display: 'block', width: '100%', marginBottom: '20px', padding: '10px' }}
        />
        <button type="submit" style={{ padding: '10px 20px', cursor: 'pointer' }}>登入</button>
      </form>
    </div>
  );
};

export default Login;