import { useEffect, useState } from 'react';
import { SECTIONS, SECTION_LABELS, parseSections, serializeSections } from '../constants';

const EMPTY_FORM = {
  username: '',
  password: '',
  role: 'SECTION',
  sections: ['INVES'],
  isActive: true,
};

export default function UserManagement({
  users,
  isLoading,
  loadUsers,
  createUser,
  updateUser,
  deleteUser,
  currentUser,
}) {
  const [modal, setModal] = useState({ open: false, mode: 'add', user: null });
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setFormError('');
    setModal({ open: true, mode: 'add', user: null });
  };

  const openEdit = (user) => {
    setForm({
      username: user.username,
      password: '',
      role: user.role,
      sections: parseSections(user.section).length > 0 ? parseSections(user.section) : ['INVES'],
      isActive: user.isActive === 1 || user.isActive === true,
    });
    setFormError('');
    setModal({ open: true, mode: 'edit', user });
  };

  const closeModal = () => {
    setModal({ open: false, mode: 'add', user: null });
    setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setIsSaving(true);
    try {
      if (modal.mode === 'add') {
        await createUser({
          username: form.username.trim(),
          password: form.password,
          role: form.role,
          section: form.role === 'SECTION' ? serializeSections(form.sections) : null,
        });
      } else {
        const fields = {
          username: form.username.trim(),
          role: form.role,
          section: form.role === 'SECTION' ? serializeSections(form.sections) : null,
          isActive: form.isActive ? 1 : 0,
        };
        if (form.password) fields.password = form.password;
        await updateUser(modal.user.id, fields);
      }
      closeModal();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (user) => {
    try {
      await deleteUser(user.id, user.username);
    } catch {
      // toast already shown by hook
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleToggleActive = async (user) => {
    const nowActive = user.isActive === 1 || user.isActive === true;
    try {
      await updateUser(user.id, { isActive: nowActive ? 0 : 1 });
    } catch {
      // toast already shown by hook
    }
  };

  return (
    <div className="user-management">
      <div className="user-management__header">
        <h2 className="user-management__title">User Management</h2>
        <button className="user-management__add-btn" onClick={openAdd}>
          + Add User
        </button>
      </div>

      {isLoading ? (
        <p className="user-management__loading">Loading users...</p>
      ) : (
        <div className="user-management__table-wrap">
          <table className="user-management__table">
            <thead>
              <tr>
                <th>#</th>
                <th>Username</th>
                <th>Role</th>
                <th>Section</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="user-management__empty">
                    No users found
                  </td>
                </tr>
              )}
              {users.map((user, idx) => {
                const isActive = user.isActive === 1 || user.isActive === true;
                const isSelf = user.username === currentUser?.username;
                return (
                  <tr
                    key={user.id}
                    className={
                      !isActive ? 'user-management__row user-management__row--inactive' : 'user-management__row'
                    }
                  >
                    <td className="user-management__cell-num">{idx + 1}</td>
                    <td>
                      <strong>{user.username}</strong>
                      {isSelf && <span className="user-management__you"> (you)</span>}
                    </td>
                    <td>
                      <span className={`user-management__role user-management__role--${user.role.toLowerCase()}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>{user.section
                      ? parseSections(user.section).map(s => SECTION_LABELS[s] || s).join(', ')
                      : <span style={{ color: '#aaa' }}>N/A</span>}</td>
                    <td>
                      <span className={`user-management__status user-management__status--${isActive ? 'active' : 'inactive'}`}>
                        {isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="user-management__actions">
                      <button className="um-btn um-btn--edit" onClick={() => openEdit(user)}>
                        Edit
                      </button>
                      {!isSelf && (
                        <button
                          className={`um-btn ${isActive ? 'um-btn--deactivate' : 'um-btn--activate'}`}
                          onClick={() => handleToggleActive(user)}
                        >
                          {isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                      {!isSelf && (
                        <button
                          className="um-btn um-btn--delete"
                          onClick={() => setDeleteConfirm(user)}
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* â”€â”€ Add / Edit Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {modal.open && (
        <div className="modal">
          <div className="modal__card user-management__modal-card">
            <div className="user-management__modal-head">
              <h3>{modal.mode === 'add' ? 'Add New User' : 'Edit User'}</h3>
              <button
                type="button"
                className="user-management__modal-close"
                onClick={closeModal}
                aria-label="Close"
              >
                &#x2715;
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              {formError && <div className="form-panel__error">{formError}</div>}

              <div className="modal__grid">
                <label>
                  Username
                  <input
                    type="text"
                    value={form.username}
                    onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                    required
                    autoComplete="off"
                  />
                </label>

                <label>
                  Password
                  {modal.mode === 'edit' && (
                    <span className="user-management__hint"> (blank = keep current)</span>
                  )}
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    required={modal.mode === 'add'}
                    autoComplete="new-password"
                  />
                </label>

                <label>
                  Role
                  <select
                    value={form.role}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        role: e.target.value,
                        sections: (e.target.value === 'MC' || e.target.value === 'VIEWER') ? [] : (f.sections?.length ? f.sections : ['INVES']),
                      }))
                    }
                  >
                    <option value="MC">MC (Master Control)</option>
                    <option value="SECTION">SECTION</option>
                    <option value="VIEWER">VIEWER (Read-only)</option>
                  </select>
                </label>

                {form.role === 'SECTION' && form.role !== 'VIEWER' && (
                  <label>
                    Section(s)
                    <div className="user-management__section-checks">
                      {SECTIONS.map((s) => (
                        <label key={s} className="user-management__section-check-label">
                          <input
                            type="checkbox"
                            checked={form.sections.includes(s)}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? [...form.sections, s]
                                : form.sections.filter((x) => x !== s);
                              if (next.length > 0) setForm((f) => ({ ...f, sections: next }));
                            }}
                          />
                          {SECTION_LABELS[s]}
                        </label>
                      ))}
                    </div>
                  </label>
                )}

                {modal.mode === 'edit' && (
                  <label className="user-management__checkbox-label">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                      disabled={modal.user?.username === currentUser?.username}
                    />
                    Active account
                  </label>
                )}
              </div>

              <div className="modal__actions modal__actions--spread">
                <div />
                <div className="modal__actions">
                  <button type="button" className="secondary" onClick={closeModal}>
                    Cancel
                  </button>
                  <button type="submit" disabled={isSaving}>
                    {isSaving
                      ? 'Saving...'
                      : modal.mode === 'add'
                      ? 'Create User'
                      : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* â”€â”€ Delete Confirmation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {deleteConfirm && (
        <div className="modal">
          <div className="modal__card">
            <h3>Confirm Delete</h3>
            <p>
              Permanently remove <strong>{deleteConfirm.username}</strong>?{' '}
              This action cannot be undone.
            </p>
            <div className="modal__actions modal__actions--spread">
              <div />
              <div className="modal__actions">
                <button type="button" className="secondary" onClick={() => setDeleteConfirm(null)}>
                  Cancel
                </button>
                <button type="button" className="danger" onClick={() => handleDelete(deleteConfirm)}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
