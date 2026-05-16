import { OrchestrationContext, AgentTask } from '../types';
import { ExecutionPipeline } from './pipeline';
import { PerformanceMonitor } from '../observability/monitor';
import { ObservabilityLogger } from '../observability/logger';

export class AgentManager {
  /**
   * Initiates and manages the lifecycle of an agent orchestration process.
   * Wraps the execution in observability monitors.
   */
  static async orchestrateObjective(context: OrchestrationContext): Promise<AgentTask[]> {
    if (!context || !context.objective) {
      throw new Error('AgentManagerError: Invalid orchestration context.');
    }

    // Enforce safe defaults
    context.maxDepth = Math.min(context.maxDepth || 5, 10);
    context.currentDepth = context.currentDepth || 0;
    context.globalContext = context.globalContext || {};

    ObservabilityLogger.info('AgentManager', `Starting orchestration for user ${context.userId}`);

    return await PerformanceMonitor.trackExecution(
      'agent_orchestration',
      { userId: context.userId },
      async () => {
        try {
          const results = await ExecutionPipeline.run(context);
          
          const completedCount = results.filter(t => t.status === 'completed').length;
          ObservabilityLogger.info('AgentManager', `Orchestration finished. ${completedCount}/${results.length} tasks completed.`);
          
          return results;
        } catch (error) {
          ObservabilityLogger.error('AgentManager', 'Critical failure in orchestration', error);
          throw error;
        }
      }
    );
  }
}
