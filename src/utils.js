import { API_BASE } from './constants';

// ─── URL helpers ─────────────────────────────────────────────────────────────

export function resolveFileUrl(fileUrl) {
  if (!fileUrl) return '';
  if (/^https?:\/\//i.test(fileUrl)) return fileUrl;
  return `${API_BASE}${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`;
}

export function isUsableRecord(record) {
  return Boolean(record && record.id && record.section && record.mcCtrlNo && record.sectionCtrlNo);
}

export function getRecordFileHref(recordId, fileUrl, token) {
  if (recordId && token) {
    return `${API_BASE}/records/${recordId}/file?token=${encodeURIComponent(token)}`;
  }
  return resolveFileUrl(fileUrl);
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

/** YYYY-MM-DD → MM/DD/YYYY for display */
export function toDisplayDate(isoDate) {
  if (!isoDate) return '';
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return isoDate;
  return `${match[2]}/${match[3]}/${match[1]}`;
}

/** MM/DD/YYYY → YYYY-MM-DD for storage */
export function toIsoDate(displayDate) {
  if (!displayDate) return '';
  const match = displayDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return displayDate;
  return `${match[3]}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;
}

// ─── Remarks helpers ──────────────────────────────────────────────────────────

export function parseRemarksFlags(remarksText) {
  const raw = String(remarksText || '').trim();
  if (!raw) return { remarksEmail: false, remarksViber: false, remarksHardCopy: false, remarksCustom: false, remarksCustomText: '' };

  // If it does NOT start with "sent through", treat the whole value as a custom (Others) entry
  if (!raw.toLowerCase().startsWith('sent through')) {
    return { remarksEmail: false, remarksViber: false, remarksHardCopy: false, remarksCustom: true, remarksCustomText: raw };
  }

  const content = raw.replace(/^\s*sent through\s*/i, '');
  const tokens = content.split('/').map((p) => p.trim().toLowerCase()).filter(Boolean);
  return {
    remarksEmail: tokens.includes('email'),
    remarksViber: tokens.includes('viber'),
    remarksHardCopy: tokens.includes('hardcopy') || tokens.includes('hard copy'),
    remarksCustom: false,
    remarksCustomText: '',
  };
}

// ─── API fetch factory ────────────────────────────────────────────────────────

/**
 * Returns a fetch wrapper that always sends the current authToken.
 * Call inside a hook/component so the closure captures the latest token.
 */
export function makeApiFetch(authToken) {
  return async function apiFetch(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    const isFormData = options.body instanceof FormData;
    if (!isFormData) headers['Content-Type'] = 'application/json';
    if (authToken) headers.Authorization = `Bearer ${authToken}`;
    const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Request failed');
    return data;
  };
}
