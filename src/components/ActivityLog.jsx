import { getLogSection, getLogSectionCtrlNo, getLogDetails } from '../hooks/useActivityLog';

export default function ActivityLog({
  filteredActivityLogs,
  activityLogSearch, setActivityLogSearch,
  activityLogActionFilter, setActivityLogActionFilter,
  normalizeAuditAction,
}) {
  return (
    <div className="tables">
      <section className="table">
        <header className="table__header">
          <h3>Activity Log</h3>
        </header>
        <div className="activity-log-table-wrapper">
          <table className="activity-log-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Section</th>
                <th>Section Ctrl No.</th>
                <th>Action</th>
                <th>Details</th>
                <th>User</th>
              </tr>
            </thead>
            <tbody>
              {filteredActivityLogs.length === 0 ? (
                <tr>
                  <td className="activity-log-table__empty" colSpan={6}>
                    No activity logs found.
                  </td>
                </tr>
              ) : (
                filteredActivityLogs.map((log, index) => (
                  <tr key={`${log.id || log.performedAt || index}-${index}`}>
                    <td>{log.performedAt ? new Date(log.performedAt).toLocaleString() : '-'}</td>
                    <td>{getLogSection(log) || '-'}</td>
                    <td>{getLogSectionCtrlNo(log) || '-'}</td>
                    <td className="activity-log-action">{normalizeAuditAction(log.action) || '-'}</td>
                    <td>
                      <span
                        className="activity-log-cell activity-log-cell--details"
                        title={getLogDetails(log)}
                      >
                        {getLogDetails(log)}
                      </span>
                    </td>
                    <td>{log.performedBy || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
