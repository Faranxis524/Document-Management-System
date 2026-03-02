import { useState, useMemo } from 'react';
import './App.css';

import { SECTION_LABELS, MC_NAV_ITEMS } from './constants';
import { useToast } from './hooks/useToast';
import { useAuth } from './hooks/useAuth';
import { useRecords } from './hooks/useRecords';
import { useFilters } from './hooks/useFilters';
import { useActivityLog } from './hooks/useActivityLog';
import { useUsers } from './hooks/useUsers';

import LoginPage from './components/LoginPage';
import Sidebar from './components/Sidebar';
import Toolbar from './components/Toolbar';
import RecordTable from './components/RecordTable';
import RecordForm from './components/RecordForm';
import EditModal from './components/EditModal';
import ActivityLog from './components/ActivityLog';
import ExpandedTableModal from './components/ExpandedTableModal';
import ToastContainer from './components/ToastContainer';
import UserManagement from './components/UserManagement';

function App() {
  const [view, setView] = useState('login');
  const [activeSection, setActiveSection] = useState('MC Master List');
  const [isTableExpanded, setIsTableExpanded] = useState(false);

  // ── Hooks ──────────────────────────────────────────────────────────────────
  const { toasts, showToast, dismissToast } = useToast();

  const {
    authToken,
    username, setUsername,
    loginPassword, setLoginPassword,
    apiError,
    isLoading,
    currentUser,
    isMc,
    login,
    logout,
  } = useAuth();

  const {
    records,
    isSaving,
    isLoadingRecords,
    recordForm, setRecordForm,
    formErrors, setFormErrors,
    formErrorMessage,
    editModal, setEditModal,
    editForm,
    editBaseline, setEditBaseline,
    editFormErrors, setEditFormErrors,
    editFormErrorMessage, setEditFormErrorMessage,
    handleFieldChange,
    handleEditFieldChange,
    previewCtrlNumbers,
    handleSaveRecord,
    handleOpenEdit,
    handleUpdateRecord,
    handleDeleteRecord,
    handleRemoveFile,
    handleExportPdf,
    handleExportCsv,
    handleExportExcel,
    refreshRecords,
  } = useRecords({ authToken, currentUser, isMc, showToast });

  const {
    search, setSearch,
    filterSection, setFilterSection,
    filterAction, setFilterAction,
    filterMonth, setFilterMonth,
    filterYear, setFilterYear,
    dateFrom, setDateFrom,
    dateTo, setDateTo,
    clearFilters,
    isFiltered,
    displayRecords,
  } = useFilters({ records, currentUser, isMc, activeSection });

  const {
    filteredActivityLogs,
    activityLogSearch, setActivityLogSearch,
    activityLogActionFilter, setActivityLogActionFilter,
    normalizeAuditAction,
  } = useActivityLog({ authToken, activeSection, showToast });
  const { users, isLoading: usersLoading, loadUsers, createUser, updateUser: updateUserItem, deleteUser } =
    useUsers({ authToken, showToast });
  // ── Nav items ──────────────────────────────────────────────────────────────
  const navItems = useMemo(() => {
    if (isMc) return MC_NAV_ITEMS;
    const label = currentUser?.section ? SECTION_LABELS[currentUser.section] : null;
    return label ? [label] : [];
  }, [isMc, currentUser]);

  // ── Auth handlers ──────────────────────────────────────────────────────────
  const handleLogin = () =>
    login((token, user, sectionDefaults) => {
      setView('dashboard');
      if (sectionDefaults?.activeSection) {
        setActiveSection(sectionDefaults.activeSection);
        setRecordForm((prev) => ({
          ...prev,
          section: sectionDefaults.section,
          fromValue: sectionDefaults.fromValue,
          concernedUnits: sectionDefaults.concernedUnits,
          receivedBy: sectionDefaults.receivedBy,
        }));
      }
    });

  const handleLogout = () => {
    logout();
    setView('login');
    setActiveSection('MC Master List');
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="app-shell">
      {view === 'login' ? (
        <LoginPage
          username={username}
          setUsername={setUsername}
          loginPassword={loginPassword}
          setLoginPassword={setLoginPassword}
          handleLogin={handleLogin}
          isLoading={isLoading}
          apiError={apiError}
        />
      ) : (
        <section className="dashboard" aria-label="Dashboard">
          <Sidebar
            navItems={navItems}
            activeSection={activeSection}
            setActiveSection={setActiveSection}
            isMc={isMc}
            currentUser={currentUser}
            handleLogout={handleLogout}
          />

          <main className="content">
            <Toolbar
              activeSection={activeSection}
              isMc={isMc}
              apiError={apiError}
              search={search} setSearch={setSearch}
              filterSection={filterSection} setFilterSection={setFilterSection}
              filterAction={filterAction} setFilterAction={setFilterAction}
              filterMonth={filterMonth} setFilterMonth={setFilterMonth}
              filterYear={filterYear} setFilterYear={setFilterYear}
              dateFrom={dateFrom} setDateFrom={setDateFrom}
              dateTo={dateTo} setDateTo={setDateTo}
              isFiltered={isFiltered}
              clearFilters={clearFilters}
              displayRecords={displayRecords}
              filterMonthForPdf={filterMonth}
              filterYearForPdf={filterYear}
              handleExportPdf={handleExportPdf}
              handleExportCsv={handleExportCsv}
              handleExportExcel={handleExportExcel}
              refreshRecords={refreshRecords}
              isLoadingRecords={isLoadingRecords}
              activityLogSearch={activityLogSearch}
              setActivityLogSearch={setActivityLogSearch}
              activityLogActionFilter={activityLogActionFilter}
              setActivityLogActionFilter={setActivityLogActionFilter}
            />

            <div className="content__body">
              {activeSection === 'User Management' ? (
                <UserManagement
                  users={users}
                  isLoading={usersLoading}
                  loadUsers={loadUsers}
                  createUser={createUser}
                  updateUser={updateUserItem}
                  deleteUser={deleteUser}
                  currentUser={currentUser}
                />
              ) : activeSection === 'Activity Log' ? (
                <ActivityLog
                  filteredActivityLogs={filteredActivityLogs}
                  activityLogSearch={activityLogSearch}
                  setActivityLogSearch={setActivityLogSearch}
                  activityLogActionFilter={activityLogActionFilter}
                  setActivityLogActionFilter={setActivityLogActionFilter}
                  normalizeAuditAction={normalizeAuditAction}
                />
              ) : (
                <>
                  <div className="tables">
                    <RecordTable
                      displayRecords={displayRecords}
                      activeSection={activeSection}
                      setIsTableExpanded={setIsTableExpanded}
                      handleOpenEdit={handleOpenEdit}
                      authToken={authToken}
                      isLoadingRecords={isLoadingRecords}
                    />
                  </div>

                  <RecordForm
                    isMc={isMc}
                    recordForm={recordForm}
                    setRecordForm={setRecordForm}
                    formErrors={formErrors}
                    setFormErrors={setFormErrors}
                    formErrorMessage={formErrorMessage}
                    handleFieldChange={handleFieldChange}
                    handleSaveRecord={handleSaveRecord}
                    previewCtrlNumbers={previewCtrlNumbers}
                    isSaving={isSaving}
                  />
                </>
              )}
            </div>
          </main>
        </section>
      )}

      {isTableExpanded && (
        <ExpandedTableModal
          displayRecords={displayRecords}
          activeSection={activeSection}
          setIsTableExpanded={setIsTableExpanded}
          handleOpenEdit={handleOpenEdit}
          authToken={authToken}
        />
      )}

      <EditModal
        isMc={isMc}
        editModal={editModal}
        setEditModal={setEditModal}
        editForm={editForm}
        editBaseline={editBaseline}
        setEditBaseline={setEditBaseline}
        editFormErrors={editFormErrors}
        setEditFormErrors={setEditFormErrors}
        editFormErrorMessage={editFormErrorMessage}
        setEditFormErrorMessage={setEditFormErrorMessage}
        handleEditFieldChange={handleEditFieldChange}
        handleUpdateRecord={handleUpdateRecord}
        handleDeleteRecord={handleDeleteRecord}
        handleRemoveFile={handleRemoveFile}
        isSaving={isSaving}
        authToken={authToken}
      />

      <ToastContainer toasts={toasts} dismissToast={dismissToast} />
    </div>
  );
}

export default App;
