import { Type, FunctionDeclaration } from '@google/genai';
import { ToolContext, ToolPermission } from '../types';
import { SsrfPrevention } from '../security/ssrf-prevention';

export interface ToolDefinition {
  declaration: FunctionDeclaration;
  requiredPermissions: ToolPermission[];
  execute: (args: any, context: ToolContext) => Promise<any>;
  validateInput: (args: any) => boolean;
}

export class ToolRegistry {
  private static tools: Map<string, ToolDefinition> = new Map();

  static register(name: string, definition: ToolDefinition) {
    this.tools.set(name, definition);
  }

  static get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  static getAllDeclarations(): FunctionDeclaration[] {
    return Array.from(this.tools.values()).map(t => t.declaration);
  }

  static getPermittedDeclarations(permissions: ToolPermission[]): FunctionDeclaration[] {
    return Array.from(this.tools.values())
      .filter(t => t.requiredPermissions.every(p => permissions.includes(p)))
      .map(t => t.declaration);
  }
}

// --- Core Tools Registration ---

ToolRegistry.register('webSearch', {
  declaration: {
    name: 'webSearch',
    description: 'Search the web for current events, facts, or real-time information.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: 'The search query.' }
      },
      required: ['query']
    }
  },
  requiredPermissions: ['web_search'],
  validateInput: (args: any) => typeof args.query === 'string' && args.query.length > 0 && args.query.length < 500,
  execute: async (args, context) => {
    // Architectural stub for web search execution
    return { result: `Mock search results for: ${args.query}` };
  }
});

ToolRegistry.register('executeCode', {
  declaration: {
    name: 'executeCode',
    description: 'Execute Python or Node.js code in a secure sandbox environment.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        language: { type: Type.STRING, description: 'Programming language (python or nodejs).' },
        code: { type: Type.STRING, description: 'The code to execute.' }
      },
      required: ['language', 'code']
    }
  },
  requiredPermissions: ['execute_code'],
  validateInput: (args: any) => {
    if (!['python', 'nodejs'].includes(args.language)) return false;
    if (typeof args.code !== 'string' || args.code.length === 0) return false;
    // Reject obvious unsafe patterns before sandbox (defense in depth)
    const unsafePatterns = ['process.exit', 'os.system', 'subprocess', 'eval('];
    return !unsafePatterns.some(pattern => args.code.includes(pattern));
  },
  execute: async (args, context) => {
    // Architectural stub for sandboxed code execution
    return { output: `Executed ${args.language} code successfully.`, stdout: '' };
  }
});

ToolRegistry.register('analyzeFile', {
  declaration: {
    name: 'analyzeFile',
    description: 'Analyze a specific file attached to the conversation or stored in the user workspace.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        fileId: { type: Type.STRING, description: 'The UUID of the file to analyze.' },
        analysisType: { type: Type.STRING, description: 'Type of analysis (summary, extract_data, security_scan).' }
      },
      required: ['fileId', 'analysisType']
    }
  },
  requiredPermissions: ['analyze_files'],
  validateInput: (args: any) => typeof args.fileId === 'string' && typeof args.analysisType === 'string',
  execute: async (args, context) => {
    // Architectural stub for file analysis
    return { analysis: `Completed ${args.analysisType} on file ${args.fileId}` };
  }
});

ToolRegistry.register('apiRequest', {
  declaration: {
    name: 'apiRequest',
    description: 'Make an HTTP request to an external API.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        method: { type: Type.STRING, description: 'HTTP method (GET, POST, etc.).' },
        url: { type: Type.STRING, description: 'The endpoint URL.' },
        body: { type: Type.STRING, description: 'JSON stringified request body (optional).' }
      },
      required: ['method', 'url']
    }
  },
  requiredPermissions: ['api_network'],
  validateInput: (args: any) => {
    if (!['GET', 'POST', 'PUT', 'DELETE'].includes(args.method.toUpperCase())) return false;
    try {
      new URL(args.url);
      return true;
    } catch {
      return false;
    }
  },
  execute: async (args, context) => {
    const isSafe = await SsrfPrevention.isSafeUrl(args.url);
    if (!isSafe) {
      throw new Error('Security Error: Target URL is not accessible (internal network or reserved IP)');
    }
    // Architectural stub for API requests
    return { status: 200, data: `Mock response from ${args.url}` };
  }
});

ToolRegistry.register('scheduleTask', {
  declaration: {
    name: 'scheduleTask',
    description: 'Schedule a background task or reminder for the user.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        taskName: { type: Type.STRING, description: 'Name of the task.' },
        executeAt: { type: Type.STRING, description: 'ISO 8601 timestamp for execution.' },
        actionPayload: { type: Type.STRING, description: 'JSON payload describing the action to take.' }
      },
      required: ['taskName', 'executeAt', 'actionPayload']
    }
  },
  requiredPermissions: ['schedule_tasks'],
  validateInput: (args: any) => {
    if (typeof args.taskName !== 'string') return false;
    const date = new Date(args.executeAt);
    // Must be a valid future date
    return !isNaN(date.getTime()) && date.getTime() > Date.now();
  },
  execute: async (args, context) => {
    // Architectural stub for task scheduling
    return { scheduledId: 'task-uuid-123', status: 'scheduled' };
  }
});
