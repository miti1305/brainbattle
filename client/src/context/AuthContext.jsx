// Keeps the logged-in user available everywhere: const { user, login, logout } = useAuth();
import { createContext, useContext, useEffect, useState } from 'react';
import { fetchMe, loginUser, registerUser } from '../api/authApi';
import { disconnectSocket } from '../socket/socket';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem('bb_token')) {
      setLoading(false);
      return;
    }
    fetchMe()
      .then((data) => setUser(data.user))
      .catch(() => localStorage.removeItem('bb_token'))
      .finally(() => setLoading(false));
  }, []);

  const saveSession = ({ token, user: u }) => {
    localStorage.setItem('bb_token', token);
    setUser(u);
  };

  const login = async (email, password) => saveSession(await loginUser({ email, password }));
  const register = async (username, email, password) => saveSession(await registerUser({ username, email, password }));

  const logout = () => {
    localStorage.removeItem('bb_token');
    disconnectSocket();
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
