import { TABLE_COLUMNS } from '../constants';
import { toDisplayDate, getRecordFileHref } from '../utils';
import { useEffect, useRef, useState } from 'react';

const DEFAULT_COL_WIDTHS = [
  140, // MC Ctrl
  145, // Sec Ctrl
  80,  // Section
  105, // Date Rcvd
  200, // Subject
  80,  // From
  105, // Target
  125, // Rcvd By
  110, // Action
  150, // Remarks
  130, // Units
  105, // Date Sent
  100, // Status
];

const MIN_COL_WIDTH = 60;

const COL_WIDTHS_STORAGE_KEY = 'dms_record_table_col_widths_v1';

function safeLoadStoredWidths() {
  try {
    const raw = localStorage.getItem(COL_WIDTHS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    if (parsed.length !== DEFAULT_COL_WIDTHS.length) return null;
    const widths = parsed.map((n, i) => {
      const value = Number(n);
      if (!Number.isFinite(value)) return DEFAULT_COL_WIDTHS[i];
      return Math.max(MIN_COL_WIDTH, Math.round(value));
    });
    return widths;
  } catch {
    return null;
  }
}

function persistWidths(widths) {
  try {
    localStorage.setItem(COL_WIDTHS_STORAGE_KEY, JSON.stringify(widths));
  } catch {
    // ignore storage errors (private mode / quota)
  }
}

function widthsToTemplate(widths) {
  return widths.map((w) => `${w}px`).join(' ');
}

function widthsToMinWidth(widths) {
  return widths.reduce((sum, w) => sum + w, 0);
}

function StatusBadge({ status }) {
  const cls = {
    Completed: 'status-badge--completed',
    Overdue: 'status-badge--overdue',
    Pending: 'status-badge--pending',
    Ongoing: 'status-badge--ongoing',
    'For Compliance': 'status-badge--compliance',
  }[status] || '';
  return <span className={`status-badge ${cls}`}>{status || 'Pending'}</span>;
}

function ActionBadge({ action }) {
  const map = {
    DRAFTED: 'Drafted',
    DISSEMINATED: 'Disseminated',
    FILED: 'Filed',
  };
  const label = map[action] || action || '';
  // Plain text (no badge styling)
  return <span>{label}</span>;
}

function SkeletonRow({ gridTemplateColumns, minWidth }) {
  return (
    <div className="table__row table__row--skeleton" style={gridTemplateColumns ? { gridTemplateColumns, minWidth } : undefined}>
      {Array.from({ length: TABLE_COLUMNS.length }).map((_, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <div key={i} className="table__cell">
          <div className="skeleton-line" />
        </div>
      ))}
    </div>
  );
}

export default function RecordTable({ displayRecords, activeSection, setIsTableExpanded, handleOpenEdit, authToken, isLoadingRecords }) {
  const [colWidths, setColWidths] = useState(() => safeLoadStoredWidths() || DEFAULT_COL_WIDTHS);
  const resizeRef = useRef(null);
  const colWidthsRef = useRef(colWidths);
  const gridRef = useRef(null);

  const applyWidthsToDom = (widths) => {
    colWidthsRef.current = widths;
    const el = gridRef.current;
    if (!el) return;
    el.style.setProperty('--table-cols', widthsToTemplate(widths));
    el.style.setProperty('--table-min-width', `${widthsToMinWidth(widths)}px`);
  };

  useEffect(() => {
    applyWidthsToDom(colWidths);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colWidths]);

  const startResize = (colIndex, e) => {
    // Excel-like drag on the header separator.
    e.preventDefault();
    e.stopPropagation();

    resizeRef.current = {
      colIndex,
      startX: e.clientX,
      startWidths: colWidthsRef.current,
      lastX: e.clientX,
      rafId: null,
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const handleMove = (e) => {
      if (!resizeRef.current) return;
      resizeRef.current.lastX = e.clientX;
      if (resizeRef.current.rafId) return;

      resizeRef.current.rafId = window.requestAnimationFrame(() => {
        if (!resizeRef.current) return;
        const { colIndex, startX, startWidths, lastX } = resizeRef.current;
        resizeRef.current.rafId = null;

        const delta = lastX - startX;
        const next = [...startWidths];
        next[colIndex] = Math.max(MIN_COL_WIDTH, startWidths[colIndex] + delta);
        applyWidthsToDom(next);
      });
    };

    const handleUp = () => {
      if (!resizeRef.current) return;

      if (resizeRef.current.rafId) {
        window.cancelAnimationFrame(resizeRef.current.rafId);
        // Apply final position synchronously so the last drag movement isn't lost.
        const { colIndex, startX, startWidths, lastX } = resizeRef.current;
        const delta = lastX - startX;
        const next = [...startWidths];
        next[colIndex] = Math.max(MIN_COL_WIDTH, startWidths[colIndex] + delta);
        applyWidthsToDom(next);
      }

      resizeRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';

      // Commit once to React state + persist (keeps drag smooth).
      const finalWidths = colWidthsRef.current;
      persistWidths(finalWidths);
      setColWidths(finalWidths);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, []);

  return (
    <section className="table">
      <header className="table__header">
        <h3>{activeSection}</h3>
        <button
          type="button"
          className="table__expand"
          onClick={() => setIsTableExpanded(true)}
          title="Open a clear, expanded view of the table"
        >
          Clear View
        </button>
      </header>

      <div
        className="table__grid"
        ref={gridRef}
        style={{
          '--table-cols': widthsToTemplate(colWidths),
          '--table-min-width': `${widthsToMinWidth(colWidths)}px`,
        }}
      >
        <div className="table__row table__row--head">
          {TABLE_COLUMNS.map((col, i) => (
            <div
              key={col}
              className={`table__cell table__cell--head${col === 'Status' ? ' table__cell--sticky-right' : ''}`}
            >
              {col}
              <div
                className="table__col-resizer"
                role="separator"
                aria-orientation="vertical"
                aria-label={`Resize column: ${col}`}
                onMouseDown={(e) => startResize(i, e)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          ))}
        </div>

        {displayRecords.map((row) => (
          <RecordRow
            key={row.id || row.mcCtrlNo}
            row={row}
            authToken={authToken}
            onEdit={handleOpenEdit}
          />
        ))}

        {isLoadingRecords && displayRecords.length === 0 && (
          <>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </>
        )}

        {!isLoadingRecords && displayRecords.length === 0 && (
          <div className="table__empty">
            <div className="table__empty-icon">📂</div>
            <div className="table__empty-title">No records found</div>
            <div className="table__empty-sub">Try adjusting your filters or add a new record using the form.</div>
          </div>
        )}
      </div>
    </section>
  );
}

export function RecordRow({
  row,
  authToken,
  onEdit,
  expanded = false,
}) {
  const isOverdue = row.status === 'Overdue';
  const rowClass = [
    'table__row',
    'table__row--clickable',
    expanded ? 'table__row--expanded' : '',
    isOverdue ? 'table__row--overdue' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={rowClass}
      onClick={() => onEdit(row)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onEdit(row); }}
    >
      <div className="table__cell">{row.mcCtrlNo}</div>
      <div className="table__cell">{row.sectionCtrlNo}</div>
      <div className="table__cell">{row.section}</div>
      <div className="table__cell">{toDisplayDate(row.dateReceived)}</div>
      <div className="table__cell">
        {row.subjectFileUrl ? (
          <a
            className="table__link"
            href={getRecordFileHref(row.id, row.subjectFileUrl, authToken)}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            {row.subjectText || 'View File'}
          </a>
        ) : row.subjectText}
      </div>
      <div className="table__cell">{row.fromValue}</div>
      <div className="table__cell">{toDisplayDate(row.targetDate) || row.targetDate}</div>
      <div className="table__cell">{row.receivedBy}</div>
      <div className="table__cell"><ActionBadge action={row.actionTaken} /></div>
      <div className="table__cell">{row.remarksText || row.remarks || ''}</div>
      <div className="table__cell">{row.concernedUnits}</div>
      <div className="table__cell">{toDisplayDate(row.dateSent)}</div>
      <div className={`table__cell${!expanded ? ' table__cell--sticky-right' : ''}`}><StatusBadge status={row.status} /></div>
    </div>
  );
}
