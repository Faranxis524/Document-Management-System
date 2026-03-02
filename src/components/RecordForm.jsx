import { useMemo } from 'react';
import { SECTIONS, SECTION_LABELS, RECEIVED_BY, DEFAULT_FROM, INITIAL_RECORD, getFromOptions } from '../constants';

export default function RecordForm({
  isMc,
  recordForm, setRecordForm,
  formErrors, setFormErrors,
  formErrorMessage,
  handleFieldChange,
  handleSaveRecord,
  previewCtrlNumbers,
  isSaving,
}) {
  const remarksText = useMemo(() => {
    const parts = [];
    if (recordForm.remarksEmail) parts.push('email');
    if (recordForm.remarksViber) parts.push('viber');
    if (recordForm.remarksHardCopy) parts.push('hardcopy');
    return parts.length ? `sent through ${parts.join('/ ')}` : '';
  }, [recordForm.remarksEmail, recordForm.remarksViber, recordForm.remarksHardCopy]);

  const getFieldClass = (field) => (formErrors[field] ? 'input--error' : '');

  const fromOpts = getFromOptions(recordForm.section);

  return (
    <aside className="form-panel">
      <div className="form-panel__header">Document Form Panel</div>
      <form className="form-panel__body">
        {formErrorMessage && <div className="form-panel__error">{formErrorMessage}</div>}

        <label>
          Section
          <select
            value={recordForm.section}
            disabled={!isMc}
            className={getFieldClass('section')}
            title="The operational section this document belongs to"
            aria-label="Section"
            onChange={(e) => {
              const next = e.target.value;
              setRecordForm((prev) => ({
                ...prev,
                section: next,
                fromValue: DEFAULT_FROM[next],
                fromCustom: '',
                concernedUnits: DEFAULT_FROM[next],
                receivedBy: RECEIVED_BY[next]?.[0] || '',
              }));
              setFormErrors((prev) => {
                const { section: _s, fromValue: _f, concernedUnits: _c, receivedBy: _r, ...rest } = prev;
                return rest;
              });
              if (recordForm.dateReceived) {
                previewCtrlNumbers(recordForm.dateReceived, next);
              } else {
                setRecordForm((prev) => ({ ...prev, mcCtrlNo: '', sectionCtrlNo: '' }));
              }
            }}
          >
            {SECTIONS.map((s) => (
              <option key={s} value={s}>{SECTION_LABELS[s] ? `${s} — ${SECTION_LABELS[s]}` : s}</option>
            ))}
          </select>
        </label>

        <label>
          Date Received
          <input
            type="date"
            value={recordForm.dateReceived}
            className={getFieldClass('dateReceived')}
            onChange={(e) => {
              const v = e.target.value;
              handleFieldChange('dateReceived', v);
              if (!v) { setRecordForm((prev) => ({ ...prev, mcCtrlNo: '', sectionCtrlNo: '' })); return; }
              previewCtrlNumbers(v, recordForm.section);
            }}
          />
        </label>

        <label>
          MC Ctrl No.
          <input type="text" value={recordForm.mcCtrlNo} readOnly className={getFieldClass('mcCtrlNo')} />
        </label>

        <label>
          Section Ctrl No.
          <input type="text" value={recordForm.sectionCtrlNo} readOnly className={getFieldClass('sectionCtrlNo')} />
        </label>

        <label>
          Subject
          <input
            type="text"
            value={recordForm.subjectText}
            className={getFieldClass('subjectText')}
            title="Brief description of the document (max 500 characters)"
            aria-label="Subject"
            maxLength={500}
            onChange={(e) => handleFieldChange('subjectText', e.target.value)}
          />
        </label>

        <label>
          Upload Document (PDF/DOCX)
          <input
            type="file"
            accept=".pdf,.docx"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              const ext = file ? file.name.toLowerCase().slice(file.name.lastIndexOf('.')) : '';
              if (file && !['.pdf', '.docx'].includes(ext)) {
                setFormErrors((prev) => ({ ...prev, subjectText: 'Only PDF and DOCX files are allowed.' }));
                return;
              }
              setRecordForm((prev) => ({ ...prev, subjectFile: file }));
              handleFieldChange('subjectText', recordForm.subjectText); // clears error
            }}
          />
        </label>

        <label>
          From
          <select
            value={recordForm.fromValue}
            className={getFieldClass('fromValue')}
            onChange={(e) => handleFieldChange('fromValue', e.target.value)}
          >
            {fromOpts.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </label>

        {recordForm.fromValue === 'User Input' && (
          <label>
            From (Custom)
            <input
              type="text"
              placeholder="Enter custom from"
              value={recordForm.fromCustom}
              onChange={(e) => setRecordForm((prev) => ({ ...prev, fromCustom: e.target.value }))}
            />
          </label>
        )}

        <label>
          Target Date Mode
          <select
            value={recordForm.targetDateMode}
            onChange={(e) =>
              setRecordForm((prev) => ({ ...prev, targetDateMode: e.target.value, targetDate: '' }))
            }
          >
            <option value="DATE">Date Picker</option>
            <option value="TEXT">User Input</option>
          </select>
        </label>

        <label>
          Target Date
          <input
            type={recordForm.targetDateMode === 'DATE' ? 'date' : 'text'}
            placeholder={recordForm.targetDateMode === 'DATE' ? '' : 'Enter target date'}
            value={recordForm.targetDate}
            className={getFieldClass('targetDate')}
            title="Deadline for action or disposition of this document"
            aria-label="Target Date"
            onChange={(e) => handleFieldChange('targetDate', e.target.value)}
          />
        </label>

        <label>
          Received By
          <select
            value={recordForm.receivedBy}
            className={getFieldClass('receivedBy')}
            onChange={(e) => handleFieldChange('receivedBy', e.target.value)}
          >
            {(RECEIVED_BY[recordForm.section] || []).map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>

        <label>
          Action Taken
          <select
            value={recordForm.actionTaken}
            onChange={(e) => setRecordForm((prev) => ({ ...prev, actionTaken: e.target.value }))}
          >
            <option value="DRAFTED">Drafted</option>
            <option value="DISSEMINATED">Disseminated</option>
            <option value="FILED">Filed</option>
          </select>
        </label>

        <div className="form-panel__checkboxes">
          <span>Remarks (Sent Through)</span>
          {[
            { key: 'remarksEmail', label: 'Email' },
            { key: 'remarksViber', label: 'Viber' },
            { key: 'remarksHardCopy', label: 'Hard Copy' },
          ].map(({ key, label }) => (
            <label key={key}>
              <input
                type="checkbox"
                checked={recordForm[key]}
                onChange={(e) => setRecordForm((prev) => ({ ...prev, [key]: e.target.checked }))}
              />
              {label}
            </label>
          ))}
          <div className="form-panel__remarks">Output: {remarksText || '-'}</div>
        </div>

        <label>
          Concerned Units
          <select
            value={recordForm.concernedUnits}
            className={getFieldClass('concernedUnits')}
            title="Units concerned with or affected by this document"
            aria-label="Concerned Units"
            onChange={(e) => handleFieldChange('concernedUnits', e.target.value)}
          >
            {fromOpts.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </label>

        <label>
          Date Sent
          <input
            type="date"
            value={recordForm.dateSent}
            onChange={(e) => setRecordForm((prev) => ({ ...prev, dateSent: e.target.value }))}
          />
        </label>

        <div className="form-panel__actions">
          <button type="button" onClick={handleSaveRecord} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save'}
          </button>
          <button type="button" className="secondary" onClick={() => setRecordForm(INITIAL_RECORD)}>
            Clear
          </button>
        </div>
      </form>
    </aside>
  );
}
