export type OperationsActor = {
  kind: 'admin' | 'member';
  tenantId: string;
  memberId?: string;
  eventManagement: 'full_access' | 'read_only' | 'none';
};

export const operationsActors = {
  fullAdmin: { kind: 'admin', tenantId: 'tenant-a', eventManagement: 'full_access' },
  readOnlyAdmin: { kind: 'admin', tenantId: 'tenant-a', eventManagement: 'read_only' },
  memberA: { kind: 'member', tenantId: 'tenant-a', memberId: 'member-a', eventManagement: 'none' },
  memberB: { kind: 'member', tenantId: 'tenant-a', memberId: 'member-b', eventManagement: 'none' },
  tenantBMember: { kind: 'member', tenantId: 'tenant-b', memberId: 'member-z', eventManagement: 'none' },
} satisfies Record<string, OperationsActor>;

export const canAdminWrite = (actor: OperationsActor) =>
  actor.kind === 'admin' && actor.eventManagement === 'full_access';

export const canMemberMutateOwnedRecord = (
  actor: OperationsActor,
  tenantId: string,
  memberId: string,
) => actor.kind === 'member' && actor.tenantId === tenantId && actor.memberId === memberId;

export const canExportOperationsData = (actor: OperationsActor) => canAdminWrite(actor);
