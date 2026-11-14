import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../store/AppStore.jsx'
import { useStaffBuilding } from '../../hooks/useStaffBuilding.js'
import { Badge, Button, Card, DataTable, EmptyState, Kpi, Select } from '../../components/ui.jsx'
import { fmtDate, fmtTime, sameDay, waitingLabel } from '../../lib/time.js'
import { MaintenanceModal } from '../../components/MaintenanceModal.jsx'

export function StaffOverview() {
  const { state } = useApp()
  const { buildings, buildingId, setBuildingId } = useStaffBuilding()
  const navigate = useNavigate()
  const [isMaintenancePickerOpen, setMaintenancePickerOpen] = useState(false)
  const [selectedMachineId, setSelectedMachineId] = useState('')
  const machines = state.machines.filter((machine) => machine.buildingId === buildingId)
  const openReports = state.reports
    .filter((report) => report.buildingId === buildingId && report.status === 'open')
    .sort((announcement, booking) => new Date(announcement.createdAt) - new Date(booking.createdAt))
  const escalatedFlags = state.flags.filter(
    (flag) => flag.buildingId === buildingId && flag.status === 'open' && flag.escalated
  )
  const maintenance = state.maintenance.filter(
    (machine) => machine.buildingId === buildingId && sameDay(machine.start, new Date())
  )
  const lowStockParts = state.inventory.filter((part) => part.qty <= part.reorder)
  const announcements = state.announcements.filter(
    (announcement) =>
      announcement.buildingIds.includes(buildingId) && announcement.status === 'live'
  )
  const columns = [
    {
      key: 'machineId',
      label: 'Machine',
      render: (r) => state.machines.find((m) => m.id === r.machineId)?.label || r.machineId,
    },
    {
      key: 'category',
      label: 'Issue',
    },
    {
      key: 'createdAt',
      label: 'Waiting',
      render: (r) => (
        <>
          {waitingLabel(r.createdAt)}{' '}
          {Date.now() - new Date(r.createdAt) > 86400000 && <Badge tone="red">Overdue</Badge>}
        </>
      ),
    },
    {
      key: 'go',
      label: '',
      render: (r) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => navigate(`/staff/reports?report=${encodeURIComponent(r.id)}`)}
        >
          Triage
        </Button>
      ),
    },
  ]
  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">Overview</h1>
          <p className="page-sub">A snapshot of your assigned laundry room.</p>
        </div>
        <Select
          aria-label="Building"
          value={buildingId || ''}
          onChange={(event) => setBuildingId(event.target.value)}
        >
          {buildings.map((building) => (
            <option key={building.id} value={building.id}>
              {building.name}
            </option>
          ))}
        </Select>
      </header>
      {!buildings.length ? (
        <EmptyState title="No assigned buildings">
          An administrator can assign your buildings.
        </EmptyState>
      ) : (
        <>
          <div className="kpi-grid">
            <Kpi
              icon="wrench"
              label="Out of service"
              value={
                machines.filter((machine) =>
                  ['maintenance', 'out-of-order'].includes(machine.status)
                ).length
              }
              tone="red"
              onClick={() => navigate('/staff/machines')}
            />
            <Kpi
              icon="flag"
              label="Open fault reports"
              value={openReports.length}
              hint={`${openReports.filter((report) => Date.now() - new Date(report.createdAt) > 86400000).length} overdue`}
              tone="amber"
              onClick={() => navigate('/staff/reports')}
            />
            <Kpi
              icon="queue"
              label="Escalated flags"
              value={escalatedFlags.length}
              tone="blue"
              onClick={() => navigate('/staff/live')}
            />
            <Kpi
              icon="box"
              label="Low stock"
              value={lowStockParts.length}
              onClick={() => navigate('/staff/inventory')}
            />
          </div>
          <Card
            title="Open reports"
            action={
              <Button size="sm" variant="secondary" onClick={() => navigate('/staff/reports')}>
                View all
              </Button>
            }
            bodyClass="no-pad"
          >
            <DataTable
              rows={openReports}
              columns={columns}
              empty={<EmptyState compact title="No open reports" />}
            />
          </Card>
          <div className="form-grid">
            <Card
              title="Today's maintenance"
              action={
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setMaintenancePickerOpen(true)}
                >
                  Schedule
                </Button>
              }
            >
              {maintenance.length ? (
                maintenance.map((machine) => (
                  <p key={machine.id}>
                    <strong>
                      {state.machines.find((entry) => entry.id === machine.machineId)?.label}
                    </strong>{' '}
                    · {fmtTime(machine.start)} · {machine.duration} min · {machine.note}
                  </p>
                ))
              ) : (
                <p className="muted">Nothing scheduled today.</p>
              )}
            </Card>
            <Card
              title="Low stock"
              action={
                <Button size="sm" variant="ghost" onClick={() => navigate('/staff/inventory')}>
                  Inventory
                </Button>
              }
            >
              {lowStockParts.length ? (
                lowStockParts.map((part) => (
                  <p key={part.id}>
                    {part.name} · {part.qty} left (reorder at {part.reorder})
                  </p>
                ))
              ) : (
                <p className="muted">All parts are sufficiently stocked.</p>
              )}
            </Card>
            <Card
              title="Live announcements"
              action={
                <Button size="sm" variant="ghost" onClick={() => navigate('/staff/announcements')}>
                  Manage
                </Button>
              }
            >
              {announcements.length ? (
                announcements.map((announcement) => (
                  <p key={announcement.id}>
                    <strong>{announcement.title}</strong> · until {fmtDate(announcement.end)}{' '}
                    {fmtTime(announcement.end)}
                  </p>
                ))
              ) : (
                <p className="muted">None right now.</p>
              )}
            </Card>
          </div>
          {isMaintenancePickerOpen && (
            <Card
              title="Choose a machine"
              action={
                <Button size="sm" variant="ghost" onClick={() => setMaintenancePickerOpen(false)}>
                  Close
                </Button>
              }
            >
              <Select
                aria-label="Machine to schedule"
                value={selectedMachineId}
                onChange={(event) => setSelectedMachineId(event.target.value)}
              >
                <option value="">Select a machine</option>
                {machines.map((machine) => (
                  <option key={machine.id} value={machine.id}>
                    {machine.label} · {machine.model}
                  </option>
                ))}
              </Select>
              {selectedMachineId && (
                <MaintenanceModal
                  machine={machines.find((machine) => machine.id === selectedMachineId)}
                  onClose={() => {
                    setSelectedMachineId('')
                    setMaintenancePickerOpen(false)
                  }}
                />
              )}
            </Card>
          )}
        </>
      )}
    </div>
  )
}
