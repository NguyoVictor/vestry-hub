# VestryHub Documentation

Complete technical documentation for the VestryHub Church Management SaaS Platform.

## Documentation Index

Read these documents in order for the best onboarding experience:

### 1. [Overview](./00-overview.md)
**Start here.** High-level introduction to VestryHub, tech stack, multi-tenant architecture, and system design. Includes architecture diagrams showing how all the pieces connect.

**Key Topics**:
- What VestryHub is and what it does
- Complete tech stack (React, TypeScript, Supabase, etc.)
- Multi-tenant isolation strategy
- High-level architecture diagrams
- Design principles and project philosophy

---

### 2. [Folder Structure](./01-folder-structure.md)
Comprehensive walkthrough of the entire codebase. Explains what lives in each folder and why, with file-by-file descriptions.

**Key Topics**:
- `/src` structure (pages, components, hooks, contexts)
- `/supabase` structure (migrations, edge functions)
- Component organization patterns
- Naming conventions
- Where to find specific features

---

### 3. [Identity & Data Model](./02-identity-and-data-model.md)
The unified identity system, complete database schema, and table relationships. Includes detailed ER diagrams.

**Key Topics**:
- Users vs Members vs Tenants
- Unified identity design (when someone is BOTH admin AND member)
- Every table with every column documented
- Entity relationship diagrams
- Schema constants (`TABLES` and `COLS`)
- RLS policy patterns

---

### 4. [Church Lifecycle](./03-church-lifecycle.md)
Step-by-step user journeys: church signup, admin invites, member addition, visitor conversion, and portal access. Includes sequence and flowchart diagrams.

**Key Topics**:
- Church onboarding wizard
- 3 ways to add admin users (email invite, direct add, reactivation)
- 4 ways to add members (admin-added, CSV import, visitor conversion, self-registration)
- Visitor pipeline and follow-up workflow
- Staff directory and messaging system
- Permission inheritance

---

### 5. [Authentication & Permissions](./04-authentication-and-permissions.md)
Complete security model: auth flows, permission system, RLS policies, and role hierarchy.

**Key Topics**:
- Admin login vs Member portal login
- Magic link and OAuth flows
- `usePermissions` hook
- Role hierarchy (super_admin → admin → pastor → staff → member)
- PermissionButton component
- RLS policies and enforcement
- JWT claims and session management

---

### 6. [Edge Functions](./05-edge-functions.md)
Every server-side edge function: what it does, why it exists, and when it's triggered.

**Key Topics**:
- All 9 edge functions documented
- When to use edge functions vs client-side
- Common patterns (JWT verification, tenant checks, credit deduction)
- Deployment and secrets management
- Monitoring and logging

---

### 7. [Messaging System](./06-messaging-system.md)
Full messaging architecture: staff directory, private threads, group chats, and real-time updates.

**Key Topics**:
- Three-table design (conversations, participants, messages)
- Staff directory vs private threads
- Admin-to-member and member-to-staff messaging
- Message send flow and optimistic updates
- Realtime subscriptions
- Unread count management
- Group chat creation

---

### 8. [Feature Modules](./07-feature-modules.md)
Module-by-module breakdown of all major features: People, Finance, Communications, Events, Media, Growth, Security, Analytics, Settings, and Member Portal.

**Key Topics**:
- 10 feature modules explained
- Key pages and components per module
- Database tables used by each
- Integration points
- Feature-specific logic

---

### 9. [Architectural Decisions](./08-architectural-decisions.md)
The **why** behind every major technical choice. Explains rationale, alternatives considered, and tradeoffs.

**Key Topics**:
- Why Supabase?
- Why TanStack Query?
- Why multi-tenant architecture?
- Why unified identity?
- Why each third-party service (Africa's Talking, PayHero, Resend, Firebase, etc.)
- Why Edge Functions?
- Why separate member portal?
- Why schema constants?
- Tech choice summary matrix

---

### 10. [Known Issues](./09-known-issues.md)
Current limitations, incomplete features, technical debt, and areas needing improvement.

**Key Topics**:
- Critical issues (schema mismatch, permission system gaps)
- Performance concerns (dashboard queries, member list)
- Security gaps (rate limiting, audit logs)
- UI/UX issues (loading states, empty states)
- Technical debt (large components, TypeScript `any` usage)
- Priority matrix for addressing issues

---

## Quick Reference

### For New Developers
1. Read **00-overview.md** first
2. Skim **01-folder-structure.md** to orient yourself
3. Deep dive **02-identity-and-data-model.md** for database understanding
4. Reference others as needed when working on specific features

### For Feature Development
- **Adding a new page?** → Read 01-folder-structure.md, 04-authentication-and-permissions.md
- **Database changes?** → Read 02-identity-and-data-model.md, use `schema.ts` constants
- **API integration?** → Read 05-edge-functions.md
- **Messaging features?** → Read 06-messaging-system.md
- **Need to understand why?** → Read 08-architectural-decisions.md

### For Debugging
- **Auth issues?** → 04-authentication-and-permissions.md
- **Permission gates not working?** → 04-authentication-and-permissions.md
- **Message not sending?** → 06-messaging-system.md
- **Performance problems?** → 09-known-issues.md

### For DevOps
- **Deployment?** → 00-overview.md (Deployment section)
- **Environment variables?** → 00-overview.md, 05-edge-functions.md
- **Edge function deployment?** → 05-edge-functions.md

---

## Documentation Conventions

### Diagrams
All diagrams use **Mermaid** syntax for version control and easy updates:
- Sequence diagrams for flows (auth, messaging, etc.)
- Flowcharts for decision trees (permissions, workflows)
- ER diagrams for database relationships
- Architecture diagrams for system design

### Code Examples
- TypeScript for all code samples
- Real file paths referenced
- Actual table/column names from `schema.ts`
- Both "before" and "after" examples where helpful

### File References
- Absolute paths from project root: `src/pages/people/Members.tsx`
- Component names: `MemberProfile`
- Table names: Always use `TABLES.MEMBERS` constant format
- Column names: Always use `COLS.TENANT_ID` constant format

---

## Keeping Documentation Updated

### When to Update
- ✅ Adding a new feature module
- ✅ Changing database schema
- ✅ Modifying authentication flow
- ✅ Adding/removing edge functions
- ✅ Discovering new issues
- ✅ Resolving known issues

### How to Update
1. Edit the relevant `.md` file in `/docs`
2. Update diagrams if structure changed
3. Add to **09-known-issues.md** if introducing technical debt
4. Update **08-architectural-decisions.md** if making new tech choice

### Review Schedule
- Monthly: Review known issues
- Quarterly: Review entire documentation
- Major releases: Update all diagrams

---

## Contributing to Documentation

### Style Guide
- **Clear and concise**: No fluff, get to the point
- **Practical examples**: Show real code, not pseudo-code
- **Visual aids**: Use diagrams liberally
- **Beginner-friendly**: Explain acronyms, assume zero context
- **Up-to-date**: Remove outdated info immediately

### Pull Request Template
When submitting documentation updates:
```markdown
## Documentation Update

**What changed:**
- Brief description of technical change

**Documentation affected:**
- List of .md files updated

**Diagrams updated:**
- [ ] Architecture diagrams
- [ ] Sequence diagrams
- [ ] ER diagrams

**Verified:**
- [ ] Code examples tested
- [ ] File paths correct
- [ ] Links work
- [ ] Mermaid diagrams render
```

---

## Additional Resources

### External Documentation
- [Supabase Docs](https://supabase.com/docs)
- [TanStack Query Docs](https://tanstack.com/query/latest)
- [React Router Docs](https://reactrouter.com/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com/)

### Project Files
- `.env.example` - Environment variable template
- `package.json` - Dependency list
- `schema.ts` - Table/column constants (source of truth)
- `.kiro/steering/` - Kiro AI assistant steering rules

### Internal References
- Phase spec files (archived, prefer this documentation)
- Implementation summary files (task completion records)
- Migration files (database change history)

---

## Support

**Questions about the documentation?**
- Open an issue on GitHub
- Discuss in team channels
- Propose improvements via PR

**Need clarification on a feature?**
- Check the relevant doc first
- Search GitHub issues
- Ask in development chat

**Found an error in the docs?**
- Open a PR with the fix
- Or create an issue describing the error

---

**Last Updated**: January 2025  
**Documentation Version**: 1.0  
**VestryHub Version**: Production Release

---

## Document Change Log

| Date | Document | Change |
|------|----------|--------|
| Jan 2025 | All | Initial comprehensive documentation created |

---

**Ready to start developing?** Begin with [00-overview.md](./00-overview.md) and work your way through. Happy coding! 🚀
