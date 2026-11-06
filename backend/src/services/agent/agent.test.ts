import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import { createSandbox, SandboxSession } from '../sandbox/createSandbox.js';
import { AgentExecutionState, createAgentTools, DatasetToolContext } from './tools.js';
import { TraceCollector } from './traceCollector.js';
import { getSystemPrompt, PROMPT_VERSION } from './prompt.js';

describe('Agent System Prompt & Versioning', () => {
  it('exports valid prompt version and system instructions', () => {
    assert.equal(typeof PROMPT_VERSION, 'string');
    assert.ok(PROMPT_VERSION.length > 0);

    const prompt = getSystemPrompt();
    assert.ok(prompt.includes('get_schema'));
    assert.ok(prompt.includes('run_sql'));
    assert.ok(prompt.includes('create_chart'));
    assert.ok(prompt.includes('Joins:'));
  });
});

describe('Agent Tools & Self-Correction', () => {
  let tmpDir: string;
  let ordersPath: string;
  let customersPath: string;
  let sandbox: SandboxSession;
  let datasets: DatasetToolContext[];

  before(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sqlrag-agent-test-'));
    ordersPath = path.join(tmpDir, 'orders.csv');
    customersPath = path.join(tmpDir, 'customers.csv');

    await fs.writeFile(
      ordersPath,
      ['order_id,customer_id,total,status', '1,101,150.50,completed', '2,102,49.99,pending'].join('\n')
    );

    await fs.writeFile(
      customersPath,
      ['id,name,country', '101,Acme,USA', '102,Globex,Canada'].join('\n')
    );

    sandbox = await createSandbox([
      { tableName: 'orders', filePath: ordersPath },
      { tableName: 'customers', filePath: customersPath },
    ]);

    datasets = [
      {
        datasetId: 'ds_1',
        filename: 'orders.csv',
        tableName: 'orders',
        rowCount: 2,
        columns: [
          { name: 'order_id', type: 'BIGINT' },
          { name: 'customer_id', type: 'BIGINT' },
          { name: 'total', type: 'DOUBLE' },
          { name: 'status', type: 'VARCHAR' },
        ],
      },
      {
        datasetId: 'ds_2',
        filename: 'customers.csv',
        tableName: 'customers',
        rowCount: 2,
        columns: [
          { name: 'id', type: 'BIGINT' },
          { name: 'name', type: 'VARCHAR' },
          { name: 'country', type: 'VARCHAR' },
        ],
      },
    ];
  });

  after(async () => {
    if (sandbox) {
      sandbox.close();
    }
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('get_schema returns table schemas, sample rows, and candidate joins', async () => {
    const state: AgentExecutionState = { sqlAttempts: [], joinsUsed: [] };
    const [getSchemaTool] = createAgentTools(sandbox, datasets, state);

    const resultStr = await getSchemaTool.invoke({});
    const result = JSON.parse(resultStr);

    assert.equal(result.tables.length, 2);
    assert.equal(result.tables[0].name, 'orders');
    assert.equal(result.tables[0].sampleRows.length, 2);
    assert.equal(result.tables[1].name, 'customers');

    // Candidate join detected
    assert.equal(result.candidateJoins.length, 1);
    assert.equal(result.candidateJoins[0].left, 'orders.customer_id');
    assert.equal(result.candidateJoins[0].right, 'customers.id');
  });

  it('run_sql executes successfully and stores result for charting', async () => {
    const state: AgentExecutionState = { sqlAttempts: [], joinsUsed: [] };
    const [, runSqlTool] = createAgentTools(sandbox, datasets, state);

    const resultStr = await runSqlTool.invoke({
      sql: 'SELECT country, COUNT(*) as cust_count FROM customers GROUP BY country',
      purpose: 'Count customers by country',
    });
    const result = JSON.parse(resultStr);

    assert.ok(result.resultId);
    assert.deepEqual(result.columns, ['country', 'cust_count']);
    assert.equal(result.rowCount, 2);
    assert.equal(state.sqlAttempts.length, 1);
    assert.equal(state.sqlAttempts[0].status, 'ok');
  });

  it('run_sql self-correction: returns DuckDB error on invalid column and tracks attempt', async () => {
    const state: AgentExecutionState = { sqlAttempts: [], joinsUsed: [] };
    const [, runSqlTool] = createAgentTools(sandbox, datasets, state);

    // Intentionally wrong column name
    const errorResultStr = await runSqlTool.invoke({
      sql: 'SELECT non_existent_col FROM orders',
      purpose: 'Initial attempt with wrong column',
    });
    const errorResult = JSON.parse(errorResultStr);

    assert.ok(errorResult.error);
    assert.match(errorResult.error, /non_existent_col/i);
    assert.equal(state.sqlAttempts.length, 1);
    assert.equal(state.sqlAttempts[0].status, 'error');

    // Self-correction attempt with correct column
    const correctedResultStr = await runSqlTool.invoke({
      sql: 'SELECT order_id, total FROM orders',
      purpose: 'Corrected attempt using valid columns',
    });
    const correctedResult = JSON.parse(correctedResultStr);

    assert.ok(correctedResult.resultId);
    assert.equal(state.sqlAttempts.length, 2);
    assert.equal(state.sqlAttempts[1].status, 'ok');
  });

  it('run_sql stops after maximum 3 attempts', async () => {
    const state: AgentExecutionState = { sqlAttempts: [], joinsUsed: [] };
    const [, runSqlTool] = createAgentTools(sandbox, datasets, state);

    // 3 failed attempts
    await runSqlTool.invoke({ sql: 'SELECT bad_1 FROM orders', purpose: '1' });
    await runSqlTool.invoke({ sql: 'SELECT bad_2 FROM orders', purpose: '2' });
    await runSqlTool.invoke({ sql: 'SELECT bad_3 FROM orders', purpose: '3' });

    // 4th attempt should be rejected
    const fourthResultStr = await runSqlTool.invoke({ sql: 'SELECT bad_4 FROM orders', purpose: '4' });
    const fourthResult = JSON.parse(fourthResultStr);

    assert.ok(fourthResult.error);
    assert.match(fourthResult.error, /Maximum SQL attempts/i);
    assert.equal(state.sqlAttempts[3].status, 'rejected');
  });

  it('create_chart validates column keys against resultId and attaches data', async () => {
    const state: AgentExecutionState = { sqlAttempts: [], joinsUsed: [] };
    const [, runSqlTool, createChartTool] = createAgentTools(sandbox, datasets, state);

    // 1. Run SQL
    const sqlResStr = await runSqlTool.invoke({
      sql: 'SELECT country, count(*) as count FROM customers GROUP BY country',
      purpose: 'Aggregate by country',
    });
    const sqlRes = JSON.parse(sqlResStr);

    // 2. Try invalid chart column
    const badChartStr = await createChartTool.invoke({
      resultId: sqlRes.resultId,
      type: 'bar',
      xKey: 'non_existent_x',
      yKeys: ['count'],
      title: 'Customers by Country',
    });
    const badChart = JSON.parse(badChartStr);
    assert.ok(badChart.error);
    assert.match(badChart.error, /does not exist in result columns/i);

    // 3. Try valid chart
    const validChartStr = await createChartTool.invoke({
      resultId: sqlRes.resultId,
      type: 'bar',
      xKey: 'country',
      yKeys: ['count'],
      title: 'Customers by Country',
    });
    const validChart = JSON.parse(validChartStr);
    assert.equal(validChart.ok, true);

    assert.ok(state.createdChart);
    assert.equal(state.createdChart.type, 'bar');
    assert.equal(state.createdChart.xKey, 'country');
    assert.deepEqual(state.createdChart.yKeys, ['count']);
    assert.equal(state.createdChart.data.length, 2);
  });
});

describe('TraceCollector Callbacks', () => {
  it('records tool and LLM steps and notifies onStep callback', async () => {
    const stepsReceived: string[] = [];
    const collector = new TraceCollector({
      onStep: (step) => stepsReceived.push(step.name),
    });

    // Simulate tool start and end
    await collector.handleToolStart({ id: ['test', 'run_sql'] } as any, JSON.stringify({ sql: 'SELECT 1' }), 'run_1');
    await collector.handleToolEnd('{"columns":["1"],"rows":[{"1":1}]}', 'run_1');

    assert.equal(collector.steps.length, 1);
    assert.equal(collector.steps[0].type, 'tool');
    assert.equal(collector.steps[0].name, 'run_sql');
    assert.equal(stepsReceived.length, 1);
    assert.equal(stepsReceived[0], 'run_sql');

    // Simulate LLM end with token metrics
    await collector.handleLLMStart({} as any, ['prompt'], 'run_2');
    await collector.handleLLMEnd(
      {
        generations: [],
        llmOutput: {
          tokenUsage: {
            promptTokens: 120,
            completionTokens: 45,
            totalTokens: 165,
          },
        },
      },
      'run_2'
    );

    assert.equal(collector.steps.length, 2);
    assert.equal(collector.tokens.input, 120);
    assert.equal(collector.tokens.output, 45);
    assert.equal(collector.tokens.total, 165);
  });
});

