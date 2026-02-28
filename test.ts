import type { Database } from './src/types/database.types';

// Let's copy Supabase's Generic definitions:
export type GenericSchema = {
    Tables: Record<string, GenericTable>
    Views: Record<string, GenericView>
    Functions: Record<string, GenericFunction>
    Enums: Record<string, string>
}
export interface GenericTable {
    Row: Record<string, unknown>
    Insert: Record<string, unknown>
    Update: Record<string, unknown>
    Relationships: {
        foreignKeyName: string
        columns: string[]
        isOneToOne?: boolean
        referencedRelation: string
        referencedColumns: string[]
    }[]
}
export interface GenericView {
    Row: Record<string, unknown>
    Relationships: {
        foreignKeyName: string
        columns: string[]
        isOneToOne?: boolean
        referencedRelation: string
        referencedColumns: string[]
    }[]
}
export interface GenericFunction {
    Args: Record<string, unknown>
    Returns: unknown
}

// We will test if each piece extends the Generic equivalent:
type Public = Database['public'];

// We assign string 'ok' to these, if they fail, they will be typed as 'error'
type TestTables = Public['Tables'] extends Record<string, GenericTable> ? 'ok' : 'error: Tables';
type TestViews = Public['Views'] extends Record<string, GenericView> ? 'ok' : 'error: Views';
type TestFunctions = Public['Functions'] extends Record<string, GenericFunction> ? 'ok' : 'error: Functions';
type TestEnums = Public['Enums'] extends Record<string, string> ? 'ok' : 'error: Enums';

const a: 'ok' = null as any as TestTables;
const b: 'ok' = null as any as TestViews;
const c: 'ok' = null as any as TestFunctions;
const d: 'ok' = null as any as TestEnums;
