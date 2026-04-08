// src/hooks/useBasePath.js
// Use this hook in any shared page component to get the correct base path
// so navigation works for both admin AND faculty without hardcoding /admin/...

import { useLocation } from 'react-router-dom';

const useBasePath = () => {
  const location = useLocation();
  
  if (location.pathname.startsWith('/faculty')) return '/faculty';
  if (location.pathname.startsWith('/admin')) return '/admin';
  
  // fallback - check stored user role
  try {
    const userStr = sessionStorage.getItem('user') || localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.role === 'faculty' || user.role === 'instructor') return '/faculty';
    }
  } catch {}
  
  return '/admin';
};

export default useBasePath;