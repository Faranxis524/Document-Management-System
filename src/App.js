import { useMemo, useState } from 'react';
import './App.css';
import loginBg from './assets/login-bg.png';
import logo from './assets/logo.png';

const USERS = [
  { label: 'NUP Tala (MC)', role: 'MC', section: null },
  { label: 'PMSG Foncardas (MC)', role: 'MC', section: null },
  { label: 'NUP Tala (INVES)', role: 'SECTION', section: 'INVES' },
  { label: 'NUP San Pedro (ADM)', role: 'SECTION', section: 'ADM' },
  { label: 'PMSG Foncardas (ADM)', role: 'SECTION', section: 'ADM' },
  { label: 'NUP Aldrin (OPN)', role: 'SECTION', section: 'OPN' },
  { label: 'PCPL Bueno (OPN)', role: 'SECTION', section: 'OPN' },
  { label: 'PAT Duyag (OPN)', role: 'SECTION', section: 'OPN' },
  { label: 'NUP Joyce (INTEL)', role: 'SECTION', section: 'INTEL' },
  { label: 'PCPL Jose (INTEL)', role: 'SECTION', section: 'INTEL' },
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
  const [activeSection, setActiveSection] = useState('MC Masterlist');
  const [records, setRecords] = useState([]);
  const [recordForm, setRecordForm] = useState(INITIAL_RECORD);
  const [search, setSearch] = useState('');
  const [filterSection, setFilterSection] = useState('ALL');
  const [filterAction, setFilterAction] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [ctrlCounters, setCtrlCounters] = useState({ MC: 0, INVES: 0, INTEL: 0, ADM: 0, OPN: 0 });
  const [ctrlModal, setCtrlModal] = useState({ open: false, dateReceived: '', section: 'INVES' });

  const currentUser = USERS[userIndex];
  const isMc = currentUser?.role === 'MC';

  const allowedSections = useMemo(() => {
    if (isMc) return SECTIONS;
    return currentUser?.section ? [currentUser.section] : [];
  }, [currentUser, isMc]);

  const displayRecords = useMemo(() => {
    return records.filter((row) => {
      if (!isMc && row.section !== currentUser.section) return false;
      if (filterSection !== 'ALL' && row.section !== filterSection) return false;
      if (filterAction !== 'ALL' && row.actionTaken !== filterAction) return false;
      if (dateFrom && row.dateReceived < dateFrom) return false;
      if (dateTo && row.dateReceived > dateTo) return false;
      if (search) {
        const needle = search.toLowerCase();
        const hay = `${row.mcCtrlNo} ${row.sectionCtrlNo} ${row.subjectText}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [records, isMc, currentUser, filterSection, filterAction, dateFrom, dateTo, search]);

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

  const handleLogin = () => {
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
  };

  const handleGenerateCtrl = () => {
    if (!ctrlModal.dateReceived) return;
    const mcNext = ctrlCounters.MC + 1;
    const sectionNext = ctrlCounters[ctrlModal.section] + 1;
    const mcCtrlNo = formatCtrlNo('RFU4A', null, ctrlModal.dateReceived, mcNext);
    const sectionCtrlNo = formatCtrlNo('RFU4A', ctrlModal.section, ctrlModal.dateReceived, sectionNext);

    setCtrlCounters((prev) => ({
      ...prev,
      MC: mcNext,
      [ctrlModal.section]: sectionNext,
    }));

    setRecordForm((prev) => ({
      ...prev,
      mcCtrlNo,
      sectionCtrlNo,
      section: ctrlModal.section,
      dateReceived: ctrlModal.dateReceived,
      fromValue: DEFAULT_FROM[ctrlModal.section],
      concernedUnits: DEFAULT_FROM[ctrlModal.section],
      receivedBy: RECEIVED_BY[ctrlModal.section]?.[0] || '',
    }));
    setCtrlModal({ open: false, dateReceived: '', section: ctrlModal.section });
  };

  const handleSaveRecord = () => {
    const newRecord = {
      ...recordForm,
      subjectFileName: recordForm.subjectFile?.name || null,
      subjectFileUrl: recordForm.subjectFile
        ? URL.createObjectURL(recordForm.subjectFile)
        : null,
      remarksText,
    };
    setRecords((prev) => [newRecord, ...prev]);
    setRecordForm((prev) => ({
      ...INITIAL_RECORD,
      section: isMc ? prev.section : currentUser.section,
      fromValue: DEFAULT_FROM[prev.section],
      concernedUnits: DEFAULT_FROM[prev.section],
    }));
  };

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
                  <input type="password" placeholder="" />
                </label>
                <button type="button" onClick={handleLogin}>
                  Sign In
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
              <button
                type="button"
                className="sidebar__link sidebar__link--logout"
                onClick={() => setView('login')}
              >
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
                <div className="toolbar__date">
                  <span>Date From</span>
                  <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
                  <span>To</span>
                  <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
                </div>
                <button type="button">Export (Excel)</button>
                {isMc && (
                  <button type="button" className="toolbar__primary" onClick={() => setCtrlModal({ open: true, dateReceived: '', section: 'INVES' })}>
                    Add Ctrl No.
                  </button>
                )}
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
                    {displayRecords.map((row, idx) => (
                      <div key={`${activeSection}-${row.mcCtrlNo}-${idx}`} className="table__row">
                        <div className="table__cell">{row.mcCtrlNo}</div>
                        <div className="table__cell">{row.sectionCtrlNo}</div>
                        <div className="table__cell">{row.section}</div>
                        <div className="table__cell">{row.dateReceived}</div>
                        <div className="table__cell">
                          {row.subjectFileUrl ? (
                            <a className="table__link" href={row.subjectFileUrl} target="_blank" rel="noreferrer">
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
                  <label>
                    MC Ctrl No.
                    <input type="text" value={recordForm.mcCtrlNo} readOnly />
                  </label>
                  <label>
                    Section Ctrl No.
                    <input type="text" value={recordForm.sectionCtrlNo} readOnly />
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
                      }}
                      disabled={!isMc}
                    >
                      {sectionOptions}
                    </select>
                  </label>
                  <label>
                    Date Received
                    <input
                      type="date"
                      value={recordForm.dateReceived}
                      onChange={(event) => setRecordForm((prev) => ({ ...prev, dateReceived: event.target.value }))}
                    />
                  </label>
                  <label>
                    Subject
                    <input
                      type="text"
                      value={recordForm.subjectText}
                      onChange={(event) => setRecordForm((prev) => ({ ...prev, subjectText: event.target.value }))}
                    />
                  </label>
                  <label>
                    Upload Document (PDF/DOCX)
                    <input
                      type="file"
                      accept=".pdf,.docx"
                      onChange={(event) => setRecordForm((prev) => ({ ...prev, subjectFile: event.target.files?.[0] || null }))}
                    />
                  </label>
                  <label>
                    From
                    <select
                      value={recordForm.fromValue}
                      onChange={(event) => setRecordForm((prev) => ({ ...prev, fromValue: event.target.value }))}
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
                      onChange={(event) => setRecordForm((prev) => ({ ...prev, targetDate: event.target.value }))}
                    />
                  </label>
                  <label>
                    Received By
                    <select
                      value={recordForm.receivedBy}
                      onChange={(event) => setRecordForm((prev) => ({ ...prev, receivedBy: event.target.value }))}
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
                      onChange={(event) => setRecordForm((prev) => ({ ...prev, concernedUnits: event.target.value }))}
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
                    <button type="button" onClick={handleSaveRecord}>
                      Save
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

      {ctrlModal.open && (
        <div className="modal">
          <div className="modal__card">
            <h3>Add Control Number</h3>
            <label>
              Date Received
              <input
                type="date"
                value={ctrlModal.dateReceived}
                onChange={(event) => setCtrlModal((prev) => ({ ...prev, dateReceived: event.target.value }))}
              />
            </label>
            <label>
              Section
              <select
                value={ctrlModal.section}
                onChange={(event) => setCtrlModal((prev) => ({ ...prev, section: event.target.value }))}
              >
                {sectionOptions}
              </select>
            </label>
            <div className="modal__actions">
              <button type="button" onClick={handleGenerateCtrl}>
                Generate
              </button>
              <button type="button" className="secondary" onClick={() => setCtrlModal({ open: false, dateReceived: '', section: 'INVES' })}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
