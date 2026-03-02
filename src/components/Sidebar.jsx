import logo from '../assets/cidg-logo.svg';
import { SECTION_LABELS } from '../constants';

export default function Sidebar({ navItems, activeSection, setActiveSection, isMc, currentUser, handleLogout }) {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div className="seal-wrap">
          <img className="sidebar__seal" src={logo} alt="CIDG RFU 4A Seal" />
        </div>
        <h2>CIDG RFU 4A</h2>
        <span>Document Management System</span>
      </div>

      <nav className="sidebar__nav">
        {navItems.map((item) => {
          const sectionKey = Object.keys(SECTION_LABELS).find((k) => SECTION_LABELS[k] === item);
          const allowed =
            (item === 'MC Master List' && isMc) ||
            (item === 'Activity Log' && isMc) ||
            (item === 'User Management' && isMc) ||
            (sectionKey && (isMc || currentUser?.section === sectionKey));

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
        <h4>Active Profile</h4>
        <p><strong>Name:</strong> {currentUser?.username}</p>
        <p><strong>Role:</strong> {currentUser?.role}</p>
        <p><strong>Section:</strong> {currentUser?.section || 'MC'}</p>
      </div>
    </aside>
  );
}
