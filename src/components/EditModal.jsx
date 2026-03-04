import { useMemo, useState } from 'react';
import { SECTIONS, SECTION_LABELS, RECEIVED_BY, getFromOptions } from '../constants';
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

  const fromOpts = getFromOptions(editForm.section);

  const editRemarksText = useMemo(() => {
    if (editForm.remarksCustom) return editForm.remarksCustomText || '';
    const parts = [];
    if (editForm.remarksEmail) parts.push('email');
    if (editForm.remarksViber) parts.push('viber');
    if (editForm.remarksHardCopy) parts.push('hardcopy');
    return parts.length ? `sent through ${parts.join('/ ')}` : '';
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editForm.remarksEmail, editForm.remarksViber, editForm.remarksHardCopy, editForm.remarksCustom, editForm.remarksCustomText]);

  const isEditDirty = useMemo(() => {
    if (editForm.subjectFile) return true;
    if (!editBaseline) return false;
    const norm = (v) => (v == null ? '' : String(v));
    const fields = ['section', 'dateReceived', 'subjectText', 'fromValue', 'fromCustom',
      'targetDate', 'targetDateMode', 'receivedBy', 'receivedByCustom',
      'actionTaken', 'actionTakenCustom', 'concernedUnits', 'concernedUnitsCustom',
      'dateSent', 'dateSentMode', 'subjectFileUrl'];
    return (
      fields.some((f) => norm(editForm[f]) !== norm(editBaseline[f])) ||
      Boolean(editForm.remarksEmail) !== Boolean(editBaseline.remarksEmail) ||
      Boolean(editForm.remarksViber) !== Boolean(editBaseline.remarksViber) ||
      Boolean(editForm.remarksHardCopy) !== Boolean(editBaseline.remarksHardCopy) ||
      Boolean(editForm.remarksCustom) !== Boolean(editBaseline.remarksCustom) ||
      norm(editForm.remarksCustomText) !== norm(editBaseline.remarksCustomText)
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editForm, editBaseline]);

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

        {/* ── Group 1: Document Info ───────────────────── */}
        <div className="form-section">
          <div className="form-section__title">Document Info</div>
          <div className="modal__grid">
            <label>
              MC Ctrl No.
              <input value={editForm.mcCtrlNo || ''} readOnly />
            </label>
            <label>
              Section Ctrl No.
              <input value={editForm.sectionCtrlNo || ''} readOnly />
            </label>

            <label>
              Section
              <select value={editForm.section} disabled>
                {SECTIONS.map((s) => (
                  <option key={s} value={s}>{SECTION_LABELS[s] ? `${s} — ${SECTION_LABELS[s]}` : s}</option>
                ))}
              </select>
            </label>

            <label>
              Date Received
              <input
                type="date"
                value={editForm.dateReceived || ''}
                className={getEditFieldClass('dateReceived')}
                onChange={(e) => handleEditFieldChange('dateReceived', e.target.value)}
              />
            </label>

            <label className="modal__span">
              Subject
              <input
                type="text"
                value={editForm.subjectText || ''}
                className={getEditFieldClass('subjectText')}
                maxLength={500}
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
          </div>
        </div>

        {/* ── Group 2: Routing ─────────────────────────── */}
        <div className="form-section">
          <div className="form-section__title">Routing</div>
          <div className="modal__grid">
            <label>
              From
              <select
                value={editForm.fromValue || ''}
                className={getEditFieldClass('fromValue')}
                onChange={(e) => handleEditFieldChange('fromValue', e.target.value)}
              >
                {fromOpts.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </label>

            <label>
              Target Date Mode
              <select
                value={editForm.targetDateMode || 'DATE'}
                onChange={(e) => handleEditFieldChange('targetDateMode', e.target.value)}
              >
                <option value="DATE">Date Picker</option>
                <option value="TEXT">User Input</option>
              </select>
            </label>

            {editForm.fromValue === 'User Input' && (
              <label className="modal__span">
                From (Custom)
                <input
                  type="text"
                  placeholder="Enter custom from"
                  value={editForm.fromCustom || ''}
                  onChange={(e) => handleEditFieldChange('fromCustom', e.target.value)}
                />
              </label>
            )}

            <label>
              Target Date
              <input
                type={(editForm.targetDateMode || 'DATE') === 'DATE' ? 'date' : 'text'}
                placeholder={(editForm.targetDateMode || 'DATE') === 'DATE' ? '' : 'Enter target date'}
                value={editForm.targetDate || ''}
                className={getEditFieldClass('targetDate')}
                onChange={(e) => handleEditFieldChange('targetDate', e.target.value)}
              />
            </label>

            <label>
              Received By
              <select
                value={editForm.receivedBy || ''}
                className={getEditFieldClass('receivedBy')}
                onChange={(e) => handleEditFieldChange('receivedBy', e.target.value)}
              >
                {(RECEIVED_BY[editForm.section] || []).map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
                <option value="User Input">User Input</option>
              </select>
            </label>

            {editForm.receivedBy === 'User Input' && (
              <label className="modal__span">
                Received By (Custom)
                <input
                  type="text"
                  placeholder="Enter name"
                  value={editForm.receivedByCustom || ''}
                  onChange={(e) => handleEditFieldChange('receivedByCustom', e.target.value)}
                />
              </label>
            )}
          </div>
        </div>

        {/* ── Group 3: Disposition ─────────────────────── */}
        <div className="form-section">
          <div className="form-section__title">Disposition</div>
          <div className="modal__grid">
            <label>
              Action Taken
              <select
                value={editForm.actionTaken || ''}
                onChange={(e) => handleEditFieldChange('actionTaken', e.target.value)}
              >
                <option value="DRAFTED">Drafted</option>
                <option value="DISSEMINATED">Disseminated</option>
                <option value="FILED">Filed</option>
                <option value="User Input">User Input</option>
              </select>
            </label>

            <label>
              Date Sent Mode
              <select
                value={editForm.dateSentMode || 'DATE'}
                onChange={(e) => handleEditFieldChange('dateSentMode', e.target.value)}
              >
                <option value="DATE">Date Picker</option>
                <option value="TEXT">User Input</option>
              </select>
            </label>

            {editForm.actionTaken === 'User Input' && (
              <label className="modal__span">
                Action Taken (Custom)
                <input
                  type="text"
                  placeholder="Enter action taken"
                  value={editForm.actionTakenCustom || ''}
                  onChange={(e) => handleEditFieldChange('actionTakenCustom', e.target.value)}
                />
              </label>
            )}

            <label className="modal__span">
              Date Sent
              <input
                type={(editForm.dateSentMode || 'DATE') === 'DATE' ? 'date' : 'text'}
                placeholder={(editForm.dateSentMode || 'DATE') === 'DATE' ? '' : 'Enter date sent'}
                value={editForm.dateSent || ''}
                onChange={(e) => handleEditFieldChange('dateSent', e.target.value)}
              />
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
                    disabled={Boolean(editForm.remarksCustom)}
                    onChange={(e) => handleEditFieldChange(key, e.target.checked)}
                  />
                  {label}
                </label>
              ))}
              <label>
                <input
                  type="checkbox"
                  checked={Boolean(editForm.remarksCustom)}
                  onChange={(e) => {
                    handleEditFieldChange('remarksCustom', e.target.checked);
                    if (e.target.checked) {
                      handleEditFieldChange('remarksEmail', false);
                      handleEditFieldChange('remarksViber', false);
                      handleEditFieldChange('remarksHardCopy', false);
                    } else {
                      handleEditFieldChange('remarksCustomText', '');
                    }
                  }}
                />
                Others
              </label>
              {editForm.remarksCustom && (
                <input
                  type="text"
                  placeholder="Enter custom remark"
                  value={editForm.remarksCustomText || ''}
                  onChange={(e) => handleEditFieldChange('remarksCustomText', e.target.value)}
                  style={{ marginTop: '4px' }}
                />
              )}
              <div className="form-panel__remarks">Output: {editRemarksText || '-'}</div>
            </div>

            <label>
              Concerned Units
              <select
                value={editForm.concernedUnits || ''}
                className={getEditFieldClass('concernedUnits')}
                onChange={(e) => handleEditFieldChange('concernedUnits', e.target.value)}
              >
                {fromOpts.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </label>

            {editForm.concernedUnits === 'User Input' && (
              <label className="modal__span">
                Concerned Units (Custom)
                <input
                  type="text"
                  placeholder="Enter concerned units"
                  value={editForm.concernedUnitsCustom || ''}
                  onChange={(e) => handleEditFieldChange('concernedUnitsCustom', e.target.value)}
                />
              </label>
            )}
          </div>
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
