import { TABLE_COLUMNS } from '../constants';
import { toDisplayDate, getRecordFileHref } from '../utils';

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
    DRAFTED:      { cls: 'action-badge--drafted',      label: 'Drafted' },
    DISSEMINATED: { cls: 'action-badge--disseminated', label: 'Disseminated' },
    FILED:        { cls: 'action-badge--filed',        label: 'Filed' },
  };
  const { cls = '', label = action } = map[action] || {};
  return <span className={`action-badge ${cls}`}>{label}</span>;
}

function SkeletonRow() {
  return (
    <div className="table__row table__row--skeleton">
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

      <div className="table__grid">
        <div className="table__row table__row--head">
          {TABLE_COLUMNS.map((col) => (
            <div key={col} className={`table__cell table__cell--head${col === 'Status' ? ' table__cell--sticky-right' : ''}`}>{col}</div>
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

export function RecordRow({ row, authToken, onEdit, expanded = false }) {
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
