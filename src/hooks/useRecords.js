import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import cidgLogo from '../assets/logo.png';
import {
  API_BASE,
  INITIAL_RECORD,
  DEFAULT_FROM,
  RECEIVED_BY,
  TABLE_COLUMNS,
  REPORT_SIGNATORIES,
  getFromOptions,
  parseSections,
} from '../constants';
import { makeApiFetch, isUsableRecord, parseRemarksFlags, toDisplayDate } from '../utils';

function compareRecords(a, b) {
  const da = a?.dateReceived || '';
  const db = b?.dateReceived || '';
  const byDate = da.localeCompare(db);
  if (byDate !== 0) return byDate;
  const ia = Number.isFinite(Number(a?.id)) ? Number(a.id) : 0;
  const ib = Number.isFinite(Number(b?.id)) ? Number(b.id) : 0;
  return ia - ib;
}

function sortRecords(list) {
  return Array.isArray(list) ? [...list].sort(compareRecords) : [];
}

export function useRecords({ authToken, currentUser, isMc, showToast }) {
  const [records, setRecords] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);

  // ── Create form ────────────────────────────────────────────────────────────
  const [recordForm, setRecordForm] = useState(INITIAL_RECORD);
  const [formErrors, setFormErrors] = useState({});
  const [formErrorMessage, setFormErrorMessage] = useState('');

  // ── Edit modal state ───────────────────────────────────────────────────────
  const [editModal, setEditModal] = useState({ open: false, recordId: null });
  const [editForm, setEditForm] = useState(INITIAL_RECORD);
  const [editBaseline, setEditBaseline] = useState(null);
  const [editFormErrors, setEditFormErrors] = useState({});
  const [editFormErrorMessage, setEditFormErrorMessage] = useState('');

  const refreshRecords = useCallback(
    async (showFeedback = false) => {
      if (!authToken) {
        setRecords([]);
        return;
      }
      setIsLoadingRecords(true);
      try {
        const data = await makeApiFetch(authToken)('/records');
        setRecords(sortRecords(data.records || []));
        if (showFeedback) {
          showToast('info', 'Records Refreshed', 'Table has been updated from server.');
        }
      } catch (error) {
        if (showFeedback) {
          showToast('error', 'Refresh Failed', error.message);
        }
      } finally {
        setIsLoadingRecords(false);
      }
    },
    [authToken, showToast]
  );

  // ── Ensure Received By is a real value ────────────────────────────────────
  // The <select> will *display* the first option even if state is "".
  // But validation checks state, so we must initialize it.
  useEffect(() => {
    const opts = RECEIVED_BY[recordForm.section] || [];
    if (!recordForm.receivedBy && opts.length > 0) {
      setRecordForm((prev) => (prev.receivedBy ? prev : { ...prev, receivedBy: opts[0] }));
      setFormErrors((prev) => {
        const { receivedBy: _rb, ...rest } = prev;
        return rest;
      });
      setFormErrorMessage('');
    }
  }, [recordForm.section, recordForm.receivedBy]);

  // ── Load records on login ──────────────────────────────────────────────────
  useEffect(() => {
    refreshRecords(false);
  }, [refreshRecords]);

  // ── Real-time socket ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!authToken) return;

    const socket = io(API_BASE, {
      auth: { token: authToken },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socket.on('record_created', (newRecord) => {
      if (newRecord._actionBy === currentUser?.username) return;
      setRecords((prev) => {
        if (prev.some((r) => r.id === newRecord.id)) return prev;
        const actor = newRecord._actionBy || 'another user';
        showToast('success', 'New Record', `${newRecord.mcCtrlNo} was created by ${actor}`);
        return sortRecords([...prev, newRecord]);
      });
    });

    socket.on('record_updated', (updated) => {
      const isOwn = updated._actionBy === currentUser?.username;
      setRecords((prev) => {
        const next = sortRecords(prev.map((r) => (r.id === updated.id ? updated : r)));
        if (!isOwn) {
          const actor = updated._actionBy || 'another user';
          showToast('info', 'Record Updated', `${updated.mcCtrlNo} was modified by ${actor}`);
        }
        return next;
      });
    });

    socket.on('record_deleted', ({ id, _actionBy }) => {
      if (_actionBy === currentUser?.username) return;
      setRecords((prev) => {
        const deleted = prev.find((r) => r.id === id);
        if (deleted) {
          const actor = _actionBy || 'another user';
          showToast('warning', 'Record Deleted', `${deleted.mcCtrlNo || 'Record'} was removed by ${actor}`);
        }
        return prev.filter((r) => r.id !== id);
      });
    });

    return () => socket.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  // ── Field change helpers ───────────────────────────────────────────────────
  const clearFieldError = (field) =>
    setFormErrors((prev) => { const { [field]: _, ...rest } = prev; return rest; });

  const clearEditFieldError = (field) =>
    setEditFormErrors((prev) => { const { [field]: _, ...rest } = prev; return rest; });

  const handleFieldChange = (field, value) => {
    setRecordForm((prev) => ({ ...prev, [field]: value }));
    clearFieldError(field);
    setFormErrorMessage('');
  };

  const handleEditFieldChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
    clearEditFieldError(field);
    setEditFormErrorMessage('');
  };

  // ── Preview control numbers ────────────────────────────────────────────────
  const previewCtrlNumbers = async (dateReceived, section) => {
    if (!dateReceived || !section || !authToken) return;
    try {
      const preview = await makeApiFetch(authToken)('/control-numbers/preview', {
        method: 'POST',
        body: JSON.stringify({ section, dateReceived }),
      });
      setRecordForm((prev) => ({
        ...prev,
        mcCtrlNo: preview.mcCtrlNo,
        sectionCtrlNo: preview.sectionCtrlNo,
        section,
        dateReceived,
        // Only reset fromValue if the user hasn't manually chosen something
        fromValue: prev.section !== section ? DEFAULT_FROM[section] : prev.fromValue,
        fromCustom: prev.section !== section ? '' : prev.fromCustom,
        concernedUnits: prev.section !== section ? DEFAULT_FROM[section] : prev.concernedUnits,
        concernedUnitsCustom: prev.section !== section ? '' : prev.concernedUnitsCustom,
        receivedBy: prev.section !== section ? (RECEIVED_BY[section]?.[0] || '') : prev.receivedBy,
      }));
      setFormErrors((prev) => {
        const { mcCtrlNo: _mc, sectionCtrlNo: _sec, dateReceived: _dt, ...rest } = prev;
        return rest;
      });
      setFormErrorMessage('');
    } catch {
      // ignore preview errors silently
    }
  };

  // ── Create record ──────────────────────────────────────────────────────────
  const handleSaveRecord = async (onSuccess) => {
    const errors = {};
    if (!recordForm.dateReceived) errors.dateReceived = 'Date received is required.';
    if (!recordForm.subjectText && !recordForm.subjectFile) errors.subjectText = 'Provide a subject or upload a document.';
    if (!recordForm.fromValue) errors.fromValue = 'From field is required.';
    if (recordForm.fromValue === 'User Input' && !recordForm.fromCustom) errors.fromValue = 'Please enter a custom from value.';
    if (!recordForm.targetDate) errors.targetDate = 'Target date is required.';
    if (!recordForm.receivedBy) errors.receivedBy = 'Received by is required.';
    if (recordForm.receivedBy === 'User Input' && !recordForm.receivedByCustom) errors.receivedBy = 'Please enter a name for received by.';
    if (recordForm.actionTaken === 'User Input' && !recordForm.actionTakenCustom) errors.actionTaken = 'Please enter a custom action taken value.';
    if (!recordForm.concernedUnits) errors.concernedUnits = 'Concerned unit is required.';
    if (recordForm.concernedUnits === 'User Input' && !recordForm.concernedUnitsCustom) errors.concernedUnits = 'Please enter a custom concerned unit value.';
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setFormErrorMessage('Please complete the required fields highlighted in red.');
      return;
    }

    setIsSaving(true);
    const apiFetch = makeApiFetch(authToken);
    try {
      // ── Duplicate detection ──────────────────────────────────────────────
      try {
        const params = new URLSearchParams();
        if (recordForm.subjectText) params.append('subjectText', recordForm.subjectText.trim());
        if (recordForm.fromValue) params.append('fromValue', recordForm.fromValue);
        if (recordForm.dateReceived) params.append('dateReceived', recordForm.dateReceived);
        if (recordForm.section) params.append('section', recordForm.section);
        const dupResult = await apiFetch(`/records/check-duplicate?${params.toString()}`);
        if (dupResult.hasDuplicates && dupResult.matches.length > 0) {
          const matchLines = dupResult.matches
            .map((m) => `  • ${m.mcCtrlNo || `ID ${m.id}`} — "${m.subjectText}" (${m.dateReceived})`)
            .join('\n');
          const proceed = window.confirm(
            `⚠️ Possible Duplicate Detected!\n\nAn existing record with the same subject was found:\n${matchLines}\n\nDo you still want to save this record?`
          );
          if (!proceed) {
            setIsSaving(false);
            return;
          }
        }
      } catch {
        // Duplicate-check errors are non-fatal — proceed with save
      }
      // ── End duplicate detection ──────────────────────────────────────────

      const { subjectFile, fromCustom: _fcNew, concernedUnitsCustom: _cucNew, receivedByCustom: _rbcNew, actionTakenCustom: _atcNew, dateSentMode: _dsmNew, ...payload } = recordForm;
      const resolvedFrom = recordForm.fromValue === 'User Input' ? recordForm.fromCustom : recordForm.fromValue;
      const resolvedConcernedUnits = recordForm.concernedUnits === 'User Input' ? recordForm.concernedUnitsCustom : recordForm.concernedUnits;
      const resolvedReceivedBy = recordForm.receivedBy === 'User Input' ? recordForm.receivedByCustom : recordForm.receivedBy;
      const resolvedActionTaken = recordForm.actionTaken === 'User Input' ? recordForm.actionTakenCustom : recordForm.actionTaken;
      const created = await apiFetch('/records', {
        method: 'POST',
        body: JSON.stringify({ ...payload, fromValue: resolvedFrom, concernedUnits: resolvedConcernedUnits, receivedBy: resolvedReceivedBy, actionTaken: resolvedActionTaken, createdBy: currentUser.username }),
      });
      setRecords((prev) => sortRecords([...prev, created]));
      showToast('success', 'Record Saved', `${created.mcCtrlNo} was created`);

      if (subjectFile) {
        const formData = new FormData();
        formData.append('file', subjectFile);
        try {
          const saved = await apiFetch(`/records/${created.id}/upload`, { method: 'POST', body: formData });
          if (isUsableRecord(saved)) setRecords((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
        } catch (uploadErr) {
          showToast('warning', 'Upload Warning', `Record saved, but file upload failed: ${uploadErr.message}`);
        }
      }

      setRecordForm((prev) => ({
        ...INITIAL_RECORD,
        section: isMc ? prev.section : (parseSections(currentUser.section)[0] || prev.section),
        fromValue: DEFAULT_FROM[prev.section],
        concernedUnits: DEFAULT_FROM[prev.section],
      }));
      setFormErrors({});
      setFormErrorMessage('');
      onSuccess?.();
    } catch (error) {
      showToast('error', 'Save Failed', error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Open edit modal ────────────────────────────────────────────────────────
  const handleOpenEdit = (row) => {
    const flags = parseRemarksFlags(row.remarksText || row.remarks);
    const opts = getFromOptions(row.section);
    const knownActions = ['DRAFTED', 'DISSEMINATED', 'FILED'];

    const fromInOpts = opts.filter((o) => o !== 'User Input').includes(row.fromValue);
    const receivedInOpts = (RECEIVED_BY[row.section] || []).includes(row.receivedBy);
    const concernedInOpts = opts.filter((o) => o !== 'User Input').includes(row.concernedUnits);
    const actionInOpts = knownActions.includes(row.actionTaken);
    const isDatePattern = /^\d{4}-\d{2}-\d{2}$/.test(row.targetDate || '');
    const isSentDatePattern = /^\d{4}-\d{2}-\d{2}$/.test(row.dateSent || '');

    const baseline = {
      ...row,
      ...flags,
      subjectFile: null,
      fromValue: fromInOpts ? row.fromValue : 'User Input',
      fromCustom: fromInOpts ? '' : (row.fromValue || ''),
      receivedBy: receivedInOpts ? row.receivedBy : 'User Input',
      receivedByCustom: receivedInOpts ? '' : (row.receivedBy || ''),
      concernedUnits: concernedInOpts ? row.concernedUnits : 'User Input',
      concernedUnitsCustom: concernedInOpts ? '' : (row.concernedUnits || ''),
      actionTaken: actionInOpts ? row.actionTaken : 'User Input',
      actionTakenCustom: actionInOpts ? '' : (row.actionTaken || ''),
      targetDateMode: isDatePattern ? 'DATE' : 'TEXT',
      dateSentMode: row.dateSent ? (isSentDatePattern ? 'DATE' : 'TEXT') : 'DATE',
    };
    setEditForm(baseline);
    setEditBaseline(baseline);
    setEditFormErrors({});
    setEditFormErrorMessage('');
    setEditModal({ open: true, recordId: row.id });
  };

  // ── Update record ──────────────────────────────────────────────────────────
  const handleUpdateRecord = async () => {
    if (!editModal.recordId) return;
    const errors = {};
    if (!editForm.dateReceived) errors.dateReceived = 'Date received is required.';
    if (!editForm.subjectText && !editForm.subjectFile) errors.subjectText = 'Provide a subject or upload a document.';
    if (!editForm.fromValue) errors.fromValue = 'From field is required.';
    if (editForm.fromValue === 'User Input' && !editForm.fromCustom) errors.fromValue = 'Please enter a custom from value.';
    if (!editForm.targetDate) errors.targetDate = 'Target date is required.';
    if (!editForm.receivedBy) errors.receivedBy = 'Received by is required.';
    if (editForm.receivedBy === 'User Input' && !editForm.receivedByCustom) errors.receivedBy = 'Please enter a name for received by.';
    if (editForm.actionTaken === 'User Input' && !editForm.actionTakenCustom) errors.actionTaken = 'Please enter a custom action taken value.';
    if (!editForm.concernedUnits) errors.concernedUnits = 'Concerned unit is required.';
    if (editForm.concernedUnits === 'User Input' && !editForm.concernedUnitsCustom) errors.concernedUnits = 'Please enter a custom concerned unit value.';
    if (Object.keys(errors).length > 0) {
      setEditFormErrors(errors);
      setEditFormErrorMessage('Please complete the required edit fields highlighted in red.');
      return;
    }

    setIsSaving(true);
    setEditFormErrorMessage('');
    const apiFetch = makeApiFetch(authToken);
    try {
      const { subjectFile, fromCustom: _fcEdit, actionTakenCustom: _atcEdit, receivedByCustom: _rbcEdit, concernedUnitsCustom: _cucEdit, targetDateMode: _tdmEdit, dateSentMode: _dsmEdit, ...payload } = editForm;
      const resolvedEditFrom = editForm.fromValue === 'User Input' ? editForm.fromCustom : editForm.fromValue;
      const resolvedEditActionTaken = editForm.actionTaken === 'User Input' ? (editForm.actionTakenCustom || '') : editForm.actionTaken;
      const resolvedEditReceivedBy = editForm.receivedBy === 'User Input' ? (editForm.receivedByCustom || '') : editForm.receivedBy;
      const resolvedEditConcernedUnits = editForm.concernedUnits === 'User Input' ? (editForm.concernedUnitsCustom || '') : editForm.concernedUnits;
      const updated = await apiFetch(`/records/${editModal.recordId}`, {
        method: 'PUT',
        body: JSON.stringify({ ...payload, fromValue: resolvedEditFrom, actionTaken: resolvedEditActionTaken, receivedBy: resolvedEditReceivedBy, concernedUnits: resolvedEditConcernedUnits, updatedBy: currentUser.username, version: editForm.version }),
      });
      setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));

      if (subjectFile) {
        const formData = new FormData();
        formData.append('file', subjectFile);
        try {
          const next = await apiFetch(`/records/${editModal.recordId}/upload`, { method: 'POST', body: formData });
          if (isUsableRecord(next)) setRecords((prev) => prev.map((r) => (r.id === next.id ? next : r)));
        } catch (uploadErr) {
          showToast('warning', 'Upload Warning', `Record updated, but file upload failed: ${uploadErr.message}`);
        }
      }

      setEditFormErrors({});
      setEditModal({ open: false, recordId: null });
      setEditBaseline(null);
    } catch (error) {
      if (error.message.includes('modified by another user') || error.message.includes('VERSION_CONFLICT')) {
        const ok = window.confirm(
          'Conflict Detected!\n\nThis record was modified by another user.\n\nClick OK to reload the latest version.\nClick Cancel to close without saving.'
        );
        if (ok) {
          try {
            const fresh = await apiFetch(`/records/${editModal.recordId}`);
            handleOpenEdit(fresh);
            showToast('info', 'Record Refreshed', 'Please review and save again.');
          } catch (refreshErr) {
            showToast('error', 'Refresh Failed', refreshErr.message);
            setEditModal({ open: false, recordId: null });
            setEditBaseline(null);
          }
        } else {
          setEditModal({ open: false, recordId: null });
          setEditBaseline(null);
        }
      } else {
        showToast('error', 'Update Failed', error.message);
        setEditFormErrorMessage('Unable to update record right now. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  // ── Delete record ──────────────────────────────────────────────────────────
  const handleDeleteRecord = async () => {
    if (!editModal.recordId) return;
    if (!window.confirm('Are you sure you want to delete this record? This action cannot be undone.')) return;
    setIsSaving(true);
    setEditFormErrorMessage('');
    try {
      await makeApiFetch(authToken)(`/records/${editModal.recordId}`, { method: 'DELETE' });
      setRecords((prev) => prev.filter((r) => r.id !== editModal.recordId));
      setEditModal({ open: false, recordId: null });
      setEditBaseline(null);
      showToast('success', 'Record Deleted', 'The record has been removed.');
    } catch (error) {
      showToast('error', 'Delete Failed', error.message);
      setEditFormErrorMessage('Unable to delete record right now. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Remove uploaded file ───────────────────────────────────────────────────
  const handleRemoveFile = async () => {
    if (!editModal.recordId) return;
    if (!window.confirm('Are you sure you want to remove this file? This action cannot be undone.')) return;
    setIsSaving(true);
    try {
      await makeApiFetch(authToken)(`/records/${editModal.recordId}/file`, { method: 'DELETE' });
      const updated = { ...editForm, subjectFileUrl: null };
      setEditForm(updated);
      setEditBaseline(updated);
      setRecords((prev) => prev.map((r) => (r.id === editModal.recordId ? updated : r)));
    } catch (error) {
      showToast('error', 'Remove File Failed', error.message);
      setEditFormErrorMessage('Unable to remove file. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Export PDF (client-side) ───────────────────────────────────────────────
  // jsPDF's built-in Helvetica only supports Latin-1. Any combining Unicode chars
  // (accents, diacritics, etc.) cause it to fall back to character-by-character rendering.
  // Normalize + strip combining marks so text renders cleanly.
  const pdfSafe = (val) => {
    if (!val) return '';
    return String(val)
      .normalize('NFD')                        // decompose é → e + ́
      .replace(/[\u0300-\u036f]/g, '')         // strip combining diacritical marks
      // eslint-disable-next-line no-control-regex
      .replace(/[^\u0000-\u00FF]/g, '?');          // replace remaining non-latin1 with ?
  };

  const handleExportPdf = (displayRecords, activeSection, filterMonth, filterYear) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW  = doc.internal.pageSize.getWidth();   // 297 mm
    const pageH  = doc.internal.pageSize.getHeight();  // 210 mm
    const margin = 12;
    const contentW = pageW - margin * 2;

    // ── Design tokens ────────────────────────────────────────────────────────
    const NAVY      = [27,  79, 138];
    const NAVY_DARK = [15,  50, 100];
    const NAVY_LITE = [235, 241, 255];
    const GRAY_MID  = [110, 110, 110];
    const GRAY_DARK = [40,  40,  40];
    const WHITE     = [255, 255, 255];

    // ── Helpers ───────────────────────────────────────────────────────────────
    const MONTH_NAMES = ['','January','February','March','April','May','June',
                         'July','August','September','October','November','December'];
    const monthLabel  = filterMonth ? (MONTH_NAMES[parseInt(filterMonth, 10)] || filterMonth) : '';
    const periodStr   = [monthLabel, filterYear].filter(Boolean).join(' ') || 'All Records';
    const sectionTitle =
      activeSection === 'MC Master List' ? 'ALL SECTIONS' :
      activeSection ? activeSection.toUpperCase() : 'ALL SECTIONS';

    // ── Per-page header ───────────────────────────────────────────────────────
    const drawHeader = (pageNum, totalPages) => {
      // Logo
      try { doc.addImage(cidgLogo, 'PNG', margin, 5, 22, 22); } catch (_) {}

      // Government text hierarchy — centered
      const cx = pageW / 2;
      doc.setTextColor(...GRAY_MID);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.text('Republic of the Philippines', cx, 8.5, { align: 'center' });
      doc.text('Department of the Interior and Local Government', cx, 12, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...NAVY);
      doc.text('PHILIPPINE NATIONAL POLICE', cx, 16.5, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...GRAY_DARK);
      doc.text('Criminal Investigation and Detection Group', cx, 21, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...NAVY);
      doc.text('REGIONAL FIELD UNIT 4A', cx, 25.5, { align: 'center' });

      // Thick navy divider
      doc.setDrawColor(...NAVY);
      doc.setLineWidth(0.8);
      doc.line(margin, 29, pageW - margin, 29);

      // Title banner
      doc.setFillColor(...NAVY);
      doc.rect(margin, 30, contentW, 9, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(...WHITE);
      doc.text('MESSAGE CENTER MASTER LIST OF COMMUNICATIONS', cx, 36, { align: 'center' });

      // Info strip
      doc.setFillColor(243, 246, 255);
      doc.rect(margin, 39, contentW, 6.5, 'F');
      doc.setDrawColor(190, 205, 230);
      doc.setLineWidth(0.25);
      doc.rect(margin, 39, contentW, 6.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...GRAY_DARK);
      doc.text(`Section: ${sectionTitle}`, margin + 3, 43.5);
      doc.text(`Period: ${periodStr}`, cx, 43.5, { align: 'center' });
      doc.text(`Page ${pageNum} of ${totalPages}`, pageW - margin - 3, 43.5, { align: 'right' });
    };

    // ── Per-page footer ───────────────────────────────────────────────────────
    const drawFooter = () => {
      const fy = pageH - 5.5;
      doc.setDrawColor(...NAVY);
      doc.setLineWidth(0.3);
      doc.line(margin, fy - 2, pageW - margin, fy - 2);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(6);
      doc.setTextColor(...GRAY_MID);
      const now = new Date();
      const generated = now.toLocaleString('en-PH', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      doc.text('FOR OFFICIAL USE ONLY', margin, fy);
      doc.text(`Generated: ${generated}`, pageW - margin, fy, { align: 'right' });
    };

    // ── Table ─────────────────────────────────────────────────────────────────
    const pdfColumns = TABLE_COLUMNS.filter((c) => c !== 'Status');
    autoTable(doc, {
      startY: 47,
      margin: { left: margin, right: margin, bottom: 12 },
      head: [pdfColumns],
      body: displayRecords.map((row) => [
        pdfSafe(row.mcCtrlNo),
        pdfSafe(row.sectionCtrlNo),
        pdfSafe(row.section),
        pdfSafe(toDisplayDate(row.dateReceived)),
        pdfSafe(row.subjectText),
        pdfSafe(row.fromValue),
        pdfSafe(toDisplayDate(row.targetDate) || row.targetDate),
        pdfSafe(row.receivedBy),
        pdfSafe(row.actionTaken),
        pdfSafe(row.remarksText),
        pdfSafe(row.concernedUnits),
        pdfSafe(toDisplayDate(row.dateSent)),
      ]),
      styles: {
        fontSize: 6.8,
        cellPadding: { top: 2, bottom: 2, left: 1.8, right: 1.8 },
        overflow: 'linebreak',
        valign: 'top',
        textColor: GRAY_DARK,
        lineColor: [200, 212, 232],
        lineWidth: 0.15,
      },
      headStyles: {
        fillColor: NAVY,
        textColor: WHITE,
        fontStyle: 'bold',
        fontSize: 7,
        halign: 'center',
        valign: 'middle',
        lineColor: NAVY_DARK,
        lineWidth: 0.3,
        cellPadding: { top: 2.5, bottom: 2.5, left: 1.8, right: 1.8 },
      },
      alternateRowStyles: { fillColor: NAVY_LITE },
      columnStyles: {
        0:  { cellWidth: 26, halign: 'center' },
        1:  { cellWidth: 26, halign: 'center' },
        2:  { cellWidth: 11, halign: 'center' },
        3:  { cellWidth: 18, halign: 'center' },
        4:  { cellWidth: 58 },
        5:  { cellWidth: 17, halign: 'center' },
        6:  { cellWidth: 18, halign: 'center' },
        7:  { cellWidth: 18, halign: 'center' },
        8:  { cellWidth: 18, halign: 'center' },
        9:  { cellWidth: 20 },
        10: { cellWidth: 20, halign: 'center' },
        11: { cellWidth: 18, halign: 'center' },
      },
      didDrawPage: (data) => {
        drawHeader(data.pageNumber, data.pageCount);
        drawFooter();
      },
    });

    // ── Signatory block ───────────────────────────────────────────────────────
    const blockW  = contentW / 3;
    let   signY   = (doc.lastAutoTable?.finalY || 50) + 12;
    const needsNewPage = signY > pageH - 42;
    if (needsNewPage) {
      doc.addPage();
      signY = 20;
      const tp = doc.internal.getNumberOfPages();
      drawHeader(tp, tp);
      drawFooter();
    }

    const SIGN_LABELS = ['Prepared by:', 'Noted by:', 'Approved by:'];
    REPORT_SIGNATORIES.forEach((person, i) => {
      const bx  = margin + blockW * i;
      const bcx = bx + blockW / 2;

      // Label
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...NAVY);
      doc.text(SIGN_LABELS[i], bx + 4, signY + 2);

      // Signature line
      const lineY = signY + 15;
      doc.setDrawColor(...GRAY_MID);
      doc.setLineWidth(0.35);
      doc.line(bx + 6, lineY, bx + blockW - 6, lineY);

      // Name
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...GRAY_DARK);
      doc.text(pdfSafe(person.name) || '________________________________', bcx, lineY + 5, { align: 'center' });

      // Position
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(...GRAY_MID);
      doc.text(pdfSafe(person.position), bcx, lineY + 10, { align: 'center' });
    });

    // Record count note
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.5);
    doc.setTextColor(...GRAY_MID);
    doc.text(`Total records: ${displayRecords.length}`, margin, signY + 32);

    const fileName = `DMS_Records_${periodStr.replace(/\s+/g, '_')}.pdf`;
    doc.save(fileName);
  };

  // ── Export CSV/Excel (server-side) ─────────────────────────────────────────
  async function downloadBlob(url, method, body, filename) {
    const response = await fetch(`${API_BASE}${url}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error('Export failed');
    const blob = await response.blob();
    const href = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(href);
  }

  const handleExportCsv = async () => {
    try {
      await downloadBlob('/export/csv', 'POST', { section: isMc ? null : currentUser.section }, 'records.csv');
      showToast('success', 'Export Complete', 'CSV file downloaded successfully');
    } catch (error) { showToast('error', 'Export Failed', error.message); }
  };

  const handleExportExcel = async () => {
    try {
      await downloadBlob('/export', 'POST', { section: isMc ? null : currentUser.section }, 'records.xlsx');
      showToast('success', 'Export Complete', 'Excel file downloaded successfully');
    } catch (error) { showToast('error', 'Export Failed', error.message); }
  };

  return {
    records, setRecords,
    isSaving,
    isLoadingRecords,
    recordForm, setRecordForm,
    formErrors, setFormErrors,
    formErrorMessage, setFormErrorMessage,
    editModal, setEditModal,
    editForm, setEditForm,
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
  };
}
