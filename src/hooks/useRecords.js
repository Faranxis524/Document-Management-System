import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  API_BASE,
  INITIAL_RECORD,
  DEFAULT_FROM,
  RECEIVED_BY,
  TABLE_COLUMNS,
  REPORT_SIGNATORIES,
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
  const handleSaveRecord = async () => {
    const errors = {};
    if (!recordForm.dateReceived) errors.dateReceived = 'Date received is required.';
    if (!recordForm.subjectText && !recordForm.subjectFile) errors.subjectText = 'Provide a subject or upload a document.';
    if (!recordForm.fromValue) errors.fromValue = 'From field is required.';
    if (recordForm.fromValue === 'User Input' && !recordForm.fromCustom) errors.fromValue = 'Please enter a custom from value.';
    if (!recordForm.targetDate) errors.targetDate = 'Target date is required.';
    if (!recordForm.receivedBy) errors.receivedBy = 'Received by is required.';
    if (!recordForm.concernedUnits) errors.concernedUnits = 'Concerned unit is required.';
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setFormErrorMessage('Please complete the required fields highlighted in red.');
      return;
    }

    setIsSaving(true);
    const apiFetch = makeApiFetch(authToken);
    try {
      const { subjectFile, fromCustom: _fcNew, ...payload } = recordForm;
      const resolvedFrom = recordForm.fromValue === 'User Input' ? recordForm.fromCustom : recordForm.fromValue;
      const created = await apiFetch('/records', {
        method: 'POST',
        body: JSON.stringify({ ...payload, fromValue: resolvedFrom, createdBy: currentUser.username }),
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
        section: isMc ? prev.section : currentUser.section,
        fromValue: DEFAULT_FROM[prev.section],
        concernedUnits: DEFAULT_FROM[prev.section],
      }));
      setFormErrors({});
      setFormErrorMessage('');
    } catch (error) {
      showToast('error', 'Save Failed', error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Open edit modal ────────────────────────────────────────────────────────
  const handleOpenEdit = (row) => {
    const flags = parseRemarksFlags(row.remarksText || row.remarks);
    const baseline = { ...row, ...flags, subjectFile: null };
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
    if (!editForm.concernedUnits) errors.concernedUnits = 'Concerned unit is required.';
    if (Object.keys(errors).length > 0) {
      setEditFormErrors(errors);
      setEditFormErrorMessage('Please complete the required edit fields highlighted in red.');
      return;
    }

    setIsSaving(true);
    setEditFormErrorMessage('');
    const apiFetch = makeApiFetch(authToken);
    try {
      const { subjectFile, fromCustom: _fcEdit, ...payload } = editForm;
      const resolvedEditFrom = editForm.fromValue === 'User Input' ? editForm.fromCustom : editForm.fromValue;
      const updated = await apiFetch(`/records/${editModal.recordId}`, {
        method: 'PUT',
        body: JSON.stringify({ ...payload, fromValue: resolvedEditFrom, updatedBy: currentUser.username, version: editForm.version }),
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
            const flags = parseRemarksFlags(fresh.remarksText || fresh.remarks);
            const baseline = { ...fresh, ...flags, subjectFile: null };
            setEditForm(baseline);
            setEditBaseline(baseline);
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
  const handleExportPdf = (displayRecords, activeSection, filterMonth, filterYear) => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(12);
    doc.text('CIDG RFU4A Message Center Master List', 14, 12);
    if (filterMonth || filterYear) {
      doc.setFontSize(9);
      doc.text(`Filtered by: ${filterMonth || 'All Months'} ${filterYear || 'All Years'}`, 14, 17);
    }
    const pdfColumns = TABLE_COLUMNS.filter((c) => c !== 'Status');
    autoTable(doc, {
      startY: filterMonth || filterYear ? 22 : 18,
      head: [pdfColumns],
      body: displayRecords.map((row) => [
        row.mcCtrlNo, row.sectionCtrlNo, row.section,
        toDisplayDate(row.dateReceived), row.subjectText,
        row.fromValue, toDisplayDate(row.targetDate) || row.targetDate,
        row.receivedBy, row.actionTaken, row.remarksText,
        row.concernedUnits, toDisplayDate(row.dateSent),
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [31, 76, 156] },
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const blockW = (pageWidth - margin * 2) / 3;
    let signY = (doc.lastAutoTable?.finalY || 24) + 20;
    if (signY > pageHeight - 26) { doc.addPage(); signY = 30; }
    doc.setFontSize(10);
    REPORT_SIGNATORIES.forEach((person, i) => {
      const x = margin + blockW * i;
      const x1 = x + 8, x2 = x + blockW - 8, cx = (x1 + x2) / 2;
      doc.line(x1, signY, x2, signY);
      doc.text(person.name, cx, signY + 6, { align: 'center' });
      doc.text(person.position, cx, signY + 12, { align: 'center' });
    });
    doc.save('records.pdf');
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
