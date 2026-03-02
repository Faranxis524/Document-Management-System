import { useState, useCallback } from 'react';
import { API_BASE } from '../constants';
import { makeApiFetch } from '../utils';

export function useUsers({ authToken, showToast }) {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadUsers = useCallback(async () => {
    if (!authToken) return;
    setIsLoading(true);
    try {
      const apiFetch = makeApiFetch(authToken);
      const data = await apiFetch(`${API_BASE}/users`);
      setUsers(data.users || []);
    } catch (err) {
      showToast('error', 'Error', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [authToken, showToast]);

  const createUser = useCallback(
    async ({ username, password, role, section }) => {
      const apiFetch = makeApiFetch(authToken);
      const data = await apiFetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role, section }),
      });
      setUsers((prev) =>
        [...prev, data.user].sort((a, b) => a.username.localeCompare(b.username))
      );
      showToast('success', 'User Created', `${username} has been created`);
      return data.user;
    },
    [authToken, showToast]
  );

  const updateUser = useCallback(
    async (id, fields) => {
      const apiFetch = makeApiFetch(authToken);
      const data = await apiFetch(`${API_BASE}/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...data.user } : u)));
      showToast('success', 'User Updated', 'Changes saved');
      return data.user;
    },
    [authToken, showToast]
  );

  const deleteUser = useCallback(
    async (id, username) => {
      const apiFetch = makeApiFetch(authToken);
      await apiFetch(`${API_BASE}/users/${id}`, { method: 'DELETE' });
      setUsers((prev) => prev.filter((u) => u.id !== id));
      showToast('success', 'User Deleted', `${username} has been removed`);
    },
    [authToken, showToast]
  );

  return { users, isLoading, loadUsers, createUser, updateUser, deleteUser };
}
