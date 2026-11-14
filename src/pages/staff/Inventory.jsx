import { useState } from 'react'
import { useApp } from '../../store/AppStore.jsx'
import {
  Badge,
  Banner,
  Button,
  Card,
  DataTable,
  Field,
  Input,
  Modal,
  Select,
} from '../../components/ui.jsx'

export function Inventory() {
  const { state, addPart, recordStock, updatePart, toast } = useApp()
  const [dialogMode, setDialogMode] = useState('')
  const [selectedPartId, setSelectedPartId] = useState('')
  const [partName, setPartName] = useState('')
  const [compatibleModels, setCompatibleModels] = useState('')
  const [quantity, setQuantity] = useState('0')
  const [reorderLevel, setReorderLevel] = useState('')
  const [errors, setErrors] = useState({})
  const lowStockParts = state.inventory.filter((part) => part.qty <= part.reorder)

  function openPartDialog(nextMode, existingPart) {
    setDialogMode(nextMode)
    setSelectedPartId(existingPart?.id || state.inventory[0]?.id || '')
    setPartName(existingPart?.name || '')
    setCompatibleModels(existingPart?.models?.join(', ') || '')
    setQuantity(nextMode === 'stock' ? '1' : String(existingPart?.qty ?? 0))
    setReorderLevel(existingPart ? String(existingPart.reorder) : '')
    setErrors({})
  }

  function handleSavePart() {
    if (dialogMode === 'stock') {
      const r = recordStock(selectedPartId, quantity)
      if (!r.ok) {
        return setErrors({
          qty: 'Enter a positive whole number and select a part.',
        })
      }
      toast('Stock received.')
      setDialogMode('')
      return
    }
    if (reorderLevel === '' || quantity === '') {
      return setErrors({
        form: 'Quantity and reorder level are required.',
      })
    }
    const payload = {
      name: partName,
      models: compatibleModels
        .split(',')
        .map((option) => option.trim())
        .filter(Boolean),
      qty: quantity,
      reorder: reorderLevel,
    }
    const result = dialogMode === 'edit' ? updatePart(selectedPartId, payload) : addPart(payload)
    if (!result.ok) {
      return setErrors(
        result.errors || {
          form: 'Could not save this part.',
        }
      )
    }
    toast(dialogMode === 'edit' ? 'Part updated.' : 'Part added.')
    setDialogMode('')
  }
  const columns = [
    {
      key: 'name',
      label: 'Part',
      render: (p) => <strong>{p.name}</strong>,
    },
    {
      key: 'models',
      label: 'Compatible models',
      render: (p) => p.models.join(', ') || '—',
    },
    {
      key: 'qty',
      label: 'In stock',
    },
    {
      key: 'reorder',
      label: 'Reorder at',
    },
    {
      key: 'status',
      label: 'Status',
      render: (p) => (
        <Badge tone={p.qty <= p.reorder ? 'amber' : 'green'}>
          {p.qty <= p.reorder ? 'Low stock' : 'OK'}
        </Badge>
      ),
    },
    {
      key: 'edit',
      label: '',
      render: (p) => (
        <Button size="sm" variant="ghost" onClick={() => openPartDialog('edit', p)}>
          Edit
        </Button>
      ),
    },
  ]
  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">Spare-parts inventory</h1>
          <p className="page-sub">Track spare parts and reorder levels.</p>
        </div>
        <div className="page-actions">
          <Button variant="secondary" onClick={() => openPartDialog('stock')}>
            Record stock received
          </Button>
          <Button onClick={() => openPartDialog('add')}>Add part</Button>
        </div>
      </header>
      {lowStockParts.length > 0 && (
        <Banner tone="warn">{lowStockParts.length} part(s) at or below reorder level.</Banner>
      )}
      <Card bodyClass="no-pad">
        <DataTable rows={state.inventory} columns={columns} />
      </Card>
      <p className="small muted">Parts recorded in repair logs are deducted from stock.</p>
      {dialogMode && (
        <Modal
          open
          onClose={() => setDialogMode('')}
          title={
            dialogMode === 'add'
              ? 'Add part'
              : dialogMode === 'edit'
                ? 'Edit part'
                : 'Record stock received'
          }
          footer={
            <>
              <Button variant="ghost" onClick={() => setDialogMode('')}>
                Cancel
              </Button>
              <Button onClick={handleSavePart}>Save</Button>
            </>
          }
        >
          <div className="stack">
            {dialogMode === 'stock' ? (
              <>
                <Field label="Part" required>
                  <Select
                    value={selectedPartId}
                    onChange={(event) => setSelectedPartId(event.target.value)}
                  >
                    {state.inventory.map((part) => (
                      <option key={part.id} value={part.id}>
                        {part.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Quantity received" error={errors.qty}>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                  />
                </Field>
              </>
            ) : (
              <>
                <Field label="Part name" required error={errors.name}>
                  <Input
                    value={partName}
                    onChange={(event) => setPartName(event.target.value)}
                    maxLength={80}
                  />
                </Field>
                <Field label="Compatible models" hint="Separate model names with commas.">
                  <Input
                    value={compatibleModels}
                    onChange={(event) => setCompatibleModels(event.target.value)}
                  />
                </Field>
                <Field label="Quantity in stock" required error={errors.qty}>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                  />
                </Field>
                <Field label="Reorder level" required error={errors.reorder}>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={reorderLevel}
                    onChange={(event) => setReorderLevel(event.target.value)}
                  />
                </Field>
              </>
            )}
            {errors.form && <Banner tone="danger">{errors.form}</Banner>}
          </div>
        </Modal>
      )}
    </div>
  )
}
