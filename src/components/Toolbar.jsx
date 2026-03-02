import { useState, useRef, useEffect } from 'react';
import { SECTIONS } from '../constants';
import { toDisplayDate, toIsoDate } from '../utils';

export default function Toolbar({
  activeSection,
  isMc,
  apiError,
  // search / filter state
  search, setSearch,
  filterSection, setFilterSection,
  filterAction, setFilterAction,
  filterMonth, setFilterMonth,
  filterYear, setFilterYear,
  dateFrom, setDateFrom,
  dateTo, setDateTo,
  isFiltered, clearFilters,
  // export handlers (receive displayRecords for PDF)
  displayRecords,
  filterMonthForPdf,
  filterYearForPdf,
  handleExportPdf,
  handleExportCsv,
  handleExportExcel,
  refreshRecords,
  isLoadingRecords,
  // activity log filters
  activityLogSearch, setActivityLogSearch,
  activityLogActionFilter, setActivityLogActionFilter,
}) {
  const currentYear = new Date().getFullYear();
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

  return (
    <div className="toolbar">
      <input
        className="toolbar__input"
        placeholder="Search..."
        value={searchLocal}
        onChange={handleSearchChange}
      />
      <div className="toolbar__filters">
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

        {isFiltered && (
          <button type="button" className="toolbar__clear-filters" onClick={clearFilters}>
            Clear Filters
          </button>
        )}

        <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
          <option value="">All Months</option>
          {Array.from({ length: 12 }).map((_, i) => {
            const m = String(i + 1).padStart(2, '0');
            return <option key={m} value={m}>{m}</option>;
          })}
        </select>

        <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
          <option value="">All Years</option>
          {Array.from({ length: 6 }).map((_, i) => {
            const y = String(currentYear - i);
            return <option key={y} value={y}>{y}</option>;
          })}
        </select>

        <div className="toolbar__date">
          <span>Date From</span>
          <input
            type="text"
            placeholder="MM/DD/YYYY"
            value={toDisplayDate(dateFrom)}
            onChange={(e) => setDateFrom(toIsoDate(e.target.value))}
          />
          <span>To</span>
          <input
            type="text"
            placeholder="MM/DD/YYYY"
            value={toDisplayDate(dateTo)}
            onChange={(e) => setDateTo(toIsoDate(e.target.value))}
          />
        </div>

        <button type="button" onClick={() => handleExportPdf(displayRecords, activeSection, filterMonthForPdf, filterYearForPdf)}>
          Export (PDF)
        </button>
        <button type="button" onClick={handleExportCsv}>
          Export (CSV)
        </button>
        <button type="button" onClick={handleExportExcel}>
          Export (Excel)
        </button>
        <button type="button" onClick={() => refreshRecords(true)} disabled={isLoadingRecords}>
          {isLoadingRecords ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
    </div>
  );
}
