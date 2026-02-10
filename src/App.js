import { useState } from 'react';
import './App.css';
import loginBg from './assets/login-bg.png';
import logo from './assets/logo.png';

const navItems = [
  'MC Masterlist',
  'Intelligence Section',
  'Operation Section',
  'Admin Section',
  'Investigation Section',
];

const tableColumns = [
  'MC Ctrl No.',
  'Section Ctrl No.',
  'Section',
  'Date Received',
  'From',
  'Target Date',
  'Status',
  'Remarks',
];

const mockRows = Array.from({ length: 8 }).map((_, index) => ({
  id: `row-${index + 1}`,
  values: [
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
  ],
}));

const tableSections = navItems;

function App() {
  const [view, setView] = useState('login');
  const [activeSection, setActiveSection] = useState(tableSections[0]);

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
                  <input type="text" placeholder="" />
                </label>
                <label>
                  Password
                  <input type="password" placeholder="" />
                </label>
                <button
                  type="button"
                  onClick={() => setView('dashboard')}
                >
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
              {navItems.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`sidebar__link${activeSection === item ? ' sidebar__link--active' : ''}`}
                  onClick={() => setActiveSection(item)}
                >
                  {item}
                </button>
              ))}
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
              <input className="toolbar__input" placeholder="Search..." />
              <div className="toolbar__filters">
                <button type="button">Filter by Section</button>
                <button type="button">Status</button>
                <div className="toolbar__date">
                  <span>Date From</span>
                  <input type="text" placeholder="" />
                  <span>To</span>
                  <input type="text" placeholder="" />
                </div>
                <button type="button">Export</button>
              </div>
            </div>

            <div className="content__body">
              <div className="tables">
                <section key={activeSection} className="table">
                  <h3>{activeSection}</h3>
                  <div className="table__grid">
                    <div className="table__row table__row--head">
                      {tableColumns.map((col) => (
                        <div key={`${activeSection}-${col}`} className="table__cell table__cell--head">
                          {col}
                        </div>
                      ))}
                    </div>
                    {mockRows.map((row) => (
                      <div key={`${activeSection}-${row.id}`} className="table__row">
                        {row.values.map((value, idx) => (
                          <div key={`${activeSection}-${row.id}-${idx}`} className="table__cell">
                            {value}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <aside className="form-panel">
                <div className="form-panel__header">Document Form Panel</div>
                <form className="form-panel__body">
                  <label>
                    Control Number
                    <input type="text" />
                  </label>
                  <label>
                    Date Received
                    <div className="input-icon">
                      <input type="text" />
                      <span className="input-icon__badge" />
                    </div>
                  </label>
                  <label>
                    Subject
                    <input type="text" />
                  </label>
                  <label>
                    From
                    <div className="input-icon">
                      <input type="text" />
                      <span className="input-icon__badge" />
                    </div>
                  </label>
                  <label>
                    Target Date
                    <div className="input-icon">
                      <input type="text" />
                      <span className="input-icon__badge" />
                    </div>
                  </label>
                  <label>
                    Received By
                    <input type="text" />
                  </label>
                  <label>
                    Action Taken
                    <input type="text" />
                  </label>
                  <div className="form-panel__actions">
                    <button type="button">Save</button>
                    <button type="button" className="secondary">
                      Cancel
                    </button>
                  </div>
                </form>
              </aside>
            </div>
          </main>
        </section>
      )}
    </div>
  );
}

export default App;
