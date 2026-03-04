import { useState, useEffect, useMemo } from 'react';
import { makeApiFetch } from '../utils';

// ─── Log display helpers ──────────────────────────────────────────────────────

function getActivityLogCategory(action) {
  const n = String(action || '').toLowerCase();
  if (n.includes('create') || n.includes('add')) return 'CREATE';
  if (n.includes('delete') || n.includes('remove')) return 'DELETE';
  if (n.includes('update') || n.includes('edit') || n.includes('modify')) return 'UPDATE';
  return 'OTHER';
}

function normalizeAuditAction(action) {
  const raw = String(action || '').trim();
  if (!raw) return '';
  const upper = raw.toUpperCase();
  // Fix historic typos that reached the database
  if (upper === 'DELTE' || upper === 'DELET' || upper === 'DELELTE') return 'DELETE';
  return upper;
}

function parseMaybeJson(value) {
  if (value == null || typeof value !== 'string') return null;
  const t = value.trim();
  if (!t || !(t.startsWith('{') || t.startsWith('['))) return null;
  try { return JSON.parse(t); } catch { return null; }
}

function toSingleLine(value) {
  if (value == null) return '';
  return String(value).replace(/\s+/g, ' ').trim();
}

function getRecordSnapshotFromLog(log) {
  const newObj = parseMaybeJson(log?.newValue);
  if (newObj && typeof newObj === 'object') return newObj;
  const oldObj = parseMaybeJson(log?.oldValue);
  if (oldObj && typeof oldObj === 'object') return oldObj;
  return null;
}

export function getLogSection(log) {
  if (log?.section) return toSingleLine(log.section);
  if (log?.fieldName === 'section') return toSingleLine(log?.newValue) || toSingleLine(log?.oldValue) || '';
  return getRecordSnapshotFromLog(log)?.section || '';
}

export function getLogSectionCtrlNo(log) {
  if (log?.sectionCtrlNo) return toSingleLine(log.sectionCtrlNo);
  if (log?.mcCtrlNo) return toSingleLine(log.mcCtrlNo);
  if (log?.fieldName === 'sectionCtrlNo') return toSingleLine(log?.newValue) || toSingleLine(log?.oldValue) || '';
  const snap = getRecordSnapshotFromLog(log);
  return snap?.sectionCtrlNo || snap?.mcCtrlNo || '';
}

export function getLogDetails(log) {
  const action = normalizeAuditAction(log?.action);
  const snapshot = getRecordSnapshotFromLog(log);
  const mcCtrlNo = snapshot?.mcCtrlNo ? toSingleLine(snapshot.mcCtrlNo) : '';
  const sectionCtrlNo = snapshot?.sectionCtrlNo ? toSingleLine(snapshot.sectionCtrlNo) : '';
  const ctrlNoPart = [mcCtrlNo, sectionCtrlNo].filter(Boolean).join(' / ');

  if (action === 'UPDATE' && log?.fieldName) {
    const ctrlNo = toSingleLine(log?.sectionCtrlNo || log?.mcCtrlNo || '');
    const old = toSingleLine(log?.oldValue) || '(empty)';
    const nv = toSingleLine(log?.newValue) || '(empty)';
    const prefix = ctrlNo ? `[${ctrlNo}] ` : '';
    return `${prefix}Updated ${log.fieldName} from "${old}" to "${nv}"`;
  }
  if (action === 'CREATE') return ctrlNoPart ? `Created record ${ctrlNoPart}` : 'Created record';
  if (action === 'DELETE') return ctrlNoPart ? `Deleted record ${ctrlNoPart}` : 'Deleted record';
  if (log?.fieldName) {
    const old = toSingleLine(log?.oldValue);
    const nv = toSingleLine(log?.newValue);
    const parts = [old && `from "${old}"`, nv && `to "${nv}"`].filter(Boolean).join(' ');
    return `Changed ${log.fieldName}${parts ? ` ${parts}` : ''}`;
  }
  return toSingleLine(log?.action) || 'Activity';
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useActivityLog({ authToken, activeSection, showToast }) {
  const [activityLogs, setActivityLogs] = useState([]);
  const [activityLogSearch, setActivityLogSearch] = useState('');
  const [activityLogActionFilter, setActivityLogActionFilter] = useState('ALL');

  const apiFetch = makeApiFetch(authToken);

  useEffect(() => {
    if (activeSection === 'Activity Log' && authToken) {
      loadActivityLogs();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, authToken]);

  const loadActivityLogs = async () => {
    try {
      const response = await apiFetch('/audit-logs?limit=500&offset=0');
      const raw = response.logs || [];

      // Build a map: recordId → best-known { section, sectionCtrlNo, mcCtrlNo }
      // Prefer data from columns; fall back to JSON snapshot in CREATE/DELETE payloads.
      const infoMap = {};
      for (const log of raw) {
        const id = log.recordId;
        if (!id) continue;
        if (infoMap[id]) continue; // already found for this record
        const s = log.section;
        const sc = log.sectionCtrlNo;
        const mc = log.mcCtrlNo;
        if (s || sc || mc) { infoMap[id] = { section: s, sectionCtrlNo: sc, mcCtrlNo: mc }; continue; }
        // Try to parse from JSON snapshot (CREATE newValue or DELETE oldValue)
        const snap = getRecordSnapshotFromLog(log);
        if (snap && (snap.section || snap.sectionCtrlNo || snap.mcCtrlNo)) {
          infoMap[id] = { section: snap.section, sectionCtrlNo: snap.sectionCtrlNo, mcCtrlNo: snap.mcCtrlNo };
        }
      }

      // Enrich any log that is still missing section/ctrlNo (e.g. old UPDATE rows)
      const enriched = raw.map((log) => {
        if (log.section || log.sectionCtrlNo || log.mcCtrlNo) return log;
        const info = infoMap[log.recordId];
        if (!info) return log;
        return { ...log, section: info.section || null, sectionCtrlNo: info.sectionCtrlNo || null, mcCtrlNo: info.mcCtrlNo || null };
      });

      setActivityLogs(enriched);
    } catch (error) {
      showToast('error', 'Error', `Failed to load activity logs: ${error.message}`);
    }
  };

  const filteredActivityLogs = useMemo(() => {
    const needle = activityLogSearch.trim().toLowerCase();
    return (activityLogs || []).filter((log) => {
      if (activityLogActionFilter !== 'ALL') {
        if (getActivityLogCategory(normalizeAuditAction(log.action)) !== activityLogActionFilter) return false;
      }
      if (!needle) return true;
      const hay = [
        log.action || '',
        log.performedBy || '',
        log.recordId || '',
        log.fieldName || '',
        getLogSection(log),
        getLogSectionCtrlNo(log),
        getLogDetails(log),
      ].join(' ').toLowerCase();
      return hay.includes(needle);
    });
  }, [activityLogs, activityLogSearch, activityLogActionFilter]);

  return {
    activityLogs,
    activityLogSearch, setActivityLogSearch,
    activityLogActionFilter, setActivityLogActionFilter,
    filteredActivityLogs,
    loadActivityLogs,
    normalizeAuditAction,
  };
}
