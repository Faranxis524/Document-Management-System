import { useState } from 'react';

export default function ExportSignatoriesModal({
  isOpen,
  onClose,
  onSubmit,
}) {
  const [form, setForm] = useState({
    adminPnco: '',
    chiefAdmin: '',
    regionalChief: '',
  });

  if (!isOpen) return null;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(form);
  };

  return (
    <div className="modal export-signatories-modal" onClick={onClose}>
      <div
        className="modal__card export-signatories-modal__card"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Export PDF signatories"
      >
        <h3>Export PDF — Signatories</h3>

        <form onSubmit={handleSubmit}>
          <div className="export-signatories-modal__grid">
            <label>
              Admin PNCO
              <input
                type="text"
                name="adminPnco"
                value={form.adminPnco}
                onChange={handleChange}
                required
                autoFocus
              />
            </label>

            <label>
              Chief, Admin Section
              <input
                type="text"
                name="chiefAdmin"
                value={form.chiefAdmin}
                onChange={handleChange}
                required
              />
            </label>

            <label>
              Regional Chief
              <input
                type="text"
                name="regionalChief"
                value={form.regionalChief}
                onChange={handleChange}
                required
              />
            </label>
          </div>

          <div className="modal__actions modal__actions--spread export-signatories-modal__actions">
            <button type="button" className="secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit">Export PDF</button>
          </div>
        </form>
      </div>
    </div>
  );
}
