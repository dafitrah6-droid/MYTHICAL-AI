import { ToolRegistry } from './registry';
import { ToolContext, ToolExecutionResult } from '../types';

export class ToolExecutionManager {
  /**
   * Safely executes a requested tool by validating existence, permissions, and input parameters.
   */
  static async executeTool(
    toolName: string, 
    args: any, 
    context: ToolContext
  ): Promise<ToolExecutionResult> {
    
    // 1. Validate Tool Existence
    const tool = ToolRegistry.get(toolName);
    if (!tool) {
      return {
        success: false,
        error: `ToolExecutionError: Tool '${toolName}' is not registered.`
      };
    }

    // 2. Validate Permissions
    const hasPermissions = tool.requiredPermissions.every(permission => 
      context.permissions.includes(permission)
    );
    
    if (!hasPermissions) {
      return {
        success: false,
        error: `SecurityError: Insufficient permissions to execute '${toolName}'. Required: ${tool.requiredPermissions.join(', ')}`
      };
    }

    // 3. Validate Input Safety
    try {
      const isInputSafe = tool.validateInput(args);
      if (!isInputSafe) {
        return {
          success: false,
          error: `ValidationError: Unsafe or invalid parameters provided for '${toolName}'.`
        };
      }
    } catch (validationError) {
      return {
        success: false,
        error: `ValidationError: Exception during parameter validation for '${toolName}'.`
      };
    }

    // 4. Execute Tool
    try {
      const result = await tool.execute(args, context);
      return {
        success: true,
        data: result
      };
    } catch (executionError) {
      console.error(`[ToolExecutor] Error executing ${toolName}:`, executionError);
      return {
        success: false,
        error: `ExecutionError: Tool '${toolName}' failed during execution.`
      };
    }
  }
}
