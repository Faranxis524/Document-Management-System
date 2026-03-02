import { useState, useRef, useEffect, useMemo } from 'react';
import { SECTIONS } from '../constants';


const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

export default function Toolbar({
  activeSection,
  isMc,
  apiError,
  // search / filter state
  search, setSearch,
  filterSection, setFilterSection,
  filterAction, setFilterAction,
  filterStatus, setFilterStatus,
  filterMonth, setFilterMonth,
  filterYear, setFilterYear,
  dateFrom, setDateFrom,
  dateTo, setDateTo,
  isFiltered, clearFilters,
  // all (unfiltered) records — used to build the year dropdown
  records,
  // export handlers (receive displayRecords for PDF)
  displayRecords,
  totalRecords,
  filterMonthForPdf,
  filterYearForPdf,
  handleExportPdf,
  handleExportCsv,
  handleExportExcel,
  refreshRecords,
  isLoadingRecords,
  onNewRecord,
  // activity log filters
  activityLogSearch, setActivityLogSearch,
  activityLogActionFilter, setActivityLogActionFilter,
}) {
  const currentYear = new Date().getFullYear();
  // Build the year list from actual record data so it never goes stale.
  // Always includes the current year even if no records exist yet.
  const availableYears = useMemo(() => {
    const yearSet = new Set([String(currentYear)]);
    (records || []).forEach((r) => {
      const y = (r.dateReceived || '').slice(0, 4);
      if (y && /^\d{4}$/.test(y)) yearSet.add(y);
    });
    return Array.from(yearSet).sort((a, b) => Number(b) - Number(a)); // newest first
  }, [records, currentYear]);
  // Debounced search: display typed characters instantly, but delay state update to avoid
  // recomputing displayRecords on every keystroke.
  const [searchLocal, setSearchLocal] = useState(search);
  const debounceTimer = useRef(null);
  useEffect(() => { setSearchLocal(search); }, [search]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchLocal(val);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setSearch(val), 250);
  };

  if (activeSection === 'Activity Log') {
    return (
      <div className="toolbar">
        <div className="activity-log-toolbar">
          <span className="activity-log-toolbar__label">Search:</span>
          <input
            className="toolbar__input"
            placeholder="Search action or details"
            value={activityLogSearch}
            onChange={(e) => setActivityLogSearch(e.target.value)}
          />
          <span className="activity-log-toolbar__label">Action:</span>
          <select
            value={activityLogActionFilter}
            onChange={(e) => setActivityLogActionFilter(e.target.value)}
            className={activityLogActionFilter !== 'ALL' ? 'filter-active' : ''}
          >
            <option value="ALL">All</option>
            <option value="CREATE">Create</option>
            <option value="UPDATE">Update</option>
            <option value="DELETE">Delete</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div className="toolbar__filters">
          {apiError && <div className="form-panel__error">{apiError}</div>}
        </div>
      </div>
    );
  }

  const shownCount = displayRecords.length;
  const totalCount = totalRecords ?? shownCount;

  return (
    <div className="toolbar">

      {/* Row 1 — Search + Filters */}
      <div className="toolbar__row toolbar__row--main">
        <div className="toolbar__search-wrap">
          <input
            className="toolbar__input"
            placeholder="Search records…"
            value={searchLocal}
            onChange={handleSearchChange}
            title="Smart search: type freely, or prefix with ctrl: subject: from: by: status: unit: to target a specific field. Multiple terms are AND-coupled."
          />
          <span className="toolbar__count">
            {shownCount === totalCount
              ? `${totalCount} record${totalCount !== 1 ? 's' : ''}`
              : `${shownCount} of ${totalCount}`}
          </span>
        </div>

        {apiError && <div className="form-panel__error">{apiError}</div>}

        <select
          value={filterSection}
          onChange={(e) => setFilterSection(e.target.value)}
          className={filterSection !== 'ALL' ? 'filter-active' : ''}
        >
          <option value="ALL">All Sections</option>
          {SECTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className={filterAction !== 'ALL' ? 'filter-active' : ''}
        >
          <option value="ALL">All Actions</option>
          <option value="DRAFTED">Drafted</option>
          <option value="DISSEMINATED">Disseminated</option>
          <option value="FILED">Filed</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className={filterStatus !== 'ALL' ? 'filter-active' : ''}
        >
          <option value="ALL">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Overdue">Overdue</option>
          <option value="Completed">Completed</option>
        </select>

        <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
          <option value="">All Months</option>
          {MONTH_NAMES.map((name, i) => {
            const m = String(i + 1).padStart(2, '0');
            return <option key={m} value={m}>{name}</option>;
          })}
        </select>

        <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
          <option value="">All Years</option>
          {availableYears.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        <div className="toolbar__date">
          <label className="toolbar__date-label">
            From
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className={dateFrom ? 'filter-active' : ''}
            />
          </label>
          <label className="toolbar__date-label">
            To
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className={dateTo ? 'filter-active' : ''}
            />
          </label>
        </div>

        {isFiltered && (
          <button type="button" className="toolbar__clear-filters" onClick={clearFilters}>
            Clear Filters
          </button>
        )}
      </div>

      {/* Row 2 — Exports + Refresh */}
      <div className="toolbar__row toolbar__row--actions">
        <button type="button" className="toolbar__new-record" onClick={onNewRecord}>
          + New Record
        </button>
        <button type="button" className="toolbar__refresh" onClick={() => refreshRecords(true)} disabled={isLoadingRecords}>
          {isLoadingRecords ? 'Refreshing…' : 'Refresh'}
        </button>
        <div className="toolbar__exports">
          <button type="button" onClick={() => handleExportPdf(displayRecords, activeSection, filterMonthForPdf, filterYearForPdf)}>
            Export PDF
          </button>
          <button type="button" onClick={handleExportCsv}>
            Export CSV
          </button>
          <button type="button" onClick={handleExportExcel}>
            Export Excel
          </button>
        </div>
      </div>

    </div>
  );
}
