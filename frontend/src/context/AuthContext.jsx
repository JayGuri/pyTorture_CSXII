import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_LOGIN_HINT } from "../admin/constants.js";
import { validateEmail, validateFullName, validateNewPassword } from "../lib/formValidation.js";

const SESSION_KEY = "fateh-session";
const USERS_KEY = "fateh-users";

/** Same login as students; `role: "admin"` unlocks `/admin/*`. */
const ADMIN_SEED_USER = {
  id: "seed-admin",
  email: ADMIN_EMAIL,
  password: ADMIN_PASSWORD,
  name: "PS Console Admin",
  role: "admin",
  preliminaryCallDone: true,
};

export const DEMO_ACCOUNTS_HINT =
  `demo@fateh.education / demo12345 · new@fateh.education / newuser123 · PS admin: ${ADMIN_LOGIN_HINT}`;

const SEED_USERS = [
  {
    id: "seed-demo",
    email: "demo@fateh.education",
    password: "demo12345",
    name: "Aanya Sharma",
    preliminaryCallDone: true,
  },
  {
    id: "seed-new",
    email: "new@fateh.education",
    password: "newuser123",
    name: "Vikram Singh",
    preliminaryCallDone: false,
  },
];

function readCustomUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCustomUsers(list) {
  localStorage.setItem(USERS_KEY, JSON.stringify(list));
}

function allUsers() {
  const custom = readCustomUsers();
  const seen = new Set([ADMIN_SEED_USER.email.toLowerCase(), ...SEED_USERS.map((u) => u.email.toLowerCase())]);
  const merged = [ADMIN_SEED_USER, ...SEED_USERS];
  for (const u of custom) {
    if (!u?.email || seen.has(String(u.email).toLowerCase())) continue;
    merged.push(u);
    seen.add(String(u.email).toLowerCase());
  }
  return merged;
}

function stripUser(u) {
  if (!u) return null;
  const { password: _p, ...safe } = u;
  return safe;
}

function readSessionEmail() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const { email } = JSON.parse(raw);
    return typeof email === "string" ? email : null;
  } catch {
    return null;
  }
}

function writeSession(email) {
  if (!email) localStorage.removeItem(SESSION_KEY);
  else localStorage.setItem(SESSION_KEY, JSON.stringify({ email }));
}

function resolveSessionUser() {
  const email = readSessionEmail();
  if (!email) return null;
  const user = allUsers().find((u) => u.email.toLowerCase() === email.toLowerCase());
  return stripUser(user);
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => resolveSessionUser());

  const login = useCallback((email, password) => {
    const normalized = String(email).trim().toLowerCase();
    const found = allUsers().find(
      (u) => u.email.toLowerCase() === normalized && u.password === password,
    );
    if (!found) return { ok: false, error: "Invalid email or password." };
    writeSession(found.email);
    const safe = stripUser(found);
    setUser(safe);
    return { ok: true, user: safe };
  }, []);

  const signup = useCallback((name, email, password) => {
    const nameRes = validateFullName(name);
    if (!nameRes.ok) return { ok: false, error: nameRes.error };
    const emailRes = validateEmail(email);
    if (!emailRes.ok) return { ok: false, error: emailRes.error };
    const passRes = validateNewPassword(password);
    if (!passRes.ok) return { ok: false, error: passRes.error };
    const normalized = emailRes.value;
    if (allUsers().some((u) => u.email.toLowerCase() === normalized)) {
      return { ok: false, error: "An account with this email already exists." };
    }
    const record = {
      id: `u-${crypto.randomUUID()}`,
      email: normalized,
      password,
      name: nameRes.value,
      preliminaryCallDone: false,
    };
    const custom = readCustomUsers();
    writeCustomUsers([...custom, record]);
    writeSession(record.email);
    const safe = stripUser(record);
    setUser(safe);
    return { ok: true, user: safe };
  }, []);

  const logout = useCallback(() => {
    writeSession(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      login,
      signup,
      logout,
    }),
    [user, login, signup, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- hook colocated with AuthProvider
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
