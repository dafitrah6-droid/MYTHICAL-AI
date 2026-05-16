import { GoogleGenAI } from '@google/genai';
import { AgentTask, OrchestrationContext } from '../types';
import { ObservabilityLogger } from '../observability/logger';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY, vertexai: true });

export class TaskReasoner {
  /**
   * Analyzes a task and the current context to formulate a specific execution strategy or query.
   */
  static async reason(task: AgentTask, completedTasks: AgentTask[], context: OrchestrationContext): Promise<string> {
    if (!task || !task.description) {
      throw new Error('ReasonerError: Invalid task provided.');
    }

    ObservabilityLogger.info('TaskReasoner', `Reasoning for task: ${task.id}`, { taskId: task.id });

    // Build context from dependencies
    const relevantContext = completedTasks
      .filter(t => task.dependencies.includes(t.id))
      .map(t => `Task [${t.id}] Result: ${t.result}`)
      .join('\n');

    const prompt = `
Objective: ${context.objective}
Current Task: ${task.description}

Context from previous tasks:
${relevantContext || 'None'}

Formulate the exact query, command, or action required to execute this task. 
Be direct and provide only the actionable output. Do not include conversational filler.
`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          temperature: 0.3,
          // Use thinking config to allow the model to reason before outputting the action
          thinkingConfig: { thinkingBudget: 200 }
        }
      });

      const actionPlan = response.text.trim();
      if (!actionPlan) {
        throw new Error('ReasonerError: Generated empty action plan.');
      }

      return actionPlan;
    } catch (error) {
      ObservabilityLogger.error('TaskReasoner', `Reasoning failed for task ${task.id}`, error);
      throw new Error(`ReasonerError: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
