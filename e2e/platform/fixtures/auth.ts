export type PlatformActor = 'full-admin' | 'read-only-admin' | 'limited-admin' | 'no-permission-admin' | 'member-a' | 'member-b' | 'anonymous';
export const actorStorageState = (actor: PlatformActor) => {
  const key = `PW_${actor.toUpperCase().replaceAll('-', '_')}_STORAGE_STATE`;
  return process.env[key] || undefined;
};
