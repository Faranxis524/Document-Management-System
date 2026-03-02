import { useState, useEffect, useMemo } from 'react';
import { SECTION_LABELS } from '../constants';

// Supported field prefixes for smart search:
//   ctrl:<value>    — MC or Section control number
//   subject:<value> — document subject text
//   from:<value>    — sender / from field
//   by:<value>      — received by person
//   status:<value>  — record status (pending/overdue/completed)
//   unit:<value>    — concerned units
//   section:<value> — section code
// Multiple space-separated tokens are AND-coupled.
function matchesSearch(row, search) {
  if (!search || !search.trim()) return true;
  const tokens = search.trim().split(/\s+/).filter(Boolean);
  return tokens.every((token) => {
    const lower = token.toLowerCase();
    const prefixMatch = lower.match(/^(ctrl|subject|from|by|status|unit|section):(.+)$/);
    if (prefixMatch) {
      const [, field, val] = prefixMatch;
      switch (field) {
        case 'ctrl':
          return (row.mcCtrlNo || '').toLowerCase().includes(val) ||
                 (row.sectionCtrlNo || '').toLowerCase().includes(val);
        case 'subject':
          return (row.subjectText || '').toLowerCase().includes(val);
        case 'from':
          return (row.fromValue || '').toLowerCase().includes(val);
        case 'by':
          return (row.receivedBy || '').toLowerCase().includes(val);
        case 'status':
          return (row.status || '').toLowerCase().includes(val);
        case 'unit':
          return (row.concernedUnits || '').toLowerCase().includes(val);
        case 'section':
          return (row.section || '').toLowerCase().includes(val);
        default:
          return false;
      }
    }
    // Plain token — search across all relevant fields
    const hay = [
      row.mcCtrlNo, row.sectionCtrlNo, row.section,
      row.subjectText, row.fromValue, row.receivedBy,
      row.concernedUnits, row.actionTaken, row.status,
      row.remarks, row.dateSent, row.targetDate,
    ].filter(Boolean).join(' ').toLowerCase();
    return hay.includes(lower);
  });
}

export function useFilters({ records, currentUser, isMc, activeSection }) {
  const [search, setSearch] = useState(() => localStorage.getItem('dms_search') || '');
  const [filterSection, setFilterSection] = useState(() => localStorage.getItem('dms_filterSection') || 'ALL');
  const [filterAction, setFilterAction] = useState(() => localStorage.getItem('dms_filterAction') || 'ALL');
  const [filterStatus, setFilterStatus] = useState(() => localStorage.getItem('dms_filterStatus') || 'ALL');
  const [filterMonth, setFilterMonth] = useState(() => localStorage.getItem('dms_filterMonth') || '');
  const [filterYear, setFilterYear] = useState(() => localStorage.getItem('dms_filterYear') || '');
  const [dateFrom, setDateFrom] = useState(() => localStorage.getItem('dms_dateFrom') || '');
  const [dateTo, setDateTo] = useState(() => localStorage.getItem('dms_dateTo') || '');

  // Persist filters to localStorage
  useEffect(() => { localStorage.setItem('dms_search', search); }, [search]);
  useEffect(() => { localStorage.setItem('dms_filterSection', filterSection); }, [filterSection]);
  useEffect(() => { localStorage.setItem('dms_filterAction', filterAction); }, [filterAction]);
  useEffect(() => { localStorage.setItem('dms_filterStatus', filterStatus); }, [filterStatus]);
  useEffect(() => { localStorage.setItem('dms_filterMonth', filterMonth); }, [filterMonth]);
  useEffect(() => { localStorage.setItem('dms_filterYear', filterYear); }, [filterYear]);
  useEffect(() => { localStorage.setItem('dms_dateFrom', dateFrom); }, [dateFrom]);
  useEffect(() => { localStorage.setItem('dms_dateTo', dateTo); }, [dateTo]);

  const clearFilters = () => {
    setFilterAction('ALL');
    setFilterSection('ALL');
    setFilterStatus('ALL');
    setFilterMonth('');
    setFilterYear('');
    setDateFrom('');
    setDateTo('');
  };

  const isFiltered = filterAction !== 'ALL' || filterSection !== 'ALL' || filterStatus !== 'ALL' || filterMonth || filterYear || dateFrom || dateTo;

  const displayRecords = useMemo(() => {
    const activeSectionKey = Object.keys(SECTION_LABELS).find(
      (key) => SECTION_LABELS[key] === activeSection
    );

    return records.filter((row) => {
      if (!isMc && row.section !== currentUser?.section) return false;
      if (activeSection !== 'MC Master List' && activeSectionKey && row.section !== activeSectionKey) return false;
      if (activeSection === 'MC Master List' && filterSection !== 'ALL' && row.section !== filterSection) return false;
      if (filterAction !== 'ALL' && row.actionTaken !== filterAction) return false;
      if (filterStatus !== 'ALL' && (row.status || 'Pending') !== filterStatus) return false;
      if (filterMonth || filterYear) {
        const [year, month] = (row.dateReceived || '').split('-');
        if (filterYear && year !== filterYear) return false;
        if (filterMonth && month !== filterMonth) return false;
      }
      if (dateFrom && row.dateReceived < dateFrom) return false;
      if (dateTo && row.dateReceived > dateTo) return false;
      if (!matchesSearch(row, search)) return false;
      return true;
    });
  }, [records, isMc, currentUser, filterSection, filterAction, filterStatus, filterMonth, filterYear, dateFrom, dateTo, search, activeSection]);

  return {
    search, setSearch,
    filterSection, setFilterSection,
    filterAction, setFilterAction,
    filterStatus, setFilterStatus,
    filterMonth, setFilterMonth,
    filterYear, setFilterYear,
    dateFrom, setDateFrom,
    dateTo, setDateTo,
    clearFilters,
    isFiltered,
    displayRecords,
  };
}
