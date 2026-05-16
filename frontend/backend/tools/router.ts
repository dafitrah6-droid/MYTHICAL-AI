import { GoogleGenAI } from '@google/genai';
import { ToolRegistry } from './registry';
import { ToolExecutionManager } from './executor';
import { ToolContext, ToolExecutionResult } from '../types';

// Initialize the SDK. Assumes process.env.API_KEY is available in the environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY, vertexai: true });

export class ToolRouter {
  /**
   * Routes a user query to the appropriate tool using Gemini's function calling.
   * Implements fallback logic if the model fails to select a tool but the intent is clear.
   */
  static async routeAndExecute(
    query: string, 
    context: ToolContext
  ): Promise<ToolExecutionResult | null> {
    
    if (!query || typeof query !== 'string') {
      throw new Error('RouterError: Invalid query provided.');
    }

    // 1. Get permitted tools for this specific user context
    const permittedDeclarations = ToolRegistry.getPermittedDeclarations(context.permissions);
    
    if (permittedDeclarations.length === 0) {
      return null; // No tools available for this user
    }

    try {
      // 2. Ask Gemini to route the request
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: query,
        config: {
          tools: [{ functionDeclarations: permittedDeclarations }],
          temperature: 0.1, // Low temperature for deterministic tool selection
        }
      });

      // 3. Check for explicit tool calls
      if (response.functionCalls && response.functionCalls.length > 0) {
        // For architectural foundation, we handle the first tool call
        const call = response.functionCalls[0];
        
        return await ToolExecutionManager.executeTool(
          call.name, 
          call.args, 
          context
        );
      }

      // 4. Fallback Tool Selection Logic
      // If Gemini didn't pick a tool, but the user explicitly asked for an action
      return this.evaluateFallback(query, context);

    } catch (error) {
      console.error('[ToolRouter] Routing failed:', error);
      return {
        success: false,
        error: 'RouterError: Failed to communicate with routing engine.'
      };
    }
  }

  /**
   * Fallback logic to catch obvious intents that the model might have missed
   * or refused to route due to prompt phrasing.
   */
  private static async evaluateFallback(
    query: string, 
    context: ToolContext
  ): Promise<ToolExecutionResult | null> {
    const lowerQuery = query.toLowerCase();

    // Fallback: Web Search
    if (
      (lowerQuery.startsWith('search for') || lowerQuery.startsWith('google ')) && 
      context.permissions.includes('web_search')
    ) {
      const searchQuery = query.replace(/^(search for|google)\s+/i, '').trim();
      const result = await ToolExecutionManager.executeTool(
        'webSearch', 
        { query: searchQuery }, 
        context
      );
      return { ...result, fallbackTriggered: true };
    }

    // Fallback: Task Scheduling
    if (
      (lowerQuery.startsWith('remind me') || lowerQuery.startsWith('schedule')) &&
      context.permissions.includes('schedule_tasks')
    ) {
      // Basic fallback extraction (in a real system, this would use a smaller extraction model)
      const result = await ToolExecutionManager.executeTool(
        'scheduleTask',
        { 
          taskName: query, 
          executeAt: new Date(Date.now() + 3600000).toISOString(), // Default +1 hour
          actionPayload: '{}' 
        },
        context
      );
      return { ...result, fallbackTriggered: true };
    }

    // No fallback triggered
    return null;
  }
}
