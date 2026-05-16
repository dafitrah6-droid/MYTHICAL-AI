import { UserRole, ToolPermission } from '../types';
import { pool } from '../db';

export class AccessPolicies {
  /**
   * Maps User Roles to their allowed Tool Permissions.
   */
  private static readonly ROLE_PERMISSIONS: Record<UserRole, ToolPermission[]> = {
    admin: [
      'web_search', 
      'execute_code', 
      'analyze_files', 
      'api_network', 
      'schedule_tasks', 
      'system_admin'
    ],
    premium_user: [
      'web_search', 
      'execute_code', 
      'analyze_files', 
      'schedule_tasks'
    ],
    standard_user: [
      'web_search', 
      'analyze_files'
    ]
  };

  /**
   * Retrieves the permissions associated with a specific role.
   */
  static getPermissionsForRole(role: UserRole): ToolPermission[] {
    return this.ROLE_PERMISSIONS[role] || [];
  }

  /**
   * Checks if a user has ownership/access rights to a specific conversation.
   */
  static async canAccessConversation(userId: string, conversationId: string): Promise<boolean> {
    if (!userId || !conversationId) return false;

    try {
      const result = await pool.query(
        'SELECT id FROM conversations WHERE id = $1 AND user_id = $2',
        [conversationId, userId]
      );
      return result.rows.length > 0;
    } catch (error) {
      console.error('Policy Check Error (Conversation):', error);
      return false;
    }
  }

  /**
   * Checks if a user has ownership/access rights to a specific document.
   */
  static async canAccessDocument(userId: string, documentId: string): Promise<boolean> {
    if (!userId || !documentId) return false;

    try {
      const result = await pool.query(
        'SELECT id FROM documents WHERE id = $1 AND user_id = $2',
        [documentId, userId]
      );
      return result.rows.length > 0;
    } catch (error) {
      console.error('Policy Check Error (Document):', error);
      return false;
    }
  }
}
