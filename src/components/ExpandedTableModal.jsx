import { TABLE_COLUMNS } from '../constants';
import { RecordRow } from './RecordTable';

export default function ExpandedTableModal({
  displayRecords,
  activeSection,
  setIsTableExpanded,
  handleOpenEdit,
  authToken,
}) {
  const handleRowClick = (row) => {
    setIsTableExpanded(false);
    handleOpenEdit(row);
  };

  return (
    <div className="modal" onClick={() => setIsTableExpanded(false)}>
      <div
        className="modal__card modal__card--table"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Expanded table view"
      >
        <div className="modal__table-header">
          <h3>{activeSection} — Clear View</h3>
          <button type="button" className="secondary" onClick={() => setIsTableExpanded(false)}>
            Close
          </button>
        </div>

        <div className="table__grid table__grid--expanded">
          <div className="table__row table__row--head table__row--expanded">
            {TABLE_COLUMNS.map((col) => (
              <div key={col} className="table__cell table__cell--head">{col}</div>
            ))}
          </div>

          {displayRecords.map((row) => (
            <RecordRow
              key={`expanded-${row.id || row.mcCtrlNo}`}
              row={row}
              authToken={authToken}
              onEdit={handleRowClick}
              expanded
            />
          ))}

          {displayRecords.length === 0 && (
            <div className="table__row table__row--empty">
              <div className="table__cell">No records yet.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
