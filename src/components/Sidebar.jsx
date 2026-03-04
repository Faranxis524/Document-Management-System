import logo from '../assets/cidg-logo.svg';
import { SECTION_LABELS, parseSections } from '../constants';

export default function Sidebar({ navItems, activeSection, setActiveSection, isMc, currentUser, handleLogout }) {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div className="seal-wrap">
          <img className="sidebar__seal" src={logo} alt="CIDG RFU 4A Seal" />
        </div>
        <div>
          <h2>CIDG RFU 4A</h2>
          <span>Document Management System</span>
        </div>
      </div>

      <nav className="sidebar__nav">
        {navItems.map((item) => {
          const sectionKey = Object.keys(SECTION_LABELS).find((k) => SECTION_LABELS[k] === item);
          const allowed =
            (item === 'MC Master List' && isMc) ||
            (item === 'Activity Log') ||
            (item === 'User Management' && isMc) ||
            (sectionKey && (isMc || parseSections(currentUser?.section).includes(sectionKey)));

          return (
            <button
              key={item}
              type="button"
              disabled={!allowed}
              className={[
                'sidebar__link',
                activeSection === item ? 'sidebar__link--active' : '',
                !allowed ? 'sidebar__link--locked' : '',
              ]
                .filter(Boolean)
                .join(' ')}
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

      <div className="sidebar__profile">
        <span className="sidebar__profile-name">{currentUser?.username}</span>
        <div className="sidebar__profile-badges">
          <span className="sidebar__profile-badge">Role: {currentUser?.role}</span>
          {currentUser?.role !== 'MC' && (
            <span className="sidebar__profile-badge">Section: {parseSections(currentUser?.section).join(', ')}</span>
          )}
        </div>
      </div>
    </aside>
  );
}
