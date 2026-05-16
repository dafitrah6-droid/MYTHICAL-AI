import { GoogleGenAI, Type } from '@google/genai';
import { AgentTask, ReflectionResult, OrchestrationContext } from '../types';
import { ObservabilityLogger } from '../observability/logger';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY, vertexai: true });

export class ReflectionEngine {
  private static readonly CONFIDENCE_THRESHOLD = 0.7;

  /**
   * Evaluates the result of a task execution against its original description.
   */
  static async evaluate(task: AgentTask, executionOutput: string, context: OrchestrationContext): Promise<ReflectionResult> {
    if (!task || !executionOutput) {
      throw new Error('ReflectionError: Invalid task or execution output.');
    }

    ObservabilityLogger.info('ReflectionEngine', `Evaluating task: ${task.id}`, { taskId: task.id });

    const prompt = `
Task Description: ${task.description}
Execution Output: ${executionOutput}

Evaluate if the execution output successfully fulfills the task description.
Provide a confidence score between 0.0 and 1.0.
If it fails, provide specific feedback on what went wrong and how to fix it.
`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          temperature: 0.1,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              passed: { type: Type.BOOLEAN, description: 'True if the task was successfully completed' },
              confidenceScore: { type: Type.NUMBER, description: 'Confidence score between 0.0 and 1.0' },
              feedback: { type: Type.STRING, description: 'Feedback or correction instructions if failed, or summary if passed' }
            },
            required: ['passed', 'confidenceScore', 'feedback']
          }
        }
      });

      const jsonStr = response.text.trim();
      const result: ReflectionResult = JSON.parse(jsonStr);

      // Enforce confidence threshold
      if (result.passed && result.confidenceScore < this.CONFIDENCE_THRESHOLD) {
        result.passed = false;
        result.feedback = `Confidence score (${result.confidenceScore}) is below threshold (${this.CONFIDENCE_THRESHOLD}). ${result.feedback}`;
      }

      return result;
    } catch (error) {
      ObservabilityLogger.error('ReflectionEngine', `Evaluation failed for task ${task.id}`, error);
      // Fail safe: if reflection crashes, assume failure to prevent bad data propagation
      return {
        passed: false,
        confidenceScore: 0,
        feedback: `Reflection system error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}
