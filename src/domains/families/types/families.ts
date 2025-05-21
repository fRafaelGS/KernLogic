// Basic family structure from the backend
export interface Family {
  id: number;
  name: string;
  code?: string;
  label?: string;
}

// Family selection option for simple selects
export interface FamilyOption {
  label: string;
  value: string | number;
}

// Helper functions to normalize family data
export function normalizeFamily(raw: Family | null | undefined): Family {
  if (!raw) {
    return { id: 0, name: '' };
  }
  
  // Handle object - ensure name is present
  return {
    id: raw.id,
    name: raw.name || raw.label || raw.code || `Family ${raw.id}`
  };
} 