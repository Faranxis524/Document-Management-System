import { useState, useEffect, useRef } from 'react';
import { API_BASE, DEFAULT_FROM, RECEIVED_BY, SECTION_LABELS } from '../constants';

/** Parse the exp claim from a JWT without a library */
function getTokenExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ? payload.exp * 1000 : null; // convert to ms
  } catch {
    return null;
  }
}

export function useAuth() {
  const [authToken, setAuthToken] = useState('');
  const [username, setUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [apiError, setApiError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null); // populated from server after login
  const refreshTimerRef = useRef(null);

  const isMc = currentUser?.role === 'MC';

  // Schedule auto-refresh 5 minutes before the token expires
  useEffect(() => {
    if (!authToken) return;
    clearTimeout(refreshTimerRef.current);
    const expiry = getTokenExpiry(authToken);
    if (!expiry) return;
    const msUntilExpiry = expiry - Date.now();
    const refreshAt = msUntilExpiry - 5 * 60 * 1000; // 5 min before expiry
    if (refreshAt <= 0) return; // already too close to expiry, skip
    refreshTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.token) setAuthToken(data.token);
        }
      } catch {
        // silent — user will see a 401 on next API call if this fails
      }
    }, refreshAt);
    // eslint-disable-next-line consistent-return
    return () => clearTimeout(refreshTimerRef.current);
  }, [authToken]);

  /**
   * Login — done before a token exists so this calls fetch directly.
   * onSuccess(token, user) is called on success so callers can react.
   */
  const login = async (onSuccess) => {
    const trimmedUsername = username.trim();
    if (!trimmedUsername || !loginPassword) {
      setApiError('Username and password are required');
      return;
    }

    setApiError('');
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmedUsername, password: loginPassword }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Login failed');

      const loggedUser = data.user; // { username, role, section }
      setAuthToken(data.token);
      setCurrentUser(loggedUser);

      // Pre-fill section context for SECTION role users
      const sectionDefaults =
        loggedUser.role === 'SECTION' && loggedUser.section
          ? {
              section: loggedUser.section,
              activeSection: SECTION_LABELS[loggedUser.section],
              fromValue: DEFAULT_FROM[loggedUser.section],
              concernedUnits: DEFAULT_FROM[loggedUser.section],
              receivedBy: RECEIVED_BY[loggedUser.section]?.[0] || '',
            }
          : {};

      onSuccess && onSuccess(data.token, loggedUser, sectionDefaults);
    } catch (error) {
      setApiError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    clearTimeout(refreshTimerRef.current);
    setAuthToken('');
    setCurrentUser(null);
    setUsername('');
    setApiError('');
  };

  return {
    authToken,
    username,
    setUsername,
    loginPassword,
    setLoginPassword,
    apiError,
    setApiError,
    isLoading,
    currentUser,
    isMc,
    login,
    logout,
  };
}
