import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import { LLMResult } from '@langchain/core/outputs';
import { Serialized } from '@langchain/core/load/serializable';
import { IRunLogStep } from '../../models/RunLog.js';

export interface TraceCollectorOptions {
  onStep?: (step: IRunLogStep) => void;
  onToken?: (token: string) => void;
  onStatus?: (message: string) => void;
}

export class TraceCollector extends BaseCallbackHandler {
  name = 'TraceCollector';

  steps: IRunLogStep[] = [];
  tokens = {
    input: 0,
    output: 0,
    total: 0,
  };

  private activeToolStarts = new Map<string, { name: string; input: unknown; startTime: number }>();
  private activeLlmStarts = new Map<string, { startTime: number }>();
  private stepCounter = 0;
  private onStep?: (step: IRunLogStep) => void;
  private onToken?: (token: string) => void;
  private onStatus?: (message: string) => void;

  constructor(options: TraceCollectorOptions = {}) {
    super();
    this.onStep = options.onStep;
    this.onToken = options.onToken;
    this.onStatus = options.onStatus;
  }

  override async handleLLMNewToken(token: string): Promise<void> {
    if (token && this.onToken) {
      this.onToken(token);
    }
  }

  override async handleLLMStart(
    _llm: Serialized,
    _prompts: string[],
    runId: string
  ): Promise<void> {
    this.activeLlmStarts.set(runId, { startTime: Date.now() });
  }

  override async handleLLMEnd(output: LLMResult, runId: string): Promise<void> {
    const started = this.activeLlmStarts.get(runId);
    const durationMs = started ? Date.now() - started.startTime : 0;
    this.activeLlmStarts.delete(runId);

    // Extract token usage
    const usage =
      (output.llmOutput?.estimatedTokenUsage as any) ||
      (output.llmOutput?.tokenUsage as any) ||
      (output.generations?.[0]?.[0] as any)?.generationInfo?.usage_metadata;

    if (usage) {
      const input = usage.promptTokens ?? usage.input_tokens ?? 0;
      const out = usage.completionTokens ?? usage.output_tokens ?? 0;
      const tot = usage.totalTokens ?? usage.total_tokens ?? input + out;

      this.tokens.input += Number(input);
      this.tokens.output += Number(out);
      this.tokens.total += Number(tot);
    }

    const step: IRunLogStep = {
      index: ++this.stepCounter,
      type: 'llm',
      name: 'model_call',
      outputSummary: `Generated completion in ${durationMs}ms`,
      status: 'ok',
      durationMs,
      startedAt: new Date(started?.startTime ?? Date.now()),
    };

    this.steps.push(step);
    this.onStep?.(step);
  }

  override async handleToolStart(
    tool: Serialized,
    input: string,
    runId: string
  ): Promise<void> {
    let parsedInput: unknown = input;
    try {
      parsedInput = JSON.parse(input);
    } catch (_e) {
      parsedInput = input;
    }

    const toolName = tool.id ? tool.id[tool.id.length - 1] : 'tool';
    this.activeToolStarts.set(runId, {
      name: toolName,
      input: parsedInput,
      startTime: Date.now(),
    });

    if (this.onStatus) {
      if (toolName === 'get_schema') {
        this.onStatus('Inspecting table schemas and relations...');
      } else if (toolName === 'run_sql') {
        this.onStatus('Running SQL query on sandbox tables...');
      } else if (toolName === 'create_chart') {
        this.onStatus('Generating data visualization chart...');
      } else {
        this.onStatus(`Calling tool: ${toolName}...`);
      }
    }
  }

  override async handleToolEnd(output: string, runId: string): Promise<void> {
    const started = this.activeToolStarts.get(runId);
    const durationMs = started ? Date.now() - started.startTime : 0;
    this.activeToolStarts.delete(runId);

    let summary = String(output);
    if (summary.length > 200) {
      summary = `${summary.slice(0, 197)}...`;
    }

    const step: IRunLogStep = {
      index: ++this.stepCounter,
      type: 'tool',
      name: started?.name || 'tool',
      input: started?.input,
      outputSummary: summary,
      status: 'ok',
      durationMs,
      startedAt: new Date(started?.startTime ?? Date.now()),
    };

    this.steps.push(step);
    this.onStep?.(step);
  }

  override async handleToolError(err: Error, runId: string): Promise<void> {
    const started = this.activeToolStarts.get(runId);
    const durationMs = started ? Date.now() - started.startTime : 0;
    this.activeToolStarts.delete(runId);

    const step: IRunLogStep = {
      index: ++this.stepCounter,
      type: 'tool',
      name: started?.name || 'tool',
      input: started?.input,
      outputSummary: err.message,
      status: 'error',
      error: err.message,
      durationMs,
      startedAt: new Date(started?.startTime ?? Date.now()),
    };

    this.steps.push(step);
    this.onStep?.(step);
  }
}
