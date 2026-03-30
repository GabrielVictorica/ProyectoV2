# EntreInmobiliarios - Sistema de Gestión Inmobiliaria Multi-Agencia

## Stack Tecnológico
- **Framework**: Next.js 15 (App Router) con TypeScript
- **Base de datos**: Supabase (PostgreSQL + Auth + RLS)
- **Estado**: TanStack React Query v5 (staleTime 60s, gcTime 5min, no refetchOnWindowFocus)
- **UI**: Tailwind CSS + Radix UI + shadcn/ui + Framer Motion + Lucide icons
- **Forms**: React Hook Form + Zod
- **Notificaciones**: Sonner (toast)
- **Tema**: Dark mode exclusivo (bg-[#030712])
- **Deploy**: Vercel (Analytics + SpeedInsights)

## Arquitectura de Carpetas

```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root: QueryProvider + AuroraBackground + Toaster
│   ├── login/                    # Página de login pública
│   ├── dashboard/                # Layout protegido (DashboardLayout con sidebar)
│   │   ├── page.tsx              # Inicio (KPIs) - solo god
│   │   ├── crm/                  # CRM Relaciones
│   │   ├── clients/              # Búsquedas (compradores/vendedores)
│   │   ├── properties/           # Propiedades - solo god
│   │   ├── closings/             # Operaciones (reservas/cierres)
│   │   ├── my-week/              # Mi Semana (actividades semanales)
│   │   ├── objectives/           # Control y Objetivos
│   │   ├── competition/          # Copa de Productividad
│   │   ├── team/                 # Mi Equipo
│   │   └── admin/                # Admin (organizations, users, billing) - solo god
│   └── api/                      # API Routes
│       ├── transactions/         # CRUD transacciones + métricas
│       ├── admin/                # Billing, organizations
│       ├── auth/restore-god/     # Recovery endpoint
│       └── seed/                 # Seed data
├── features/                     # Feature modules (dominio)
│   ├── auth/                     # Hooks: useAuth, useLogin, useLogout, usePermissions
│   ├── crm/                      # CRM: personas, historial, timeline, notas
│   ├── clients/                  # Búsquedas: person_searches, privacidad, NURC
│   ├── transactions/             # Operaciones: reservas, cierres, comisiones
│   ├── properties/               # Propiedades: hooks de consulta
│   ├── dashboard/                # Dashboard KPIs
│   ├── objectives/               # Objetivos financieros y metas
│   ├── weekly-activities/        # Actividades semanales (grilla 7x9)
│   ├── team/                     # Equipo: teamActions, useTeamMembers
│   ├── admin/                    # Admin: CRUD orgs/usuarios, billing
│   └── competition/              # Copa entre equipos
├── components/
│   ├── layouts/DashboardLayout   # Sidebar + navegación + prefetch
│   └── ui/                       # shadcn/ui components
├── lib/
│   ├── supabase/                 # client.ts, server.ts, admin.ts, middleware.ts
│   ├── react-query/provider.tsx  # QueryClient config
│   ├── formatters.ts             # Formateo de moneda
│   └── utils.ts                  # cn() helper
└── types/
    └── database.types.ts         # Tipos generados de Supabase (SSOT del schema)
```

## Sistema de Roles (RBAC)

| Rol | Código | Acceso |
|-----|--------|--------|
| Super Admin | `god` | Todo el sistema, todas las orgs, admin panel |
| Broker | `parent` | Su organización + agentes que reportan, equipo |
| Agente | `child` | Solo sus propios datos |

**Protección en 3 niveles**:
1. **Middleware** (`src/lib/supabase/middleware.ts`): Bloquea /dashboard sin sesión, /admin sin god
2. **Server Actions/API**: Verifican rol y filtran por org/agent
3. **Componentes**: `usePermissions()` condiciona UI (sidebar, filtros, botones)

## Tablas Principales de Supabase

| Tabla | Propósito | FK principales |
|-------|-----------|----------------|
| `profiles` | Usuarios (role, organization_id, parent_id, default_split_percentage) | → organizations, → profiles(parent) |
| `organizations` | Inmobiliarias (name, slug, royalty_percentage, cuit) | |
| `organization_addresses` | Direcciones estructuradas (office/billing) | → organizations |
| `profile_supervisors` | Relación N:N supervisor-agente | → profiles x2 |
| `persons` | Contactos CRM (datos personales, relationship_status, lifecycle_status, tags, is_vip) | → organizations, → profiles(agent), → persons(referred_by) |
| `person_history` | Auditoría CRM (event_type, field_name, old/new_value, metadata) | → persons, → profiles(agent) |
| `person_searches` | Búsquedas de compradores/vendedores (budget, zones, property_types, NURC) | → persons, → organizations |
| `client_interactions` | Historial de seguimientos (type, content) | → person_searches, → profiles |
| `properties` | Propiedades listadas (title, price, city, operation_type) | → property_types, → property_statuses, → profiles(agent) |
| `property_types` | Catálogo: Casa, Depto, PH, Local, etc. | |
| `property_statuses` | Catálogo: estados de propiedad | |
| `transactions` | Operaciones (price, comisiones, sides/puntas, status) | → properties, → profiles(agent), → organizations, → persons(buyer/seller) |
| `activities` | Actividades semanales (type, date, visit_metadata) | → profiles, → persons, → transactions |
| `weekly_notes` | Notas semanales del agente | → profiles |
| `agent_objectives` | Metas financieras anuales | → profiles |
| `clients` | (Legacy, migrado a person_searches) | |

**Vistas materializadas**:
- `view_agent_progress` — Progreso individual vs objetivos
- `view_agent_progress_extended` — Con datos de perfil
- `view_team_objectives_summary` — Métricas agregadas del equipo
- `view_financial_metrics` — Métricas financieras históricas
- `view_anonymous_clients` — Búsquedas con PII eliminado (para red)

## Conexiones Críticas entre Módulos

### CRM → Búsquedas → Transacciones (Flujo Principal)

```
PERSONA (CRM)
  ├── Tiene N búsquedas (person_searches via person_id)
  ├── Puede ser comprador en transacción (transactions.buyer_person_id)
  └── Puede ser vendedor en transacción (transactions.seller_person_id)

TRANSACCIÓN (Operación)
  ├── Creación (POST /api/transactions) → status='pending' (RESERVA)
  │   ├── Auto-actualiza persons.relationship_status → 'reserva'
  │   ├── Auto-actualiza persons.last_interaction_at
  │   ├── Auto-registra person_history (lifecycle_change)
  │   ├── Auto-actualiza person_searches.last_interaction_at
  │   └── Auto-genera activity tipo 'reserva'
  │
  ├── Cierre (closeReservationAction) → status='completed' (CIERRE)
  │   ├── Recalcula comisiones (gross, net, master, office)
  │   ├── Auto-actualiza persons.relationship_status → 'cierre'
  │   ├── Auto-cierra person_searches del comprador (status='closed')
  │   ├── Auto-registra person_history
  │   └── Auto-genera activity tipo 'cierre' por cada persona
  │
  └── Cancelación (cancelReservationAction) → status='cancelled'
      ├── Revierte persons.relationship_status al valor previo
      ├── Opcionalmente cierra/reactiva búsqueda del comprador
      └── Auto-registra person_history
```

### Actividades Semanales → CRM

```
ACTIVIDAD (WeeklyGrid)
  ├── Tipos: reunion_verde, pre_listing, pre_buying, acm, captacion, visita, referido
  ├── Reserva y Cierre son VIRTUALES (vienen de transactions, no se crean manualmente)
  ├── Al guardar actividad → ofrece actualizar person.relationship_status en CRM
  ├── Visitas tienen visit_metadata: { punta, buyer_person_id, seller_person_id, property_address }
  └── "Ambas" puntas cuentan como 2 reuniones verdes
```

### Objetivos → Actividades + Transacciones

```
OBJETIVOS (agent_objectives)
  ├── Meta anual de facturación (annual_billing_goal)
  ├── Progreso real viene de view_agent_progress (suma de transacciones)
  ├── Targets semanales: reuniones verdes (15), PL/PB (dinámico), referidos (2)
  └── KPIs del WeeklyDashboard consultan activities + transactions de la semana
```

### Modelo de Comisiones (Triple Split)

```
gross_commission = actual_price × (commission_percentage / 100) × sides
master_commission = gross_commission × (org.royalty_percentage / 100)    → Dios (Master)
net_commission    = gross_commission × (agent_split_percentage / 100)    → Agente
office_commission = gross_commission - master - net                      → Oficina (Broker)
```

## Flujo del CRM: Estados de Relación (Persona)

```
contacto_telefonico → reunion_verde → pre_listing/pre_buying → acm → captacion → visita → reserva → cierre
                                                                                     ↑ referido (alternativo)
```

**Lifecycle status** (ortogonal al relationship_status):
- `active` → contacto activo
- `following_up` → necesita seguimiento
- `lost` → perdido (requiere lost_reason)

**Semáforo de salud** (HealthScoreBadge):
- Calculado desde `last_interaction_at`
- CRM: ≤15d verde, 15-45d amarillo, >45d rojo
- Búsquedas: ≤3d verde, 3-7d amarillo, 7-14d atención, ≥14d crítico

## Sistema de Privacidad (Búsquedas)

| Scope | Quién ve | Qué ve |
|-------|----------|--------|
| `personal` | Agente | Sus propias búsquedas con datos completos |
| `office` | Parent/God | Búsquedas de la organización con datos completos |
| `network` | Todos | Búsquedas de otros agentes SIN datos personales (PII stripped) |
| `global` | God | Todo con datos completos |

**PII que se oculta en network**: nombre real, email, teléfono, fuente
**Visible en network**: presupuesto, zonas, tipo propiedad, NURC, nombre agente

## NURC (Perfil Psicológico del Comprador)

- **N**ecesidad: Por qué busca
- **U**rgencia: Timeline/plazo
- **R**ealismo: Factibilidad
- **C**apacidad: Capacidad financiera

Almacenado en `person_searches.motivation` como texto `"N: ...\nU: ...\nR: ...\nC: ..."`
Niveles: incomplete (<20 chars/campo), partial (20-50 avg), complete (≥50 avg)

## Patrones de Código

### Query Keys (SSOT por módulo)
```ts
// Cada feature tiene sus keys centralizados
authKeys    = { all: ['auth'], user: () => [..., 'user'] }
crmKeys     = { all: ['crm'], persons: (f) => [..., 'persons', f] }
clientKeys  = { all: ['clients'], list: (f) => [..., 'list', f] }
propertyKeys = { all: ['properties'], types: () => [..., 'types'] }
transactionKeys = { all: ['transactions'], list: (f) => [..., 'list', f] }
teamKeys    = { all: ['team-members'], list: () => [..., 'list'] }
```

### Patrón de Server Actions
```ts
// 1. Auth check (createClient → getUser → getProfile)
// 2. Validate input (Zod schema)
// 3. Role-based filtering (god/parent/child)
// 4. Execute query con adminClient (bypass RLS para performance)
// 5. revalidatePath() para ISR
// 6. Return ActionResult<T> = { success, data? } | { success: false, error }
```

### Patrón de API Routes (transactions)
```ts
// GET/POST/PUT/DELETE en route.ts
// verifyUser() → profile.role → filtrado manual de seguridad
// adminClient para queries (RLS bypass con seguridad manual)
// Auto-sync: persons, person_searches, person_history, activities
```

## Comandos

```bash
npm run dev    # Desarrollo local
npm run build  # Build de producción
npm run lint   # ESLint
```

## Reglas Importantes

- **Nuevas transacciones SIEMPRE son status='pending' (reserva)**. Los cierres se hacen via `closeReservationAction`
- **No crear archivos nuevos si se puede editar uno existente**
- **Toda mutación que toca persons debe actualizar person_history** (auditoría)
- **Toda mutación que toca transacciones debe sincronizar**: persons, person_searches, person_history, activities
- **Los tipos de propiedad son UUIDs** referenciados en property_types, no strings
- **Timezone**: Argentina (America/Argentina/Buenos_Aires) para fechas de actividades
- **Sidebar items**: Condicionados por rol en DashboardLayout (no hardcoded)
- **usePropertyTypes()** se usa en Búsquedas y CRM para resolver nombres de tipos
- **generateSearchClipboardText()** formatea búsquedas para compartir por WhatsApp (sin PII)
