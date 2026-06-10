import * as FileSystem from 'expo-file-system/legacy';

export interface LoadProfile {
  id: string;
  name: string;
  height: number;
  width: number;
  weight: number;
  compartments: number;
  compartmentPurpose?: string;
  notes?: string;
  createdAt: string;
}

const STORAGE_FILE = `${FileSystem.documentDirectory}load_profiles.json`;
let cache: LoadProfile[] | null = null;

export async function readLoadProfiles(): Promise<LoadProfile[]> {
  if (cache) return cache;
  try {
    const info = await FileSystem.getInfoAsync(STORAGE_FILE);
    if (!info.exists) {
      cache = [];
      return cache;
    }
    const raw = await FileSystem.readAsStringAsync(STORAGE_FILE);
    const parsed = JSON.parse(raw) as LoadProfile[];
    cache = Array.isArray(parsed) ? parsed : [];
    return cache;
  } catch {
    cache = [];
    return cache;
  }
}

export async function writeLoadProfiles(profiles: LoadProfile[]): Promise<void> {
  cache = profiles;
  await FileSystem.writeAsStringAsync(STORAGE_FILE, JSON.stringify(profiles));
}

export function createLoadProfile(input: Omit<LoadProfile, 'id' | 'createdAt'>): LoadProfile {
  return {
    ...input,
    id: `lp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
}
