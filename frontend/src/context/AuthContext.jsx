import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  ADMIN_LOGIN_HINT,
  ADMIN_PHONE,
} from "../admin/constants.js";
import {
  normalizePhone,
  validateFullName,
  validateNewPassword,
  validateSignupPhone,
} from "../lib/formValidation.js";

const SESSION_KEY = "fateh-session";
const USERS_KEY = "fateh-users";

/** Older sessions stored email; map known accounts to the current phone login. */
const LEGACY_EMAIL_TO_PHONE = {
  [ADMIN_EMAIL.toLowerCase()]: normalizePhone(ADMIN_PHONE),
  "demo@fateh.education": "9876543210",
  "new@fateh.education": "9123456789",
};

/** Same login as students; `role: "admin"` unlocks `/admin/*`. Keeps `email` for API helpers only. */
const ADMIN_SEED_USER = {
  id: "seed-admin",
  sessionId: "session-admin-user",
  email: ADMIN_EMAIL,
  phone: normalizePhone(ADMIN_PHONE),
  password: ADMIN_PASSWORD,
  name: "PS Console Admin",
  role: "admin",
  preliminaryCallDone: true,
};

export const DEMO_ACCOUNTS_HINT =
  `9876543210 / demo12345 · 9123456789 / newuser123 · Admin: ${ADMIN_LOGIN_HINT}`;

const SEED_USERS = [
  {
    id: "seed-demo",
    sessionId: "session-demo-user",
    phone: "9876543210",
    password: "demo12345",
    name: "Aanya Sharma",
    preliminaryCallDone: true,
    profile: {
      country: "uk",
      studyLevel: "Masters",
      budget: "flexible",
      interests: ["Computer Science", "Data Science"],
      workExperience: 2,
      targetCities: ["London", "Manchester"],
      scholarship: true,
    },
  },
  {
    id: "seed-new",
    sessionId: "session-new-user",
    phone: "9123456789",
    password: "newuser123",
    name: "Vikram Singh",
    preliminaryCallDone: false,
    profile: {
      country: null,
      studyLevel: null,
      budget: null,
      interests: [],
      workExperience: 0,
      targetCities: [],
      scholarship: false,
    },
  },
];

function readCustomUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((u) => u && normalizePhone(u.phone));
  } catch {
    return [];
  }
}

function writeCustomUsers(list) {
  localStorage.setItem(USERS_KEY, JSON.stringify(list));
}

function allUsers() {
  const custom = readCustomUsers();
  const merged = [];
  const seenPhone = new Set();

  const push = (u) => {
    if (!u) return;
    const ph = normalizePhone(u.phone);
    if (!ph || seenPhone.has(ph)) return;
    seenPhone.add(ph);
    merged.push({ ...u, phone: ph });
  };

  push(ADMIN_SEED_USER);
  for (const u of SEED_USERS) push(u);
  for (const u of custom) push(u);
  return merged;
}

function stripUser(u) {
  if (!u) return null;
  const { password: _p, ...safe } = u;
  return safe;
}

function readSessionPhone() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (typeof o.phone === "string" && normalizePhone(o.phone)) {
      return normalizePhone(o.phone);
    }
    if (typeof o.email === "string" && o.email) {
      const em = o.email.toLowerCase();
      const fromLegacy = LEGACY_EMAIL_TO_PHONE[em];
      if (fromLegacy) {
        writeSession(fromLegacy);
        return normalizePhone(fromLegacy);
      }
      const u = allUsers().find(
        (x) => x.email && x.email.toLowerCase() === em,
      );
      if (u?.phone) {
        const p = normalizePhone(u.phone);
        writeSession(p);
        return p;
      }
    }
    return null;
  } catch {
    return null;
  }
}

function writeSession(phone) {
  if (!phone) localStorage.removeItem(SESSION_KEY);
  else
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ phone: normalizePhone(phone) }),
    );
}

function resolveSessionUser() {
  const phone = readSessionPhone();
  if (!phone) return null;
  const user = allUsers().find((u) => normalizePhone(u.phone) === phone);
  return stripUser(user);
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => resolveSessionUser());

  const login = useCallback((phoneDigits, password) => {
    const normalized = normalizePhone(phoneDigits);
    const found = allUsers().find(
      (u) => normalizePhone(u.phone) === normalized && u.password === password,
    );
    if (!found) return { ok: false, error: "Invalid mobile number or password." };
    writeSession(found.phone);
    const safe = stripUser(found);
    if (!safe.sessionId) {
      safe.sessionId = `session-${crypto.randomUUID()}`;
    }
    setUser(safe);
    return { ok: true, user: safe };
  }, []);

  const signup = useCallback((name, phone, password) => {
    const nameRes = validateFullName(name);
    if (!nameRes.ok) return { ok: false, error: nameRes.error };
    const phoneRes = validateSignupPhone(phone);
    if (!phoneRes.ok) return { ok: false, error: phoneRes.error };
    const passRes = validateNewPassword(password);
    if (!passRes.ok) return { ok: false, error: passRes.error };
    const ph = phoneRes.value;
    if (allUsers().some((u) => normalizePhone(u.phone) === ph)) {
      return {
        ok: false,
        error: "An account with this mobile number already exists.",
      };
    }
    const record = {
      id: `u-${crypto.randomUUID()}`,
      sessionId: `session-${crypto.randomUUID()}`,
      phone: ph,
      password,
      name: nameRes.value,
      preliminaryCallDone: false,
      profile: {
        country: null,
        studyLevel: null,
        budget: null,
        interests: [],
        workExperience: 0,
        targetCities: [],
        scholarship: false,
      },
    };
    const custom = readCustomUsers();
    writeCustomUsers([...custom, record]);
    writeSession(record.phone);
    const safe = stripUser(record);
    setUser(safe);
    return { ok: true, user: safe };
  }, []);

  const logout = useCallback(() => {
    writeSession(null);
    setUser(null);
  }, []);

  const matchStoredUser = useCallback(
    (u) => normalizePhone(u.phone) === normalizePhone(user?.phone),
    [user?.phone],
  );

  const updateUserProfile = useCallback(
    (profileData) => {
      if (!user) return { ok: false, error: "No user logged in" };
      const updated = { ...user, profile: { ...user.profile, ...profileData } };
      const custom = readCustomUsers();
      const seedUser = SEED_USERS.find(matchStoredUser);
      if (seedUser) {
        setUser(updated);
      } else {
        const idx = custom.findIndex(matchStoredUser);
        if (idx >= 0) {
          custom[idx] = { ...custom[idx], profile: updated.profile };
          writeCustomUsers(custom);
        }
        setUser(updated);
      }
      return { ok: true };
    },
    [user, matchStoredUser],
  );

  const markCallAsDone = useCallback(
    (callData = {}) => {
      if (!user) return { ok: false, error: "No user logged in" };
      const updated = {
        ...user,
        preliminaryCallDone: true,
        profile: { ...user.profile, ...callData },
        lastCallDate: new Date().toISOString(),
      };
      const custom = readCustomUsers();
      const seedUser = SEED_USERS.find(matchStoredUser);
      if (seedUser) {
        setUser(updated);
      } else {
        const idx = custom.findIndex(matchStoredUser);
        if (idx >= 0) {
          custom[idx] = {
            ...custom[idx],
            preliminaryCallDone: true,
            profile: updated.profile,
            lastCallDate: updated.lastCallDate,
          };
          writeCustomUsers(custom);
        }
        setUser(updated);
      }
      return { ok: true };
    },
    [user, matchStoredUser],
  );

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      login,
      signup,
      logout,
      updateUserProfile,
      markCallAsDone,
    }),
    [user, login, signup, logout, updateUserProfile, markCallAsDone],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- hook colocated with AuthProvider
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
