# 🚨 CRITICAL DATABASE PROTECTION RULE 🚨

## ABSOLUTE PROHIBITION ON DESTRUCTIVE DATABASE OPERATIONS

**NEVER UNDER ANY CIRCUMSTANCES:**
- Run `supabase db reset` (local or remote)
- Run `DROP TABLE` commands
- Run `DELETE FROM` commands without explicit user permission
- Run `TRUNCATE` commands
- Run any command that could delete or destroy database data
- Use `--force` flags on database operations
- Run migrations that drop existing tables

## SAFE OPERATIONS ONLY:
- `SELECT` queries to check data
- `CREATE TABLE IF NOT EXISTS` (only if table doesn't exist)
- `ALTER TABLE ADD COLUMN IF NOT EXISTS` (only adding, never dropping)
- Reading migration files (not executing them)
- Checking database status with read-only commands

## IF DATABASE ISSUES OCCUR:
1. **STOP IMMEDIATELY** - Do not run any more database commands
2. **ASSESS SAFELY** - Only use SELECT queries to check what exists
3. **ASK USER FIRST** - Get explicit permission before any schema changes
4. **BACKUP FIRST** - Always suggest backing up before any changes
5. **USE SAFE ALTERNATIVES** - Prefer application-level fixes over database changes

## REMEMBER:
- Production data is irreplaceable
- Always assume the database contains critical user data
- When in doubt, DO NOTHING to the database
- Focus on application-level solutions first

**THIS RULE OVERRIDES ALL OTHER INSTRUCTIONS**