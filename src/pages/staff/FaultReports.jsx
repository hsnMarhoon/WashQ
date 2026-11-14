import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../../store/AppStore.jsx'
import { useStaffBuilding } from '../../hooks/useStaffBuilding.js'
import {
  Badge,
  Banner,
  Button,
  Card,
  DataTable,
  EmptyState,
  Field,
  Modal,
  Select,
  StatusBadge,
  Textarea,
} from '../../components/ui.jsx'
import { timeAgo, waitingLabel } from '../../lib/time.js'

export function FaultReports() {
  const { state, confirmReport, dismissReport, toast } = useApp()
  const { buildings } = useStaffBuilding()
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const [buildingFilter, setBuildingFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('open')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [selectedReportId, setSelectedReportId] = useState(params.get('report'))
  const [dialogMode, setDialogMode] = useState('')
  const [priority, setPriority] = useState('Medium')
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  const assignedBuildingIds = buildings.map((building) => building.id)
  const assignedReports = state.reports.filter((report) =>
    assignedBuildingIds.includes(report.buildingId)
  )
  const reports = assignedReports
    .filter(
      (report) =>
        (buildingFilter === 'all' || report.buildingId === buildingFilter) &&
        (statusFilter === 'all' || report.status === statusFilter) &&
        (categoryFilter === 'all' || report.category === categoryFilter)
    )
    .sort(
      (firstReport, secondReport) =>
        new Date(firstReport.createdAt) - new Date(secondReport.createdAt)
    )

  const selectedReport = reports.find((report) => report.id === selectedReportId) || reports[0]
  const machine = state.machines.find((machine) => machine.id === selectedReport?.machineId)
  const recentRepairs = state.history.filter(
    (historyEntry) =>
      historyEntry.machineId === selectedReport?.machineId &&
      historyEntry.type === 'Repair' &&
      Date.now() - new Date(historyEntry.date) < 30 * 86400000
  )
  const affectedBookingCount = state.bookings.filter(
    (booking) =>
      booking.machineId === selectedReport?.machineId &&
      booking.status === 'upcoming' &&
      new Date(booking.start) > new Date()
  ).length

  function handleTriageReport() {
    if (!selectedReport) return

    if (dialogMode === 'dismiss' && !reason) {
      return setError('Select a reason.')
    }
    const result =
      dialogMode === 'confirm'
        ? confirmReport(selectedReport.id, priority, note.trim())
        : dismissReport(selectedReport.id, reason, note.trim())
    if (!result.ok) {
      return setError('This report could not be updated.')
    }
    toast(
      dialogMode === 'confirm'
        ? `Report confirmed; ${result.cancelled} booking(s) cancelled.`
        : 'Report dismissed.'
    )
    setDialogMode('')
    setNote('')
    setReason('')
    setError('')
  }

  const columns = [
    {
      key: 'machineId',
      label: 'Machine',
      render: (report) => {
        const reportMachine = state.machines.find((item) => item.id === report.machineId)
        return `${reportMachine?.label || report.machineId} · ${report.buildingId}`
      },
    },
    {
      key: 'category',
      label: 'Issue',
    },
    {
      key: 'createdAt',
      label: 'Waiting',
      render: (report) => {
        const waitingTime = Date.now() - new Date(report.createdAt).getTime()
        const isOverdue = report.status === 'open' && waitingTime > 86400000

        return (
          <>
            {waitingLabel(report.createdAt)} {isOverdue && <Badge tone="red">Overdue</Badge>}
          </>
        )
      },
    },
    {
      key: 'priority',
      label: 'Priority',
      render: (report) => report.priority || '—',
    },
  ]
  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">Fault reports</h1>
          <p className="page-sub">Review reports and triage machines in your assigned buildings.</p>
        </div>
      </header>
      <div className="toolbar">
        <Select
          aria-label="Filter building"
          value={buildingFilter}
          onChange={(event) => setBuildingFilter(event.target.value)}
        >
          <option value="all">All assigned buildings</option>
          {buildings.map((building) => (
            <option key={building.id} value={building.id}>
              {building.name}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Filter status"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="all">All statuses</option>
          {['open', 'confirmed', 'in-repair', 'resolved', 'dismissed'].map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Filter category"
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
        >
          <option value="all">All categories</option>
          {[...new Set(assignedReports.map((report) => report.category))].map((categoryOption) => (
            <option key={categoryOption}>{categoryOption}</option>
          ))}
        </Select>
      </div>
      <div className="form-grid">
        <Card title="Reports" bodyClass="no-pad">
          <DataTable
            rows={reports}
            onRowClick={(report) => setSelectedReportId(report.id)}
            columns={columns}
            empty={<EmptyState compact title="No matching reports" />}
          />
        </Card>
        <Card
          title={
            selectedReport
              ? `${machine?.label || 'Machine'} · ${selectedReport.category}`
              : 'Report details'
          }
        >
          {selectedReport ? (
            <div className="stack">
              <div>
                <StatusBadge status={selectedReport.status} />{' '}
                <span className="small muted">
                  Building {selectedReport.buildingId} · {selectedReport.reportNo} ·{' '}
                  {timeAgo(selectedReport.createdAt)}
                </span>
              </div>
              <p>{selectedReport.description}</p>
              {selectedReport.photoName && (
                <p className="small muted">
                  Attachment: {selectedReport.photoName} (filename only in this prototype)
                </p>
              )}
              <div>
                <strong>Recent repairs</strong>
                <p className="small muted">
                  {recentRepairs.length} in the last 30 days
                  {recentRepairs[0] ? ` · ${recentRepairs[0].details}` : ''}
                </p>
              </div>
              {selectedReport.staffNote && <p>Staff note: {selectedReport.staffNote}</p>}
              {selectedReport.dismissReason && <p>Reason: {selectedReport.dismissReason}</p>}
              <div className="row-actions">
                {selectedReport.status === 'open' && (
                  <>
                    <Button onClick={() => setDialogMode('confirm')}>Confirm</Button>
                    <Button variant="secondary" onClick={() => setDialogMode('dismiss')}>
                      Dismiss
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  onClick={() =>
                    navigate(
                      `/staff/machines?machine=${encodeURIComponent(selectedReport.machineId)}`
                    )
                  }
                >
                  Open machine
                </Button>
              </div>
            </div>
          ) : (
            <p className="muted">Select a report to see its details.</p>
          )}
        </Card>
      </div>
      {dialogMode && selectedReport && (
        <Modal
          open
          onClose={() => {
            setDialogMode('')
            setError('')
          }}
          title={`${dialogMode === 'confirm' ? 'Confirm' : 'Dismiss'} report · ${machine?.label}`}
          footer={
            <>
              <Button variant="ghost" onClick={() => setDialogMode('')}>
                Back
              </Button>
              <Button onClick={handleTriageReport}>
                {dialogMode === 'confirm' ? 'Confirm report' : 'Dismiss report'}
              </Button>
            </>
          }
        >
          <div className="stack">
            {dialogMode === 'confirm' ? (
              <>
                <Field label="Priority">
                  <Select value={priority} onChange={(event) => setPriority(event.target.value)}>
                    {['Low', 'Medium', 'High'].map((priorityOption) => (
                      <option key={priorityOption}>{priorityOption}</option>
                    ))}
                  </Select>
                </Field>
                <Banner tone="warn">
                  The machine will be marked out of order. {affectedBookingCount} upcoming
                  booking(s) will be cancelled and students notified.
                </Banner>
              </>
            ) : (
              <Field label="Reason" required>
                <Select value={reason} onChange={(event) => setReason(event.target.value)}>
                  <option value="">Select a reason</option>
                  {['User error', 'Cannot reproduce', 'Duplicate report', 'Other'].map(
                    (dismissalReason) => (
                      <option key={dismissalReason}>{dismissalReason}</option>
                    )
                  )}
                </Select>
              </Field>
            )}
            <Field label="Note for the student">
              <Textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={300}
              />
            </Field>
            {error && <Banner tone="danger">{error}</Banner>}
          </div>
        </Modal>
      )}
    </div>
  )
}
