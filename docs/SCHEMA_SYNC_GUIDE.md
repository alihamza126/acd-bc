# Schema Sync Guide

## Overview
When making changes to `prisma/schema.prisma`, you **MUST** also update `docs/DB_SCHEMA_BASE_DESIGN.dbml` to keep them in sync.

## Workflow

### 1. Make Changes to Prisma Schema
Edit `prisma/schema.prisma` with your changes.

### 2. Update DBML File
Manually update `docs/DB_SCHEMA_BASE_DESIGN.dbml` to reflect the same changes:

- **Table definitions** - Add/remove/modify tables
- **Fields** - Add/remove/modify fields, types, constraints
- **Indexes** - Add/remove indexes
- **Relationships** - Add/remove foreign key relationships

### 3. Generate Prisma Client
```bash
npm run prisma:generate
```

### 4. Create Migration
```bash
npm run prisma:migrate
```

## Recent Changes Made

### Added Field: `last_username_change_at`
- **Table:** `user_security`
- **Type:** `timestamp` (nullable)
- **Purpose:** Track when username was last changed (for 1 month limit)
- **Location in DBML:** Line ~37 in `user_security` table

## Checklist After Schema Changes

- [ ] Update `prisma/schema.prisma`
- [ ] Update `docs/DB_SCHEMA_BASE_DESIGN.dbml` with same changes
- [ ] Run `npm run prisma:generate`
- [ ] Run `npm run prisma:migrate`
- [ ] Verify both files are in sync
- [ ] Commit both files together

## DBML File Structure

The DBML file follows this structure:
```
// ==============================
// SECTION NAME
// ==============================

Table table_name {
  field_name type [constraints]
  ...
  
  indexes {
    ...
  }
}

// Relationships
Ref: table.field > other_table.field
```

## Common Changes

### Adding a Field
1. Add to Prisma model
2. Add to DBML table definition
3. Update relationships if needed

### Adding a Table
1. Add Prisma model
2. Add DBML table definition
3. Add relationships section

### Modifying Relationships
1. Update Prisma relations
2. Update DBML Ref statements

## Verification

After making changes, verify:
- All tables in schema exist in DBML
- All fields match between schema and DBML
- All relationships are documented in DBML
- Indexes are consistent

## Notes

- DBML is for documentation purposes
- Prisma schema is the source of truth for database structure
- Keep them synchronized for accurate documentation
- DBML can be used with tools like dbdiagram.io for visual diagrams
