import { useEffect, useState } from 'react'
import { useApp } from '../store/AppStore.jsx'

/** Remembers the staff member's currently selected building across pages. */
export function useStaffBuilding() {
  const { state, user } = useApp()
  const buildings = state.buildings.filter((b) => (user.buildingIds || []).includes(b.id))
  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('washq-staff-building') : null
  const [buildingId, setBuildingId] = useState(() => {
    if (stored && buildings.some((b) => b.id === stored)) return stored
    return buildings[0]?.id || null
  })

  useEffect(() => {
    if (buildingId) localStorage.setItem('washq-staff-building', buildingId)
  }, [buildingId])

  return {
    buildings,
    buildingId,
    setBuildingId,
    building: state.buildings.find((b) => b.id === buildingId) || null,
  }
}

export const studentTag = (u) => {
  if (!u) return '—'
  if (u.studentId) return `#${u.studentId.slice(-4)}`
  return u.name || 'Student'
}
