import { useMemo, useState } from 'react';
import { SECTIONS } from '../constants';
import { getRecordFileHref } from '../utils';

export default function EditModal({
  isMc,
  editModal, setEditModal,
  editForm,
  editBaseline, setEditBaseline,
  editFormErrors, setEditFormErrors,
  editFormErrorMessage, setEditFormErrorMessage,
  handleEditFieldChange,
  handleUpdateRecord,
  handleDeleteRecord,
  handleRemoveFile,
  isSaving,
  authToken,
}) {
  const getEditFieldClass = (field) => (editFormErrors[field] ? 'input--error' : '');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const editRemarksText = useMemo(() => {
    const parts = [];
    if (editForm.remarksEmail) parts.push('email');
    if (editForm.remarksViber) parts.push('viber');
    if (editForm.remarksHardCopy) parts.push('hardcopy');
    return parts.length ? `sent through ${parts.join('/ ')}` : '';
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editForm.remarksEmail, editForm.remarksViber, editForm.remarksHardCopy]);

  const isEditDirty = useMemo(() => {
    if (editForm.subjectFile) return true;
    if (!editBaseline) return false;
    const norm = (v) => (v == null ? '' : String(v));
    const fields = ['section', 'dateReceived', 'subjectText', 'fromValue', 'targetDate',
      'receivedBy', 'actionTaken', 'concernedUnits', 'dateSent', 'subjectFileUrl'];
    return (
      fields.some((f) => norm(editForm[f]) !== norm(editBaseline[f])) ||
      Boolean(editForm.remarksEmail) !== Boolean(editBaseline.remarksEmail) ||
      Boolean(editForm.remarksViber) !== Boolean(editBaseline.remarksViber) ||
      Boolean(editForm.remarksHardCopy) !== Boolean(editBaseline.remarksHardCopy)
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editForm, editBaseline]);

  // Hooks must all be called before any conditional returns
  if (!editModal.open) return null;

  const closeModal = () => {
    setEditModal({ open: false, recordId: null });
    setEditBaseline(null);
    setEditFormErrors({});
    setEditFormErrorMessage('');
    setConfirmDelete(false);
  };

  return (
    <div className="modal">
      <div className="modal__card modal__card--wide">
        <h3>
          Edit Record
          {editForm.version && <span className="version-badge">v{editForm.version}</span>}
        </h3>

        {editFormErrorMessage && (
          <div className="form-panel__error modal__error">{editFormErrorMessage}</div>
        )}

        <div className="modal__grid">
          <label>
            MC Ctrl No.
            <input value={editForm.mcCtrlNo} readOnly />
          </label>

          <label>
            Section Ctrl No.
            <input value={editForm.sectionCtrlNo} readOnly />
          </label>

          <label>
            Section
            <select
              value={editForm.section}
              disabled={!isMc}
              className={getEditFieldClass('section')}
              onChange={(e) => handleEditFieldChange('section', e.target.value)}
            >
              {SECTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>

          <label>
            Date Received
            <input
              type="date"
              value={editForm.dateReceived}
              className={getEditFieldClass('dateReceived')}
              onChange={(e) => handleEditFieldChange('dateReceived', e.target.value)}
            />
          </label>

          <label className="modal__span">
            Subject
            <input
              type="text"
              value={editForm.subjectText}
              className={getEditFieldClass('subjectText')}
              onChange={(e) => handleEditFieldChange('subjectText', e.target.value)}
            />
          </label>

          <label className="modal__span">
            Replace Uploaded Document (PDF/DOCX)
            <input
              type="file"
              accept=".pdf,.docx"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                const ext = file ? file.name.toLowerCase().slice(file.name.lastIndexOf('.')) : '';
                if (file && !['.pdf', '.docx'].includes(ext)) {
                  setEditFormErrorMessage('Please upload a PDF or DOCX file.');
                  return;
                }
                setEditFormErrorMessage('');
                handleEditFieldChange('subjectFile', file);
              }}
            />
            {editForm.subjectFileUrl && (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '8px' }}>
                <a
                  className="table__link"
                  href={getRecordFileHref(editForm.id, editForm.subjectFileUrl, authToken)}
                  target="_blank"
                  rel="noreferrer"
                >
                  View current uploaded file
                </a>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  disabled={isSaving}
                  style={{
                    padding: '4px 12px', fontSize: '12px',
                    backgroundColor: '#e74c3c', color: 'white',
                    border: 'none', borderRadius: '6px', cursor: 'pointer',
                  }}
                >
                  Remove File
                </button>
              </div>
            )}
          </label>

          <label>
            From
            <input
              type="text"
              value={editForm.fromValue}
              className={getEditFieldClass('fromValue')}
              onChange={(e) => handleEditFieldChange('fromValue', e.target.value)}
            />
          </label>

          <label>
            Target Date
            <input
              type="date"
              value={editForm.targetDate}
              className={getEditFieldClass('targetDate')}
              onChange={(e) => handleEditFieldChange('targetDate', e.target.value)}
            />
          </label>

          <label>
            Received By
            <input
              type="text"
              value={editForm.receivedBy}
              className={getEditFieldClass('receivedBy')}
              onChange={(e) => handleEditFieldChange('receivedBy', e.target.value)}
            />
          </label>

          <label>
            Action Taken
            <select
              value={editForm.actionTaken}
              onChange={(e) => handleEditFieldChange('actionTaken', e.target.value)}
            >
              <option value="DRAFTED">Drafted</option>
              <option value="DISSEMINATED">Disseminated</option>
              <option value="FILED">Filed</option>
            </select>
          </label>

          <div className="modal__span form-panel__checkboxes form-panel__checkboxes--modal">
            <span>Remarks (Sent Through)</span>
            {[
              { key: 'remarksEmail', label: 'Email' },
              { key: 'remarksViber', label: 'Viber' },
              { key: 'remarksHardCopy', label: 'Hard Copy' },
            ].map(({ key, label }) => (
              <label key={key}>
                <input
                  type="checkbox"
                  checked={Boolean(editForm[key])}
                  onChange={(e) => handleEditFieldChange(key, e.target.checked)}
                />
                {label}
              </label>
            ))}
            <div className="form-panel__remarks">Output: {editRemarksText || '-'}</div>
          </div>

          <label>
            Concerned Units
            <input
              type="text"
              value={editForm.concernedUnits}
              className={getEditFieldClass('concernedUnits')}
              onChange={(e) => handleEditFieldChange('concernedUnits', e.target.value)}
            />
          </label>

          <label>
            Date Sent
            <input
              type="date"
              value={editForm.dateSent}
              onChange={(e) => handleEditFieldChange('dateSent', e.target.value)}
            />
          </label>
        </div>

        <div className="modal__actions modal__actions--spread">
          <div style={{ display: 'flex', gap: '10px' }}>
            {!confirmDelete ? (
              <button
                type="button"
                className="danger"
                onClick={() => setConfirmDelete(true)}
                disabled={isSaving}
              >
                Delete
              </button>
            ) : (
              <div className="delete-confirm">
                <span className="delete-confirm__label">Delete this record?</span>
                <button
                  type="button"
                  className="danger"
                  onClick={() => { setConfirmDelete(false); handleDeleteRecord(); }}
                  disabled={isSaving}
                >
                  {isSaving ? 'Deleting...' : 'Yes, Delete'}
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setConfirmDelete(false)}
                  disabled={isSaving}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
          <div className="modal__actions">
            <button type="button" className="secondary" onClick={closeModal}>
              Cancel
            </button>
            <button
              type="button"
              onClick={handleUpdateRecord}
              disabled={isSaving || !isEditDirty}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
