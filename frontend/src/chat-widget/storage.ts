export type StoredSession = {
  sessionId: string;
  visitorId: string;
  visitorName?: string;
  visitorEmail?: string;
};

export function createSessionStore(storageKey: string) {
  return {
    save(session: StoredSession | null) {
      try {
        if (session) localStorage.setItem(storageKey, JSON.stringify(session));
        else localStorage.removeItem(storageKey);
      } catch {
        /* private browsing */
      }
    },
    load(): StoredSession | null {
      try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as StoredSession;
        if (!parsed.sessionId || !parsed.visitorId) return null;
        return parsed;
      } catch {
        return null;
      }
    },
  };
}
