import React, { useState } from 'react';
import { pb } from '../pocketbase'; // 連結你寫好的 pocketbase.ts

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // 1. 執行登入
      const authData = await pb.collection('users').authWithPassword(email, password);
      
      // 2. 登入成功後，取得用戶角色 (對應你的 UserRole enum)
      const role = authData.record.role;
      console.log("登入成功，角色為:", role);

      // 3. 根據角色跳轉頁面 (這裡可以加導向邏輯)
      alert(`歡迎回來！您的身份是：${role}`);
      
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