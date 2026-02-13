export type ComercialRole = 'director_comercial_general' | 'director_sede' | 'comercial';

export interface ComercialPermissions {
  canViewAllContacts: boolean;
  canViewSedeContacts: boolean;
  canViewOnlyAssigned: boolean;
  canAssignContacts: boolean;
  canAccessCampaigns: boolean;
  canManageComerciales: boolean;
}

/**
 * Returns permissions based on the user's comercial role.
 * A null role means the user is a regular owner/admin with full access (backwards compatible).
 */
export function getComercialPermissions(role: ComercialRole | null): ComercialPermissions {
  switch (role) {
    case 'director_comercial_general':
      return {
        canViewAllContacts: true,
        canViewSedeContacts: false,
        canViewOnlyAssigned: false,
        canAssignContacts: true,
        canAccessCampaigns: true,
        canManageComerciales: true,
      };
    case 'director_sede':
      return {
        canViewAllContacts: false,
        canViewSedeContacts: true,
        canViewOnlyAssigned: false,
        canAssignContacts: true,
        canAccessCampaigns: false,
        canManageComerciales: true,
      };
    case 'comercial':
      return {
        canViewAllContacts: false,
        canViewSedeContacts: false,
        canViewOnlyAssigned: true,
        canAssignContacts: false,
        canAccessCampaigns: false,
        canManageComerciales: false,
      };
    case null:
    default:
      // No comercial role = full access (backwards compatible)
      return {
        canViewAllContacts: true,
        canViewSedeContacts: false,
        canViewOnlyAssigned: false,
        canAssignContacts: true,
        canAccessCampaigns: true,
        canManageComerciales: true,
      };
  }
}
