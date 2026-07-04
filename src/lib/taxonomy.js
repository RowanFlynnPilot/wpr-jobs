// Single source of truth for the frontend. INVARIANT: mirrored in
// supabase/functions/submit-job/index.ts — change both or the edge
// function will reject the form.
export const CATEGORIES = [
  'Healthcare',
  'Manufacturing',
  'Education',
  'Trades & Construction',
  'Office & Professional',
  'Retail & Hospitality',
  'Government & Nonprofit',
  'Transportation & Logistics',
  'Other',
]

export const EMPLOYMENT_TYPES = [
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'seasonal', label: 'Seasonal' },
  { value: 'contract', label: 'Contract' },
]

export function typeLabel(value) {
  const match = EMPLOYMENT_TYPES.find((t) => t.value === value)
  return match ? match.label : value
}
