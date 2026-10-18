import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../services/api';
const Context = createContext();
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null),
    [loading, setLoading] = useState(true),
    [sessionError, setSessionError] = useState('');
  const retrySession = useCallback(async () => {
    setSessionError('');
    setLoading(true);
    if (!sessionStorage.getItem('nexus.token')) {
      setLoading(false);
      return;
    }
    try {
      setUser((await api.get('/auth/me')).data);
    } catch (e) {
      if (e.response?.status === 401) {
        sessionStorage.removeItem('nexus.token');
        setUser(null);
      } else
        setSessionError(
          'The server could not be reached. Your session has been retained; reconnect and try again.',
        );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const expired = () => {
      setUser(null);
      setSessionError('');
    };
    window.addEventListener('nexus:logout', expired);
    retrySession();
    return () => window.removeEventListener('nexus:logout', expired);
  }, [retrySession]);
  const login = async (values, register = false) => {
    const { data } = await api.post(register ? '/auth/register' : '/auth/login', values);
    sessionStorage.setItem('nexus.token', data.token);
    setSessionError('');
    setUser(data.user);
    return data.user;
  };
  const logout = () => {
    sessionStorage.removeItem('nexus.token');
    setSessionError('');
    setUser(null);
  };
  return (
    <Context.Provider value={{ user, setUser, loading, sessionError, retrySession, login, logout }}>
      {children}
    </Context.Provider>
  );
}
export const useAuth = () => useContext(Context);
