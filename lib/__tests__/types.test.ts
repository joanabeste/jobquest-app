import { can, ROLE_PERMISSIONS } from '../types';
import type { WorkspaceRole, Permission } from '../types';

const ALL_PERMISSIONS: Permission[] = [
  'create_content', 'edit_content', 'delete_content', 'publish_content',
  'view_leads', 'export_leads', 'edit_company', 'manage_members', 'view_team',
];

describe('can(role, permission)', () => {
  test.each<WorkspaceRole>(['platform_admin', 'admin'])(
    '%s has all permissions',
    (role) => {
      for (const perm of ALL_PERMISSIONS) {
        expect(can(role, perm)).toBe(true);
      }
    },
  );

  test('editor can create, edit, publish, view_leads, export_leads', () => {
    expect(can('editor', 'create_content')).toBe(true);
    expect(can('editor', 'edit_content')).toBe(true);
    expect(can('editor', 'publish_content')).toBe(true);
    expect(can('editor', 'view_leads')).toBe(true);
    expect(can('editor', 'export_leads')).toBe(true);
  });

  test('editor cannot delete, edit_company, manage_members, view_team', () => {
    expect(can('editor', 'delete_content')).toBe(false);
    expect(can('editor', 'edit_company')).toBe(false);
    expect(can('editor', 'manage_members')).toBe(false);
    expect(can('editor', 'view_team')).toBe(false);
  });

  test('viewer can view_leads and view_team', () => {
    expect(can('viewer', 'view_leads')).toBe(true);
    expect(can('viewer', 'view_team')).toBe(true);
    const denied: Permission[] = ALL_PERMISSIONS.filter((p) => p !== 'view_leads' && p !== 'view_team');
    for (const perm of denied) {
      expect(can('viewer', perm)).toBe(false);
    }
  });

  test('undefined role always returns false', () => {
    for (const perm of ALL_PERMISSIONS) {
      expect(can(undefined, perm)).toBe(false);
    }
  });

  test('ROLE_PERMISSIONS keys match expected roles', () => {
    const roles: WorkspaceRole[] = ['platform_admin', 'admin', 'editor', 'viewer'];
    expect(Object.keys(ROLE_PERMISSIONS).sort()).toEqual(roles.sort());
  });
});
