import { useState, useEffect, useMemo } from 'react';
import { SECTION_LABELS } from '../constants';

export function useFilters({ records, currentUser, isMc, activeSection }) {
  const [search, setSearch] = useState(() => localStorage.getItem('dms_search') || '');
  const [filterSection, setFilterSection] = useState(() => localStorage.getItem('dms_filterSection') || 'ALL');
  const [filterAction, setFilterAction] = useState(() => localStorage.getItem('dms_filterAction') || 'ALL');
  const [filterMonth, setFilterMonth] = useState(() => localStorage.getItem('dms_filterMonth') || '');
  const [filterYear, setFilterYear] = useState(() => localStorage.getItem('dms_filterYear') || '');
  const [dateFrom, setDateFrom] = useState(() => localStorage.getItem('dms_dateFrom') || '');
  const [dateTo, setDateTo] = useState(() => localStorage.getItem('dms_dateTo') || '');

  // Persist filters to localStorage
  useEffect(() => { localStorage.setItem('dms_search', search); }, [search]);
  useEffect(() => { localStorage.setItem('dms_filterSection', filterSection); }, [filterSection]);
  useEffect(() => { localStorage.setItem('dms_filterAction', filterAction); }, [filterAction]);
  useEffect(() => { localStorage.setItem('dms_filterMonth', filterMonth); }, [filterMonth]);
  useEffect(() => { localStorage.setItem('dms_filterYear', filterYear); }, [filterYear]);
  useEffect(() => { localStorage.setItem('dms_dateFrom', dateFrom); }, [dateFrom]);
  useEffect(() => { localStorage.setItem('dms_dateTo', dateTo); }, [dateTo]);

  const clearFilters = () => {
    setSearch('');
    setFilterAction('ALL');
    setFilterSection('ALL');
    setFilterMonth('');
    setFilterYear('');
    setDateFrom('');
    setDateTo('');
  };

  const isFiltered = filterAction !== 'ALL' || filterSection !== 'ALL' || filterMonth || filterYear || dateFrom || dateTo;

  const displayRecords = useMemo(() => {
    const activeSectionKey = Object.keys(SECTION_LABELS).find(
      (key) => SECTION_LABELS[key] === activeSection
    );

    return records.filter((row) => {
      if (!isMc && row.section !== currentUser?.section) return false;
      if (activeSection !== 'MC Master List' && activeSectionKey && row.section !== activeSectionKey) return false;
      if (activeSection === 'MC Master List' && filterSection !== 'ALL' && row.section !== filterSection) return false;
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
        const hay = `${row.mcCtrlNo} ${row.sectionCtrlNo} ${row.subjectText} ${row.fromValue} ${row.receivedBy} ${row.concernedUnits} ${row.actionTaken} ${row.status}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [records, isMc, currentUser, filterSection, filterAction, filterMonth, filterYear, dateFrom, dateTo, search, activeSection]);

  return {
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
  };
}
