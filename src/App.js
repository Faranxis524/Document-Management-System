import { useEffect, useMemo, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './App.css';
import loginBg from './assets/login-bg.png';
import logo from './assets/logo.png';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5000';
const USERS = [
  { label: 'NUP Tala (MC)', username: 'NUP Tala', role: 'MC', section: null },
  { label: 'PMSG Foncardas (MC)', username: 'PMSG Foncardas', role: 'MC', section: null },
  { label: 'NUP Tala (INVES)', username: 'NUP Tala - INVES', role: 'SECTION', section: 'INVES' },
  { label: 'NUP San Pedro (ADM)', username: 'NUP San Pedro', role: 'SECTION', section: 'ADM' },
  { label: 'PMSG Foncardas (ADM)', username: 'PMSG Foncardas - ADM', role: 'SECTION', section: 'ADM' },
  { label: 'NUP Aldrin (OPN)', username: 'NUP Aldrin', role: 'SECTION', section: 'OPN' },
  { label: 'PCPL Bueno (OPN)', username: 'PCPL Bueno', role: 'SECTION', section: 'OPN' },
  { label: 'PAT Duyag (OPN)', username: 'PAT Duyag', role: 'SECTION', section: 'OPN' },
  { label: 'NUP Joyce (INTEL)', username: 'NUP Joyce', role: 'SECTION', section: 'INTEL' },
  { label: 'PCPL Jose (INTEL)', username: 'PCPL Jose', role: 'SECTION', section: 'INTEL' },
];

const SECTIONS = ['INVES', 'INTEL', 'ADM', 'OPN'];

const SECTION_LABELS = {
  INVES: 'Investigation Section',
  INTEL: 'Intelligence Section',
  ADM: 'Admin Section',
  OPN: 'Operation Section',
};

const DEFAULT_FROM = {
  INVES: 'IND',
  OPN: 'OMD',
  INTEL: 'ID',
  ADM: 'ARMD',
};

const RECEIVED_BY = {
  INVES: ['NUP TALA'],
  OPN: ['NUP Aldrin', 'PCPL Bueno', 'PAT Duyag'],
  INTEL: ['NUP Joyce', 'PCPL Jose'],
  ADM: ['NUP San Pedro', 'PMSG Foncardas'],
};

const TABLE_COLUMNS = [
  'MC Ctrl No.',
  'Section Ctrl No.',
  'Section',
  'Date Received',
  'Subject',
  'From',
  'Target Date',
  'Received By',
  'Action Taken',
  'Remarks',
  'Concerned Units',
  'Date Sent',
];

const NAV_ITEMS = ['MC Masterlist', ...SECTIONS.map((section) => SECTION_LABELS[section])];

const INITIAL_RECORD = {
  mcCtrlNo: '',
  sectionCtrlNo: '',
  section: 'INVES',
  dateReceived: '',
  subjectText: '',
  subjectFile: null,
  fromValue: 'IND',
  fromType: 'DEFAULT',
  targetDateMode: 'DATE',
  targetDate: '',
  receivedBy: '',
  actionTaken: 'DRAFTED',
  remarksEmail: false,
  remarksViber: false,
  remarksHardCopy: false,
  concernedUnits: 'IND',
  dateSent: '',
};

function formatCtrlNo(prefix, section, dateStr, seq) {
  const date = (dateStr || '').replace(/-/g, '').slice(2);
  const padded = String(seq).padStart(2, '0');
  const suffix = section ? `-${section}` : '-MC';
  return `${prefix}${suffix}-${date}-${padded}`;
}

function App() {
  const [view, setView] = useState('login');
  const [userIndex, setUserIndex] = useState(0);
  const [loginPassword, setLoginPassword] = useState('password');
  const [activeSection, setActiveSection] = useState('MC Masterlist');
  const [records, setRecords] = useState([]);
  const [recordForm, setRecordForm] = useState(INITIAL_RECORD);
  const [formErrors, setFormErrors] = useState({});
  const [formErrorMessage, setFormErrorMessage] = useState('');
  const [search, setSearch] = useState('');
  const [filterSection, setFilterSection] = useState('ALL');
  const [filterAction, setFilterAction] = useState('ALL');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [apiError, setApiError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editModal, setEditModal] = useState({ open: false, recordId: null });
  const [editForm, setEditForm] = useState(INITIAL_RECORD);

  const currentUser = USERS[userIndex];
  const isMc = currentUser?.role === 'MC';

  const displayRecords = useMemo(() => {
    const activeSectionKey = Object.keys(SECTION_LABELS).find((key) => SECTION_LABELS[key] === activeSection);
    return records.filter((row) => {
      if (!isMc && row.section !== currentUser.section) return false;
      if (activeSection !== 'MC Masterlist' && activeSectionKey && row.section !== activeSectionKey) return false;
      if (activeSection === 'MC Masterlist' && filterSection !== 'ALL' && row.section !== filterSection) return false;
      if (filterAction !== 'ALL' && row.actionTaken !== filterAction) return false;
      if (filterMonth || filterYear) {
        const [year, month] = (row.dateReceived || '').split('-');
        if (filterYear && year !== filterYear) return false;
        if (filterMonth && month !== filterMonth) return false;
      }
      if (dateFrom && row.dateReceived < dateFrom) return false;
      if (dateTo && row.dateReceived > dateTo) return false;
      if (search) {
        const needle = search.toLowerCase();
        const hay = `${row.mcCtrlNo} ${row.sectionCtrlNo} ${row.subjectText}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [
    records,
    isMc,
    currentUser,
    filterSection,
    filterAction,
    filterMonth,
    filterYear,
    dateFrom,
    dateTo,
    search,
    activeSection,
  ]);

  const remarksText = useMemo(() => {
    const parts = [];
    if (recordForm.remarksEmail) parts.push('Email');
    if (recordForm.remarksViber) parts.push('Viber');
    if (recordForm.remarksHardCopy) parts.push('Hard Copy');
    return parts.join(' / ');
  }, [recordForm]);

  const sectionOptions = SECTIONS.map((section) => (
    <option key={section} value={section}>
      {section}
    </option>
  ));

  const fromOptions = (section) => {
    const defaults = [DEFAULT_FROM[section] || 'PFU'];
    const others = ['PFU (CAVITE)', 'PFU (LAGUNA)', 'PFU (RIZAL)', 'PFU (BATANGAS)', 'PFU (QUEZON)', 'User Input'];
    return [...defaults, ...others];
  };

  const apiFetch = async (path, options = {}) => {
    const headers = { ...(options.headers || {}) };
    const isFormData = options.body instanceof FormData;
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }
    const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }
    return data;
  };

  useEffect(() => {
    if (!authToken) return;
    let isActive = true;
    setIsLoading(true);
    apiFetch('/records')
      .then((data) => {
        if (isActive) setRecords(data.records || []);
      })
      .catch((error) => {
        if (isActive) setApiError(error.message);
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, [authToken]);

  const handleLogin = async () => {
    setApiError('');
    setIsLoading(true);
    try {
      const response = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: currentUser.username, password: loginPassword }),
      });
      setAuthToken(response.token);
      setView('dashboard');
      if (!isMc && currentUser?.section) {
        setActiveSection(SECTION_LABELS[currentUser.section]);
        setRecordForm((prev) => ({
          ...prev,
          section: currentUser.section,
          fromValue: DEFAULT_FROM[currentUser.section],
          concernedUnits: DEFAULT_FROM[currentUser.section],
          receivedBy: RECEIVED_BY[currentUser.section]?.[0] || '',
        }));
      }
    } catch (error) {
      setApiError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setAuthToken('');
    setRecords([]);
    setView('login');
    setApiError('');
  };

  const clearFieldError = (field) => {
    setFormErrors((prev) => {
      if (!prev[field]) return prev;
      const { [field]: _ignored, ...rest } = prev;
      return rest;
    });
  };

  const handleFieldChange = (field, value) => {
    setRecordForm((prev) => ({ ...prev, [field]: value }));
    clearFieldError(field);
    setFormErrorMessage('');
  };

  const getNextCounter = (counter, dateReceived) => {
    if (!dateReceived) return { next: null, updated: counter };
    const next = counter.lastDate !== dateReceived ? 1 : counter.current + 1;
    return { next, updated: { current: next, lastDate: dateReceived } };
  };

  const previewCtrlNumbers = async (dateReceived, section) => {
    if (!dateReceived || !section || !authToken) return;
    try {
      const preview = await apiFetch('/control-numbers/preview', {
        method: 'POST',
        body: JSON.stringify({ section, dateReceived }),
      });
      setRecordForm((prev) => ({
        ...prev,
        mcCtrlNo: preview.mcCtrlNo,
        sectionCtrlNo: preview.sectionCtrlNo,
        section,
        dateReceived,
        fromValue: DEFAULT_FROM[section],
        concernedUnits: DEFAULT_FROM[section],
        receivedBy: RECEIVED_BY[section]?.[0] || '',
      }));
      setFormErrors((prev) => {
        const { mcCtrlNo: _mc, sectionCtrlNo: _sec, dateReceived: _date, ...rest } = prev;
        return rest;
      });
      setFormErrorMessage('');
    } catch (error) {
      setApiError(error.message);
    }
  };

  const handleSaveRecord = async () => {
    const errors = {};
    if (!recordForm.dateReceived) errors.dateReceived = 'Date received is required.';
    if (!recordForm.subjectText && !recordForm.subjectFile) {
      errors.subjectText = 'Provide a subject or upload a document.';
    }
    if (!recordForm.fromValue) errors.fromValue = 'From field is required.';
    if (!recordForm.targetDate) errors.targetDate = 'Target date is required.';
    if (!recordForm.receivedBy) errors.receivedBy = 'Received by is required.';
    if (!recordForm.concernedUnits) errors.concernedUnits = 'Concerned unit is required.';
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setFormErrorMessage('Please complete the required fields highlighted in red.');
      return;
    }

    setIsSaving(true);
    setApiError('');
    try {
      const { subjectFile, ...payload } = recordForm;
      const created = await apiFetch('/records', {
        method: 'POST',
        body: JSON.stringify({ ...payload, createdBy: currentUser.username }),
      });
      let savedRecord = created;
      if (subjectFile) {
        const formData = new FormData();
        formData.append('file', subjectFile);
        savedRecord = await apiFetch(`/records/${created.id}/upload`, {
          method: 'POST',
          body: formData,
        });
      }
      setRecords((prev) => [savedRecord, ...prev]);
      setRecordForm((prev) => ({
        ...INITIAL_RECORD,
        section: isMc ? prev.section : currentUser.section,
        fromValue: DEFAULT_FROM[prev.section],
        concernedUnits: DEFAULT_FROM[prev.section],
      }));
      setFormErrors({});
      setFormErrorMessage('');
    } catch (error) {
      setApiError(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenEdit = (row) => {
    setEditForm({ ...row, subjectFile: null });
    setEditModal({ open: true, recordId: row.id });
  };

  const handleExportPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const title = `CIDG RFU 4A Records${filterMonth || filterYear ? ` (${filterMonth || 'All'}-${filterYear || 'All'})` : ''}`;
    doc.setFontSize(12);
    doc.text(title, 14, 12);
    autoTable(doc, {
      startY: 18,
      head: [TABLE_COLUMNS],
      body: displayRecords.map((row) => [
        row.mcCtrlNo,
        row.sectionCtrlNo,
        row.section,
        row.dateReceived,
        row.subjectText,
        row.fromValue,
        row.targetDate,
        row.receivedBy,
        row.actionTaken,
        row.remarksText,
        row.concernedUnits,
        row.dateSent,
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [31, 76, 156] },
    });
    doc.save('records.pdf');
  };

  const handleUpdateRecord = async () => {
    if (!editModal.recordId) return;
    setIsSaving(true);
    setApiError('');
    try {
      const updated = await apiFetch(`/records/${editModal.recordId}`, {
        method: 'PUT',
        body: JSON.stringify({ ...editForm, updatedBy: currentUser.username }),
      });
      setRecords((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
      setEditModal({ open: false, recordId: null });
    } catch (error) {
      setApiError(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRecord = async () => {
    if (!editModal.recordId) return;
    setIsSaving(true);
    setApiError('');
    try {
      await apiFetch(`/records/${editModal.recordId}`, { method: 'DELETE' });
      setRecords((prev) => prev.filter((row) => row.id !== editModal.recordId));
      setEditModal({ open: false, recordId: null });
    } catch (error) {
      setApiError(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const getFieldClass = (field) => (formErrors[field] ? 'input--error' : '');

  return (
    <div className="app-shell">
      {view === 'login' ? (
        <section className="login" aria-label="Login">
          <div className="login__image" aria-hidden="true">
            <img src={loginBg} alt="" />
          </div>
          <div className="login__panel">
            <div className="login__card">
              <img className="login__seal" src={logo} alt="CIDG RFU 4A Seal" />
              <h1>CIDG RFU 4A</h1>
              <p className="login__subtitle">Document Management System</p>
              <form className="login__form">
                {apiError && <div className="form-panel__error">{apiError}</div>}
                <label>
                  Username
                  <select value={userIndex} onChange={(event) => setUserIndex(Number(event.target.value))}>
                    {USERS.map((user, index) => (
                      <option key={user.label} value={index}>
                        {user.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Password
                  <input
                    type="password"
                    placeholder=""
                    value={loginPassword}
                    onChange={(event) => setLoginPassword(event.target.value)}
                  />
                </label>
                <button type="button" onClick={handleLogin} disabled={isLoading}>
                  {isLoading ? 'Signing In...' : 'Sign In'}
                </button>
                <button type="button" className="login__link">
                  Forgot password?
                </button>
              </form>
            </div>
          </div>
        </section>
      ) : (
        <section className="dashboard" aria-label="Dashboard">
          <aside className="sidebar">
            <div className="sidebar__brand">
              <img className="sidebar__seal" src={logo} alt="CIDG RFU 4A Seal" />
              <h2>CIDG RFU 4A</h2>
              <span>Document Management System</span>
            </div>
            <nav className="sidebar__nav">
              {NAV_ITEMS.map((item) => {
                const isSectionTab = item !== 'MC Masterlist';
                const section = Object.keys(SECTION_LABELS).find((key) => SECTION_LABELS[key] === item);
                const allowed = !isSectionTab || isMc || (section && currentUser?.section === section);
                return (
                  <button
                    key={item}
                    type="button"
                    disabled={!allowed}
                    className={`sidebar__link${activeSection === item ? ' sidebar__link--active' : ''}${!allowed ? ' sidebar__link--locked' : ''}`}
                    onClick={() => allowed && setActiveSection(item)}
                  >
                    {item}
                  </button>
                );
              })}
              <button type="button" className="sidebar__link sidebar__link--logout" onClick={handleLogout}>
                Logout
              </button>
            </nav>
          </aside>

          <main className="content">
            <div className="toolbar">
              <input
                className="toolbar__input"
                placeholder="Search..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <div className="toolbar__filters">
                {apiError && <div className="form-panel__error">{apiError}</div>}
                <select value={filterSection} onChange={(event) => setFilterSection(event.target.value)}>
                  <option value="ALL">All Sections</option>
                  {SECTIONS.map((section) => (
                    <option key={section} value={section}>
                      {section}
                    </option>
                  ))}
                </select>
                <select value={filterAction} onChange={(event) => setFilterAction(event.target.value)}>
                  <option value="ALL">All Actions</option>
                  <option value="DRAFTED">Drafted</option>
                  <option value="DISSEMINATED">Disseminated</option>
                  <option value="FILED">Filed</option>
                </select>
                <select value={filterMonth} onChange={(event) => setFilterMonth(event.target.value)}>
                  <option value="">All Months</option>
                  {Array.from({ length: 12 }).map((_, idx) => {
                    const month = String(idx + 1).padStart(2, '0');
                    return (
                      <option key={month} value={month}>
                        {month}
                      </option>
                    );
                  })}
                </select>
                <select value={filterYear} onChange={(event) => setFilterYear(event.target.value)}>
                  <option value="">All Years</option>
                  {Array.from({ length: 6 }).map((_, idx) => {
                    const year = String(new Date().getFullYear() - idx);
                    return (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    );
                  })}
                </select>
                <div className="toolbar__date">
                  <span>Date From</span>
                  <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
                  <span>To</span>
                  <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
                </div>
                <button type="button" onClick={handleExportPdf}>
                  Export (PDF)
                </button>
                {isMc && null}
              </div>
            </div>

            <div className="content__body">
              <div className="tables">
                <section key={activeSection} className="table">
                  <h3>{activeSection}</h3>
                  <div className="table__grid">
                    <div className="table__row table__row--head">
                      {TABLE_COLUMNS.map((col) => (
                        <div key={`${activeSection}-${col}`} className="table__cell table__cell--head">
                          {col}
                        </div>
                      ))}
                    </div>
                    {displayRecords.map((row) => (
                      <div
                        key={row.id || `${activeSection}-${row.mcCtrlNo}`}
                        className="table__row table__row--clickable"
                        onClick={() => handleOpenEdit(row)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') handleOpenEdit(row);
                        }}
                      >
                        <div className="table__cell">{row.mcCtrlNo}</div>
                        <div className="table__cell">{row.sectionCtrlNo}</div>
                        <div className="table__cell">{row.section}</div>
                        <div className="table__cell">{row.dateReceived}</div>
                        <div className="table__cell">
                          {row.subjectFileUrl ? (
                            <a
                              className="table__link"
                              href={row.subjectFileUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(event) => event.stopPropagation()}
                            >
                              {row.subjectText || 'View File'}
                            </a>
                          ) : (
                            row.subjectText
                          )}
                        </div>
                        <div className="table__cell">{row.fromValue}</div>
                        <div className="table__cell">{row.targetDate}</div>
                        <div className="table__cell">{row.receivedBy}</div>
                        <div className="table__cell">{row.actionTaken}</div>
                        <div className="table__cell">{row.remarksText}</div>
                        <div className="table__cell">{row.concernedUnits}</div>
                        <div className="table__cell">{row.dateSent}</div>
                      </div>
                    ))}
                    {displayRecords.length === 0 && (
                      <div className="table__row table__row--empty">
                        <div className="table__cell">No records yet.</div>
                      </div>
                    )}
                  </div>
                </section>
              </div>

              <aside className="form-panel">
                <div className="form-panel__header">Document Form Panel</div>
                <form className="form-panel__body">
                  {formErrorMessage && <div className="form-panel__error">{formErrorMessage}</div>}
                  <label>
                    MC Ctrl No.
                    <input type="text" value={recordForm.mcCtrlNo} readOnly className={getFieldClass('mcCtrlNo')} />
                  </label>
                  <label>
                    Section Ctrl No.
                    <input type="text" value={recordForm.sectionCtrlNo} readOnly className={getFieldClass('sectionCtrlNo')} />
                  </label>
                  <label>
                    Section
                    <select
                      value={recordForm.section}
                      onChange={(event) => {
                        const nextSection = event.target.value;
                        setRecordForm((prev) => ({
                          ...prev,
                          section: nextSection,
                          fromValue: DEFAULT_FROM[nextSection],
                          concernedUnits: DEFAULT_FROM[nextSection],
                          receivedBy: RECEIVED_BY[nextSection]?.[0] || '',
                        }));
                        setFormErrors((prev) => {
                          const { section, fromValue, concernedUnits, receivedBy, ...rest } = prev;
                          return rest;
                        });
                        setFormErrorMessage('');
                        if (recordForm.dateReceived) {
                          previewCtrlNumbers(recordForm.dateReceived, nextSection);
                        } else {
                          setRecordForm((prev) => ({ ...prev, mcCtrlNo: '', sectionCtrlNo: '' }));
                        }
                      }}
                      disabled={!isMc}
                      className={getFieldClass('section')}
                    >
                      {sectionOptions}
                    </select>
                  </label>
                  <label>
                    Date Received
                    <input
                      type="date"
                      value={recordForm.dateReceived}
                      onChange={(event) => {
                        const dateValue = event.target.value;
                        handleFieldChange('dateReceived', dateValue);
                        if (!dateValue) {
                          setRecordForm((prev) => ({ ...prev, mcCtrlNo: '', sectionCtrlNo: '' }));
                          return;
                        }
                        previewCtrlNumbers(dateValue, recordForm.section);
                      }}
                      className={getFieldClass('dateReceived')}
                    />
                  </label>
                  <label>
                    Subject
                    <input
                      type="text"
                      value={recordForm.subjectText}
                      onChange={(event) => handleFieldChange('subjectText', event.target.value)}
                      className={getFieldClass('subjectText')}
                    />
                  </label>
                  <label>
                    Upload Document (PDF/DOCX)
                    <input
                      type="file"
                      accept=".pdf,.docx"
                      onChange={(event) => {
                        const file = event.target.files?.[0] || null;
                        if (file && !['.pdf', '.docx'].includes(file.name.toLowerCase().slice(file.name.lastIndexOf('.')))) {
                          setFormErrors((prev) => ({ ...prev, subjectText: 'Only PDF and DOCX files are allowed.' }));
                          setFormErrorMessage('Please upload a PDF or DOCX file.');
                          return;
                        }
                        setRecordForm((prev) => ({ ...prev, subjectFile: file }));
                        clearFieldError('subjectText');
                        setFormErrorMessage('');
                      }}
                    />
                  </label>
                  <label>
                    From
                    <select
                      value={recordForm.fromValue}
                      onChange={(event) => handleFieldChange('fromValue', event.target.value)}
                      className={getFieldClass('fromValue')}
                    >
                      {fromOptions(recordForm.section).map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  {recordForm.fromValue === 'User Input' && (
                    <label>
                      From (Custom)
                      <input
                        type="text"
                        placeholder="Enter custom from"
                        onChange={(event) => setRecordForm((prev) => ({ ...prev, fromValue: event.target.value }))}
                      />
                    </label>
                  )}
                  <label>
                    Target Date Mode
                    <select
                      value={recordForm.targetDateMode}
                      onChange={(event) => setRecordForm((prev) => ({ ...prev, targetDateMode: event.target.value, targetDate: '' }))}
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
                      onChange={(event) => handleFieldChange('targetDate', event.target.value)}
                      className={getFieldClass('targetDate')}
                    />
                  </label>
                  <label>
                    Received By
                    <select
                      value={recordForm.receivedBy}
                      onChange={(event) => handleFieldChange('receivedBy', event.target.value)}
                      className={getFieldClass('receivedBy')}
                    >
                      {(RECEIVED_BY[recordForm.section] || []).map((person) => (
                        <option key={person} value={person}>
                          {person}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Action Taken
                    <select
                      value={recordForm.actionTaken}
                      onChange={(event) => setRecordForm((prev) => ({ ...prev, actionTaken: event.target.value }))}
                    >
                      <option value="DRAFTED">Drafted</option>
                      <option value="DISSEMINATED">Disseminated</option>
                      <option value="FILED">Filed</option>
                    </select>
                  </label>
                  <div className="form-panel__checkboxes">
                    <span>Remarks (Sent Through)</span>
                    <label>
                      <input
                        type="checkbox"
                        checked={recordForm.remarksEmail}
                        onChange={(event) => setRecordForm((prev) => ({ ...prev, remarksEmail: event.target.checked }))}
                      />
                      Email
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={recordForm.remarksViber}
                        onChange={(event) => setRecordForm((prev) => ({ ...prev, remarksViber: event.target.checked }))}
                      />
                      Viber
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={recordForm.remarksHardCopy}
                        onChange={(event) => setRecordForm((prev) => ({ ...prev, remarksHardCopy: event.target.checked }))}
                      />
                      Hard Copy
                    </label>
                    <div className="form-panel__remarks">Output: {remarksText || '-'}</div>
                  </div>
                  <label>
                    Concerned Units
                    <select
                      value={recordForm.concernedUnits}
                      onChange={(event) => handleFieldChange('concernedUnits', event.target.value)}
                      className={getFieldClass('concernedUnits')}
                    >
                      {fromOptions(recordForm.section).map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Date Sent
                    <input
                      type="date"
                      value={recordForm.dateSent}
                      onChange={(event) => setRecordForm((prev) => ({ ...prev, dateSent: event.target.value }))}
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
            </div>
          </main>
        </section>
      )}

      {false}

      {editModal.open && (
        <div className="modal">
          <div className="modal__card modal__card--wide">
            <h3>Edit Record</h3>
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
                  onChange={(event) => setEditForm((prev) => ({ ...prev, section: event.target.value }))}
                  disabled={!isMc}
                >
                  {sectionOptions}
                </select>
              </label>
              <label>
                Date Received
                <input
                  type="date"
                  value={editForm.dateReceived}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, dateReceived: event.target.value }))}
                />
              </label>
              <label className="modal__span">
                Subject
                <input
                  type="text"
                  value={editForm.subjectText}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, subjectText: event.target.value }))}
                />
              </label>
              <label>
                From
                <input
                  type="text"
                  value={editForm.fromValue}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, fromValue: event.target.value }))}
                />
              </label>
              <label>
                Target Date
                <input
                  type="text"
                  value={editForm.targetDate}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, targetDate: event.target.value }))}
                />
              </label>
              <label>
                Received By
                <input
                  type="text"
                  value={editForm.receivedBy}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, receivedBy: event.target.value }))}
                />
              </label>
              <label>
                Action Taken
                <select
                  value={editForm.actionTaken}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, actionTaken: event.target.value }))}
                >
                  <option value="DRAFTED">Drafted</option>
                  <option value="DISSEMINATED">Disseminated</option>
                  <option value="FILED">Filed</option>
                </select>
              </label>
              <label>
                Concerned Units
                <input
                  type="text"
                  value={editForm.concernedUnits}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, concernedUnits: event.target.value }))}
                />
              </label>
              <label>
                Date Sent
                <input
                  type="date"
                  value={editForm.dateSent}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, dateSent: event.target.value }))}
                />
              </label>
            </div>
            <div className="modal__actions modal__actions--spread">
              <button type="button" className="danger" onClick={handleDeleteRecord}>
                Delete
              </button>
              <div className="modal__actions">
                <button type="button" className="secondary" onClick={() => setEditModal({ open: false, index: null })}>
                  Cancel
                </button>
                <button type="button" onClick={handleUpdateRecord}>
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
