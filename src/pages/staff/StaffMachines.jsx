import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useApp } from '../../store/AppStore.jsx'
import { useStaffBuilding } from '../../hooks/useStaffBuilding.js'
import { MaintenanceModal } from '../../components/MaintenanceModal.jsx'
import {
  Banner,
  Button,
  Card,
  DataTable,
  EmptyState,
  Field,
  Input,
  Select,
  StatusBadge,
  Tabs,
  Textarea,
} from '../../components/ui.jsx'
import { fmtDate } from '../../lib/time.js'

export function StaffMachines() {
  const { state, logRepair, updateMachine, toast } = useApp()
  const { buildings, buildingId, setBuildingId } = useStaffBuilding()
  const [params] = useSearchParams()
  const requestedMachine = state.machines.find(
    (machine) =>
      machine.id === params.get('machine') &&
      buildings.some((booking) => booking.id === machine.buildingId)
  )
  const [selectedMachineId, setSelectedMachineId] = useState(requestedMachine?.id || '')
  const [activeTab, setActiveTab] = useState('repair')
  const [isMaintenanceOpen, setMaintenanceOpen] = useState(false)
  const [workPerformed, setWorkPerformed] = useState('')
  const [hoursSpent, setHoursSpent] = useState('')
  const [usedParts, setUsedParts] = useState([])
  const [formError, setFormError] = useState('')
  const [historyType, setHistoryType] = useState('all')
  const [historyPeriod, setHistoryPeriod] = useState('30')
  const activeBuildingId =
    requestedMachine && selectedMachineId === requestedMachine.id
      ? requestedMachine.buildingId
      : buildingId
  const machines = state.machines.filter((machine) => machine.buildingId === activeBuildingId)
  const machine = machines.find((machine) => machine.id === selectedMachineId) || machines[0]
  const machineHistory = state.history.filter(
    (historyEntry) =>
      historyEntry.machineId === machine?.id &&
      (historyType === 'all' || historyEntry.type === historyType) &&
      (historyPeriod === 'all' ||
        Date.now() - new Date(historyEntry.date) <= Number(historyPeriod) * 86400000)
  )
  const recentRepairs = state.history.filter(
    (historyEntry) =>
      historyEntry.machineId === machine?.id &&
      historyEntry.type === 'Repair' &&
      Date.now() - new Date(historyEntry.date) <= 30 * 86400000
  )

  function handleSaveRepair(returnToService) {
    if (workPerformed.trim().length < 10 || !(Number(hoursSpent) > 0)) {
      return setFormError(
        'Describe the work in at least 10 characters and enter time greater than zero.'
      )
    }
    const hasInvalidPart = usedParts.some((part) => {
      const inventoryPart = state.inventory.find((item) => item.id === part.id)
      const quantity = Number(part.qty)
      const availableStock = inventoryPart?.qty || 0

      return !part.id || !Number.isInteger(quantity) || quantity < 1 || quantity > availableStock
    })
    const distinctPartIds = new Set(usedParts.map((part) => part.id))
    const hasDuplicatePart = distinctPartIds.size !== usedParts.length

    if (hasInvalidPart || hasDuplicatePart) {
      return setFormError('Choose distinct parts and quantities within available stock.')
    }

    const result = logRepair(machine.id, {
      work: workPerformed,
      hours: Number(hoursSpent),
      parts: usedParts.map((part) => ({
        id: part.id,
        qty: Number(part.qty),
      })),
      returnToService,
    })
    if (!result.ok) {
      return setFormError('The repair could not be saved.')
    }
    toast(returnToService ? `${machine.label} returned to service.` : 'Repair recorded.')
    setWorkPerformed('')
    setHoursSpent('')
    setUsedParts([])
    setFormError('')
  }

  function handleStatusChange(value) {
    if (value === 'available' && machine.status !== 'available') {
      setFormError('Use the repair log to return a machine to service.')
      setActiveTab('repair')
      return
    }
    if (['in-use', 'reserved', 'finished'].includes(machine.status)) {
      setFormError(
        'This machine is currently in use or reserved. Review its booking in Live Room first.'
      )
      return
    }
    updateMachine(machine.id, {
      status: value,
      outSince: machine.outSince || new Date().toISOString(),
      faultNote:
        value === 'out-of-order' ? 'Unavailable: awaiting staff inspection.' : machine.faultNote,
    })
    toast('Machine status updated.')
    setFormError('')
  }
  const columns = [
    {
      key: 'date',
      label: 'Date',
      render: (h) => fmtDate(h.date),
    },
    {
      key: 'type',
      label: 'Type',
    },
    {
      key: 'details',
      label: 'Details',
    },
    {
      key: 'parts',
      label: 'Parts',
    },
    {
      key: 'by',
      label: 'By',
    },
    {
      key: 'downtime',
      label: 'Downtime',
    },
  ]
  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">Machines</h1>
          <p className="page-sub">Manage status, repairs and maintenance history.</p>
        </div>
        <div className="page-actions">
          <Select
            aria-label="Building"
            value={activeBuildingId || ''}
            onChange={(event) => {
              setBuildingId(event.target.value)
              setSelectedMachineId('')
              setFormError('')
            }}
          >
            {buildings.map((building) => (
              <option key={building.id} value={building.id}>
                {building.name}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Machine"
            value={machine?.id || ''}
            onChange={(event) => {
              setSelectedMachineId(event.target.value)
              setFormError('')
              setWorkPerformed('')
              setHoursSpent('')
              setUsedParts([])
            }}
          >
            {machines.map((machine) => (
              <option key={machine.id} value={machine.id}>
                {machine.label} · {machine.type}
              </option>
            ))}
          </Select>
        </div>
      </header>
      {!machine ? (
        <EmptyState title="No machines available" />
      ) : (
        <>
          <Card
            title={`${machine.label} · ${machine.type}`}
            subtitle={`Building ${machine.buildingId} · ${machine.model} · ${machine.cycle} minute cycle`}
            action={
              <Button size="sm" onClick={() => setMaintenanceOpen(true)}>
                Schedule maintenance
              </Button>
            }
          >
            <div className="toolbar">
              <StatusBadge status={machine.status} />
              <Select
                aria-label="Set machine status"
                value={
                  ['available', 'maintenance', 'out-of-order'].includes(machine.status)
                    ? machine.status
                    : ''
                }
                onChange={(event) => handleStatusChange(event.target.value)}
              >
                <option value="" disabled>
                  Current status: {machine.status}
                </option>
                <option value="available">Available</option>
                <option value="maintenance">Under maintenance</option>
                <option value="out-of-order">Out of order</option>
              </Select>
            </div>
          </Card>
          <Tabs
            value={activeTab}
            onChange={setActiveTab}
            tabs={[
              {
                value: 'repair',
                label: 'Repair log',
              },
              {
                value: 'history',
                label: 'History',
              },
            ]}
          />
          {formError && <Banner tone="danger">{formError}</Banner>}
          {activeTab === 'repair' ? (
            <Card title="Repair log entry" subtitle="Describe the work and any parts used.">
              <div className="stack">
                <p className="small muted">
                  Related reports:{' '}
                  {state.reports
                    .filter(
                      (report) =>
                        report.machineId === machine.id &&
                        ['open', 'confirmed', 'in-repair'].includes(report.status)
                    )
                    .map((report) => report.reportNo)
                    .join(', ') || 'None'}
                </p>
                <Field label="Work performed" required>
                  <Textarea
                    value={workPerformed}
                    onChange={(event) => setWorkPerformed(event.target.value)}
                    placeholder="Describe the repair (at least 10 characters)"
                    maxLength={500}
                  />
                </Field>
                <Field label="Time spent (hours)" required>
                  <Input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={hoursSpent}
                    onChange={(event) => setHoursSpent(event.target.value)}
                  />
                </Field>
                <strong>Parts used</strong>
                {usedParts.map((part, partIndex) => (
                  <div className="toolbar" key={partIndex}>
                    <Select
                      aria-label={`Part ${partIndex + 1}`}
                      value={part.id}
                      onChange={(event) =>
                        setUsedParts(
                          usedParts.map((entry, candidateIndex) =>
                            candidateIndex === partIndex
                              ? {
                                  ...entry,
                                  id: event.target.value,
                                }
                              : entry
                          )
                        )
                      }
                    >
                      <option value="">Choose part</option>
                      {state.inventory.map((entry) => (
                        <option key={entry.id} value={entry.id}>
                          {entry.name} · {entry.qty} in stock
                        </option>
                      ))}
                    </Select>
                    <Input
                      aria-label={`Quantity ${partIndex + 1}`}
                      type="number"
                      min="1"
                      step="1"
                      value={part.qty}
                      onChange={(event) =>
                        setUsedParts(
                          usedParts.map((entry, candidateIndex) =>
                            candidateIndex === partIndex
                              ? {
                                  ...entry,
                                  qty: event.target.value,
                                }
                              : entry
                          )
                        )
                      }
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setUsedParts(
                          usedParts.filter((_, candidateIndex) => partIndex !== candidateIndex)
                        )
                      }
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                <div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      setUsedParts([
                        ...usedParts,
                        {
                          id: '',
                          qty: 1,
                        },
                      ])
                    }
                  >
                    Add part
                  </Button>
                </div>
                <div className="row-actions">
                  <Button onClick={() => handleSaveRepair(true)}>Return to service</Button>
                  <Button variant="secondary" onClick={() => handleSaveRepair(false)}>
                    Save without returning
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <Card title="Machine history">
              {recentRepairs.length >= 3 && (
                <Banner tone="warn">
                  Frequent failure: {recentRepairs.length} repairs in the last 30 days.
                </Banner>
              )}
              <div className="toolbar">
                <Select
                  aria-label="History period"
                  value={historyPeriod}
                  onChange={(event) => setHistoryPeriod(event.target.value)}
                >
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                  <option value="all">All time</option>
                </Select>
                <Select
                  aria-label="History type"
                  value={historyType}
                  onChange={(event) => setHistoryType(event.target.value)}
                >
                  <option value="all">All entry types</option>
                  {['Repair', 'Report', 'Maintenance'].map((entry) => (
                    <option key={entry}>{entry}</option>
                  ))}
                </Select>
              </div>
              <DataTable rows={machineHistory} columns={columns} />
            </Card>
          )}
          {isMaintenanceOpen && (
            <MaintenanceModal machine={machine} onClose={() => setMaintenanceOpen(false)} />
          )}
        </>
      )}
    </div>
  )
}
