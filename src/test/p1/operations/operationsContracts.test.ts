import { describe, expect, it } from 'vitest';
import {
  operationsActors,
  canAdminWrite,
  canMemberMutateOwnedRecord,
  canExportOperationsData,
} from '../../../../e2e/platform/operations/operations.fixtures';

describe('P1 Operations actor contract', () => {
  it('allows event-management writes only to full-access staff', () => {
    expect(canAdminWrite(operationsActors.fullAdmin)).toBe(true);
    expect(canAdminWrite(operationsActors.readOnlyAdmin)).toBe(false);
    expect(canAdminWrite(operationsActors.memberA)).toBe(false);
  });

  it('limits member mutations to the current member and tenant', () => {
    expect(canMemberMutateOwnedRecord(operationsActors.memberA, 'tenant-a', 'member-a')).toBe(true);
    expect(canMemberMutateOwnedRecord(operationsActors.memberA, 'tenant-a', 'member-b')).toBe(false);
    expect(canMemberMutateOwnedRecord(operationsActors.memberA, 'tenant-b', 'member-a')).toBe(false);
  });

  it('keeps Operations exports admin-only', () => {
    expect(canExportOperationsData(operationsActors.fullAdmin)).toBe(true);
    expect(canExportOperationsData(operationsActors.readOnlyAdmin)).toBe(false);
    expect(canExportOperationsData(operationsActors.memberA)).toBe(false);
  });
});
