# VestryHub - Architectural Decisions

This document explains the **why** behind key technical choices.

## 1. Why Supabase?

**Decision**: Use Supabase as Backend-as-a-Service instead of building custom backend

**Rationale**:
- **Postgres**: Mature, ACID-compliant, supports complex queries
- **RLS**: Built-in row-level security for multi-tenancy
- **Realtime**: WebSocket subscriptions out of the box
- **Auth**: Production-ready authentication with JWT
- **Storage**: Integrated CDN for file uploads
- **Edge Functions**: Serverless Deno for server-side logic
- **Speed**: Faster development vs building from scratch

**Tradeoffs**:
- ✅ Pro: Managed infrastructure, auto-scaling, backups
- ✅ Pro: TypeScript support throughout
- ❌ Con: Vendor lock-in (mitigated: Postgres is portable)
- ❌ Con: Some features require workarounds (like RPC functions)

---

## 2. Why TanStack Query (React Query)?

**Decision**: Use TanStack Query for all data fetching instead of Redux, Zustand, or raw useEffect

**Rationale**:
- **Server State ≠ Client State**: Church data lives on server, not in Redux
- **Caching**: Automatic, intelligent cache management
- **Stale-While-Revalidate**: Show cached data immediately, refetch in background
- **Optimistic Updates**: Instant UI feedback before server confirms
- **Devtools**: Inspect cache, queries, mutations in real-time
- **Less Boilerplate**: No need for action creators, reducers, sagas

**Alternatives Considered**:
- Redux: Too much boilerplate for server state
- SWR: Similar but less feature-rich
- Apollo: Overkill without GraphQL

**Example**:
```typescript
// Before (useEffect + useState)
const [members, setMembers] = useState([]);
const [loading, setLoading] = useState(true);
useEffect(() => {
  async function fetchMembers() {
    const { data } = await supabase.from('members').select('*');
    setMembers(data);
    setLoading(false);
  }
  fetchMembers();
}, []);

// After (TanStack Query)
const { data: members, isLoading } = useQuery({
  queryKey: ['members', tenantId],
  queryFn: async () => {
    const { data } = await supabase.from('members').select('*');
    return data;
  },
  staleTime: 300_000
});
```

---

## 3. Why Multi-Tenant Architecture?

**Decision**: Single database with tenant_id column instead of database-per-tenant

**Rationale**:
- **Cost**: One database cheaper than hundreds
- **Maintenance**: Single schema, single migration path
- **Scalability**: Postgres can handle millions of rows
- **Features**: Easier to add cross-tenant features (aggregated analytics)

**Security**:
- RLS policies enforce tenant isolation at database level
- Every query filters by tenant_id
- JWT contains tenant_id claim
- Impossible to query another tenant's data

**Alternatives Considered**:
- Database per tenant: Expensive, complex migrations
- Separate schemas: Still management overhead
- Microservices: Over-engineered for SaaS

---

## 4. Why Unified Identity (users + members)?

**Decision**: Some people have BOTH users AND members records with same ID

**Rationale**:
- **Dual Roles**: Church admin who is also a member needs:
  - Admin dashboard access (users table)
  - Member portal access (members table)
  - Unified giving/attendance records (members table)
- **Flexibility**: Not all members need portal access
- **Simplicity**: Single ID links everything

**How it Works**:
```
Super Admin (Victor):
  auth.users.id = "abc123"
  users.id = "abc123" (role: super_admin)
  members.id = "abc123" (same person)
  
Regular Member (John):
  members.id = "def456" (no users record, no login)
  
Member with Portal (Sarah):
  auth.users.id = "ghi789"
  members.id = "ghi789" (no users record, member-only access)
```

---

## 5. Why Africa's Talking for SMS?

**Decision**: Use Africa's Talking instead of Twilio or other providers

**Rationale**:
- **Market**: Focused on African market (Kenya, Nigeria, etc.)
- **Cost**: Cheaper rates than Twilio in Africa
- **Reliability**: Better delivery in Kenya specifically
- **Local**: Understands local telecom regulations

**Alternatives**:
- Twilio: More expensive in Africa
- AWS SNS: Complex setup, worse support

---

## 6. Why PayHero for Payments?

**Decision**: PayHero for M-Pesa integration instead of direct Safaricom API

**Rationale**:
- **Simplicity**: Abstracts Safaricom's complex API
- **Compliance**: Handles PCI compliance
- **Multi-Channel**: M-Pesa + bank transfers in one
- **Webhooks**: Reliable payment notifications

**Alternatives**:
- Direct Safaricom: Complex, requires certification
- Stripe: Limited M-Pesa support
- Pesapal: Good alternative, but chosen PayHero for simplicity

---

## 7. Why Edge Functions Instead of Traditional Backend?

**Decision**: Use Supabase Edge Functions (Deno) instead of Node.js/Express API

**Rationale**:
- **Serverless**: No server management, auto-scaling
- **Security**: Keep API keys secret
- **Colocation**: Backend logic lives with database
- **TypeScript**: Same language as frontend
- **Cost**: Pay per invocation, not per server hour

**When to Use**:
- ✅ Sending SMS/email (API keys)
- ✅ Payment processing (webhooks)
- ✅ Role changes (elevated permissions)
- ❌ Simple CRUD (use Supabase client directly)
- ❌ Real-time updates (use Realtime)

---

## 8. Why Resend for Email?

**Decision**: Resend instead of SendGrid, Mailgun, or AWS SES

**Rationale**:
- **Developer Experience**: Simple API, great docs
- **Reliability**: Built by Vercel team
- **React Email**: Native React template support
- **Cost**: Generous free tier, competitive pricing

**Alternatives**:
- SendGrid: More expensive, complex dashboard
- Mailgun: Legacy UI, harder setup
- AWS SES: Requires more config

---

## 9. Why Firebase for Push Notifications?

**Decision**: Firebase Cloud Messaging (FCM) for push notifications

**Rationale**:
- **Cross-Platform**: Web + mobile (future)
- **Free**: No cost for push notifications
- **Reliable**: Google infrastructure
- **Integration**: Works with Supabase

**Implementation**:
- Service worker for web push
- FCM token stored in `device_tokens` table
- Edge function sends notifications via FCM API

---

## 10. Why Vite Instead of Create React App?

**Decision**: Vite as build tool

**Rationale**:
- **Speed**: 10x faster dev server startup
- **HMR**: Instant hot module replacement
- **Bundle Size**: Smaller production builds
- **Modern**: Native ESM, optimized for modern browsers
- **Maintained**: CRA is deprecated

**Alternatives**:
- CRA: Deprecated, slow
- Next.js: Overkill for SPA (VestryHub is not SSR)
- Webpack: Complex config

---

## 11. Why Separate Member Portal?

**Decision**: Member portal as separate route section, not separate app

**Rationale**:
- **Code Reuse**: Share components, utilities, types
- **Single Deployment**: One build, one deploy
- **Context Separation**: MemberPortalContext vs ChurchContext
- **Different Auth Flow**: Members don't need admin features

**Structure**:
```
/dashboard → Admin (ChurchContext)
/people → Admin
/finance → Admin
/member/welcome → Member Portal (MemberPortalContext)
/member/give → Member Portal
```

---

## 12. Why Schema Constants?

**Decision**: `TABLES` and `COLS` constants instead of hardcoded strings

**Rationale**:
- **Typo Protection**: TypeScript catches mistakes
- **Refactoring**: Rename in one place
- **Discoverability**: Autocomplete shows all tables
- **Documentation**: Single source of truth

**Rule**: NEVER hardcode table/column names

```typescript
// BAD
await supabase.from('donations').select('*').eq('church_id', id);

// GOOD
await supabase.from(TABLES.GIVING_RECORDS).select('*').eq(COLS.TENANT_ID, id);
```

---

## 13. Why Lazy Loading?

**Decision**: Lazy load routes and heavy libraries

**Rationale**:
- **Initial Load**: Faster first paint
- **Code Splitting**: Only load what's needed
- **Bundle Size**: Keep main bundle < 500KB
- **User Experience**: Perceived performance boost

**Lazy Loaded**:
- All route components via `React.lazy()`
- Recharts (charts library)
- ReactPlayer (video player)
- TipTap (rich text editor)
- React Big Calendar

---

## 14. Why Optimistic Updates?

**Decision**: Use optimistic mutations for better UX

**Rationale**:
- **Perceived Speed**: UI updates instantly
- **User Confidence**: Feels responsive
- **Rollback**: Undo if server fails
- **Industry Standard**: Used by Twitter, Gmail, etc.

**Example**:
```typescript
useMutation({
  mutationFn: deleteMember,
  onMutate: async (memberId) => {
    // Remove from UI immediately
    setMembers(prev => prev.filter(m => m.id !== memberId));
  },
  onError: (err, memberId, context) => {
    // Put it back if failed
    setMembers(context.previousMembers);
    toast.error('Failed to delete');
  }
});
```

---

## 15. Why No Redux?

**Decision**: Avoid Redux, use Context + TanStack Query

**Rationale**:
- **Server State**: TanStack Query handles it better
- **Global UI State**: Context is enough (theme, auth)
- **Boilerplate**: Redux adds complexity
- **Learning Curve**: Easier onboarding without Redux

**What We Use**:
- TanStack Query: Server state (members, events, etc.)
- Context: Auth, church data, theme
- Local State: Component-specific UI state

---

## 16. Why Staff Directory Design?

**Decision**: Separate "discovery threads" from "private threads"

**Rationale**:
- **Scalability**: Hundreds of members, dozens of staff
- **Privacy**: Each member gets own private conversation
- **Discovery**: Staff directory shows all available staff
- **Clean Inbox**: Staff don't see each other's member chats

**Alternative Considered**:
- Shared threads: Would mix all members together
- No directory: Members wouldn't know who to message

---

## Summary of Tech Choices

| Need | Choice | Why |
|------|--------|-----|
| Backend | Supabase | Managed Postgres, RLS, Realtime |
| State Management | TanStack Query | Server state caching |
| Auth | Supabase Auth | JWT, magic links, OAuth |
| Styling | Tailwind + shadcn | Utility-first, consistent |
| Routing | React Router 6 | Industry standard |
| Forms | React Hook Form + Zod | Type-safe validation |
| SMS | Africa's Talking | Africa-focused |
| Email | Resend | Simple, reliable |
| Payments | PayHero | M-Pesa integration |
| Push | Firebase FCM | Free, cross-platform |
| Build | Vite | Fast, modern |
| Icons | Lucide React | Consistent, tree-shakeable |
| Charts | Recharts | React-native, composable |

---

**Next**: Read `09-known-issues.md` for current limitations.
