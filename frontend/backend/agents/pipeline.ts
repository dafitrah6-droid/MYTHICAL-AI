import { AgentTask, OrchestrationContext } from '../types';
import { TaskPlanner } from './planner';
import { TaskReasoner } from './reasoner';
import { ReflectionEngine } from './reflection';
import { ToolRouter } from '../tools/router';
import { ObservabilityLogger } from '../observability/logger';
import { MetricsCollector } from '../observability/metrics';

export class ExecutionPipeline {
  private static readonly MAX_RETRIES = 3;
  private static readonly MAX_DEPTH = 5;

  /**
   * Executes a high-level objective by orchestrating the agent roles.
   */
  static async run(context: OrchestrationContext): Promise<AgentTask[]> {
    if (context.currentDepth >= this.MAX_DEPTH) {
      throw new Error('PipelineError: Maximum execution depth exceeded. Possible infinite loop prevented.');
    }

    ObservabilityLogger.info('ExecutionPipeline', `Starting pipeline for objective: ${context.objective}`, { depth: context.currentDepth });

    // 1. Plan Tasks
    const tasks = await TaskPlanner.plan(context.objective, context);
    
    // 2. Execute Tasks in topological order
    for (const task of tasks) {
      await this.executeTaskWithRetries(task, tasks, context);
      
      if (task.status === 'failed') {
        ObservabilityLogger.warn('ExecutionPipeline', `Pipeline halted due to task failure: ${task.id}`);
        this.markDependentTasksBlocked(task.id, tasks);
        break; // Halt pipeline on critical failure
      }
    }

    return tasks;
  }

  /**
   * Executes a single task, handling reasoning, tool execution, and reflection loops.
   */
  private static async executeTaskWithRetries(task: AgentTask, allTasks: AgentTask[], context: OrchestrationContext): Promise<void> {
    // Check dependencies
    const depsMet = task.dependencies.every(depId => {
      const dep = allTasks.find(t => t.id === depId);
      return dep && dep.status === 'completed';
    });

    if (!depsMet) {
      task.status = 'blocked';
      task.error = 'Dependencies not met.';
      return;
    }

    task.status = 'in_progress';

    while (task.retryCount < this.MAX_RETRIES) {
      try {
        // A. Reasoner: Formulate action
        const actionPlan = await TaskReasoner.reason(task, allTasks, context);

        // B. Executor: Route to tools or execute directly
        // In a full implementation, this might call an LLM again to pick the tool based on the actionPlan.
        // Here we use the ToolRouter which handles function calling internally.
        const executionResult = await ToolRouter.routeAndExecute(actionPlan, context);
        
        const outputStr = executionResult?.success 
          ? JSON.stringify(executionResult.data) 
          : `Execution Failed: ${executionResult?.error || 'No output'}`;

        // C. Critic: Reflect on the result
        const reflection = await ReflectionEngine.evaluate(task, outputStr, context);

        if (reflection.passed) {
          task.status = 'completed';
          task.result = outputStr;
          task.confidenceScore = reflection.confidenceScore;
          MetricsCollector.incrementCounter('agent_task_success', 1, { role: 'executor' });
          return; // Success, exit retry loop
        } else {
          ObservabilityLogger.warn('ExecutionPipeline', `Task ${task.id} failed reflection. Retrying.`, { feedback: reflection.feedback });
          task.error = reflection.feedback;
          task.retryCount++;
          MetricsCollector.incrementCounter('agent_task_retry', 1, { taskId: task.id });
          
          // Inject feedback into global context for the next reasoning pass
          context.globalContext[`${task.id}_feedback_${task.retryCount}`] = reflection.feedback;
        }

      } catch (error) {
        ObservabilityLogger.error('ExecutionPipeline', `Exception during task ${task.id} execution`, error);
        task.error = error instanceof Error ? error.message : 'Unknown exception';
        task.retryCount++;
      }
    }

    // If we exit the loop without returning, the task failed all retries
    task.status = 'failed';
    MetricsCollector.incrementCounter('agent_task_failure', 1, { taskId: task.id });
  }

  /**
   * Cascades failure status to dependent tasks.
   */
  private static markDependentTasksBlocked(failedTaskId: string, allTasks: AgentTask[]): void {
    for (const task of allTasks) {
      if (task.status === 'pending' && task.dependencies.includes(failedTaskId)) {
        task.status = 'blocked';
        task.error = `Blocked by failure of dependency: ${failedTaskId}`;
        // Recursively block downstream
        this.markDependentTasksBlocked(task.id, allTasks);
      }
    }
  }
}
