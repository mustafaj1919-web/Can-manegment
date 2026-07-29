/**
 * Enterprise Design System v1 — Client Preference Storage Helper
 * Canonical Key: `car_showroom_v2_ds_config_v1`
 * Legacy Key Fallback: `car_showroom_v2_sales_table_config_v1`
 */

export const DS_CONFIG_STORAGE_KEY = 'car_showroom_v2_ds_config_v1'
export const LEGACY_SALES_CONFIG_KEY = 'car_showroom_v2_sales_table_config_v1'

export interface TableUIPreferences {
  density?: 'compact' | 'comfortable'
  visibleCols?: Record<string, boolean>
  colWidths?: Record<string, number>
  sortKey?: string | null
  sortDir?: 'asc' | 'desc'
  perPage?: number
}

export interface EnterpriseUIPreferences {
  sidebarCollapsed?: boolean
  tables?: Record<string, TableUIPreferences>
}

const DEFAULT_PREFERENCES: EnterpriseUIPreferences = {
  sidebarCollapsed: false,
  tables: {},
}

export function loadUIPreferences(): EnterpriseUIPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES
  try {
    const raw = localStorage.getItem(DS_CONFIG_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        sidebarCollapsed: Boolean(parsed.sidebarCollapsed),
        tables: parsed.tables && typeof parsed.tables === 'object' ? parsed.tables : {},
      }
    }

    // Fallback: Read legacy key if present
    const legacyRaw = localStorage.getItem(LEGACY_SALES_CONFIG_KEY)
    if (legacyRaw) {
      const legacyParsed = JSON.parse(legacyRaw)
      return {
        sidebarCollapsed: false,
        tables: {
          sales_table_v2: {
            density: legacyParsed.density === 'comfortable' ? 'comfortable' : 'compact',
            visibleCols: legacyParsed.visibleCols,
            colWidths: legacyParsed.colWidths,
            sortKey: legacyParsed.sortKey,
            sortDir: legacyParsed.sortDir,
          },
        },
      }
    }

    return DEFAULT_PREFERENCES
  } catch {
    return DEFAULT_PREFERENCES
  }
}

export function saveUIPreferences(prefs: EnterpriseUIPreferences): void {
  if (typeof window === 'undefined') return
  try {
    const cleanConfig: EnterpriseUIPreferences = {
      sidebarCollapsed: Boolean(prefs.sidebarCollapsed),
      tables: {},
    }
    if (prefs.tables && typeof prefs.tables === 'object') {
      Object.keys(prefs.tables).forEach(tableId => {
        const t = prefs.tables?.[tableId]
        if (t) {
          cleanConfig.tables![tableId] = {
            density: t.density === 'comfortable' ? 'comfortable' : 'compact',
            visibleCols: t.visibleCols && typeof t.visibleCols === 'object' ? t.visibleCols : undefined,
            colWidths: t.colWidths && typeof t.colWidths === 'object' ? t.colWidths : undefined,
            sortKey: typeof t.sortKey === 'string' ? t.sortKey : null,
            sortDir: t.sortDir === 'asc' ? 'asc' : 'desc',
            perPage: typeof t.perPage === 'number' ? t.perPage : undefined,
          }
        }
      })
    }
    localStorage.setItem(DS_CONFIG_STORAGE_KEY, JSON.stringify(cleanConfig))
  } catch {
    // Ignore storage write errors (e.g. quota exceeded or private mode)
  }
}

export function getTablePreferences(tableId: string): TableUIPreferences {
  const all = loadUIPreferences()
  return all.tables?.[tableId] ?? { density: 'compact' }
}

export function saveTablePreferences(tableId: string, tablePrefs: TableUIPreferences): void {
  const all = loadUIPreferences()
  const updated = {
    ...all,
    tables: {
      ...all.tables,
      [tableId]: {
        ...all.tables?.[tableId],
        ...tablePrefs,
      },
    },
  }
  saveUIPreferences(updated)
}
