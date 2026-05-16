import { GoogleGenAI, Type } from '@google/genai';
import { AgentTask, OrchestrationContext } from '../types';
import { ObservabilityLogger } from '../observability/logger';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY, vertexai: true });

export class TaskPlanner {
  private static readonly MAX_TASKS = 10;

  /**
   * Decomposes a high-level objective into a structured list of dependent tasks.
   */
  static async plan(objective: string, context: OrchestrationContext): Promise<AgentTask[]> {
    if (!objective || typeof objective !== 'string') {
      throw new Error('PlannerError: Invalid objective provided.');
    }

    ObservabilityLogger.info('TaskPlanner', `Planning objective: ${objective}`, { userId: context.userId });

    const systemInstruction = `You are the Planner Agent. Break down the user's objective into a logical sequence of tasks.
Keep tasks atomic, actionable, and strictly necessary. Maximum ${this.MAX_TASKS} tasks.
Assign a unique string ID to each task. If a task depends on the output of another, list the dependency IDs.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Objective: ${objective}`,
        config: {
          systemInstruction,
          temperature: 0.2,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING, description: 'Unique identifier for the task (e.g., task_1)' },
                description: { type: Type.STRING, description: 'Clear, actionable description of what needs to be done' },
                dependencies: { 
                  type: Type.ARRAY, 
                  items: { type: Type.STRING },
                  description: 'Array of task IDs that must be completed before this task'
                }
              },
              required: ['id', 'description', 'dependencies']
            }
          }
        }
      });

      const jsonStr = response.text.trim();
      const parsedTasks = JSON.parse(jsonStr);

      if (!Array.isArray(parsedTasks) || parsedTasks.length === 0) {
        throw new Error('PlannerError: Model returned empty or invalid task list.');
      }

      // Enforce limits and initialize state
      const tasks: AgentTask[] = parsedTasks.slice(0, this.MAX_TASKS).map(t => ({
        id: String(t.id),
        description: String(t.description),
        dependencies: Array.isArray(t.dependencies) ? t.dependencies.map(String) : [],
        status: 'pending',
        retryCount: 0
      }));

      this.validateDependencies(tasks);

      return tasks;
    } catch (error) {
      ObservabilityLogger.error('TaskPlanner', 'Failed to generate task plan', error);
      throw new Error(`PlannerError: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validates the task graph to ensure no circular dependencies and all dependencies exist.
   * Uses a topological sort approach to detect cycles.
   */
  private static validateDependencies(tasks: AgentTask[]): void {
    const taskMap = new Map<string, AgentTask>();
    tasks.forEach(t => taskMap.set(t.id, t));

    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const visit = (taskId: string) => {
      if (recursionStack.has(taskId)) {
        throw new Error(`PlannerError: Circular dependency detected involving task '${taskId}'.`);
      }
      if (visited.has(taskId)) return;

      const task = taskMap.get(taskId);
      if (!task) {
        throw new Error(`PlannerError: Task references non-existent dependency '${taskId}'.`);
      }

      recursionStack.add(taskId);
      for (const depId of task.dependencies) {
        visit(depId);
      }
      recursionStack.delete(taskId);
      visited.add(taskId);
    };

    for (const task of tasks) {
      if (!visited.has(task.id)) {
        visit(task.id);
      }
    }
  }
}
