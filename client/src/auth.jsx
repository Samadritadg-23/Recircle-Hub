import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, clearSession, getCachedUser, getToken, setSession } from "./api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getCachedUser);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setReady(true);
      return;
    }

    api("/auth/me")
      .then((data) => {
        setUser(data.user);
        setSession(token, data.user);
      })
      .catch(() => {
        clearSession();
        setUser(null);
      })
      .finally(() => setReady(true));
  }, []);

  const value = useMemo(
    () => ({
      user,
      ready,
      async login(email, password) {
        const data = await api("/auth/login", { method: "POST", body: { email, password } });
        setSession(data.token, data.user);
        setUser(data.user);
        return data.user;
      },
      async register(payload) {
        const data = await api("/auth/register", { method: "POST", body: payload });
        setSession(data.token, data.user);
        setUser(data.user);
        return data.user;
      },
      logout() {
        clearSession();
        setUser(null);
      },
    }),
    [user, ready]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
