import test, { describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Types } from 'mongoose';
import { buildReport } from './buildReport';
import { Conversation } from '../../models/Conversation';
import { RunLog } from '../../models/RunLog';
import { User } from '../../models/User';

describe('buildReport Service', () => {
  const userId = new Types.ObjectId();
  const conversationId = new Types.ObjectId();

  beforeEach(() => {
    // Stub Mongoose model methods
  });

  test('assembles comprehensive markdown report for a conversation with success, retry-then-success, and failure', async () => {
    // Mock user
    const mockUser = {
      _id: userId,
      email: 'analyst@example.com',
    };

    // Mock conversation with snapshots
    const mockConv = {
      _id: conversationId,
      userId,
      title: 'Sales & Returns Analysis',
      readOnly: false,
      datasetSnapshots: [
        {
          datasetId: new Types.ObjectId(),
          name: 'orders.csv',
          tableName: 'orders',
          rowCount: 250,
          columns: [
            { name: 'id', type: 'BIGINT' },
            { name: 'customer_id', type: 'BIGINT' },
            { name: 'gross_amount', type: 'DOUBLE' },
          ],
        },
        {
          datasetId: new Types.ObjectId(),
          name: 'customers.csv',
          tableName: 'customers',
          rowCount: 50,
          columns: [
            { name: 'id', type: 'BIGINT' },
            { name: 'country', type: 'VARCHAR' },
          ],
        },
      ],
    };

    // Mock 3 RunLogs:
    // 1. Success with chart and table preview
    // 2. Retry-then-success (attempt 1 failed with column error, attempt 2 succeeded)
    // 3. Failed run (syntax error or timeout)
    const mockRuns = [
      {
        runId: 'run-1',
        userId,
        conversationId,
        question: 'What is total revenue by customer country?',
        datasets: mockConv.datasetSnapshots,
        model: { provider: 'google-genai', name: 'gemini-3.5-flash', temperature: 0, maxOutputTokens: 2048 },
        promptVersion: 'v1',
        steps: [
          { index: 1, type: 'tool', name: 'get_schema', status: 'ok', durationMs: 25 },
          { index: 2, type: 'tool', name: 'run_sql', status: 'ok', durationMs: 40 },
          { index: 3, type: 'tool', name: 'create_chart', status: 'ok', durationMs: 15 },
        ],
        sqlAttempts: [
          {
            sql: 'SELECT c.country, SUM(o.gross_amount) AS revenue FROM orders o JOIN customers c ON o.customer_id = c.id GROUP BY 1 ORDER BY 2 DESC',
            status: 'ok',
            durationMs: 40,
            rowCount: 3,
            truncated: false,
          },
        ],
        resultPreview: {
          columns: ['country', 'revenue'],
          rows: [
            { country: 'USA', revenue: 12500.5 },
            { country: 'Germany', revenue: 8400.0 },
            { country: 'Japan', revenue: 5200.25 },
          ],
        },
        chart: {
          type: 'bar',
          title: 'Revenue by Country',
          xKey: 'country',
          yKeys: ['revenue'],
        },
        answer: 'The United States generated the highest revenue ($12,500.50), followed by Germany ($8,400.00).',
        status: 'success',
        tokens: { input: 1200, output: 250, total: 1450 },
        totalDurationMs: 1800,
        createdAt: new Date('2026-11-01T10:00:00Z'),
      },
      {
        runId: 'run-2',
        userId,
        conversationId,
        question: 'Count total orders per customer',
        datasets: mockConv.datasetSnapshots,
        model: { provider: 'google-genai', name: 'gemini-3.5-flash', temperature: 0, maxOutputTokens: 2048 },
        promptVersion: 'v1',
        steps: [
          { index: 1, type: 'tool', name: 'run_sql', status: 'error', durationMs: 15 },
          { index: 2, type: 'tool', name: 'run_sql', status: 'ok', durationMs: 30 },
        ],
        sqlAttempts: [
          {
            sql: 'SELECT cust_id, COUNT(*) FROM orders GROUP BY 1',
            status: 'error',
            error: 'Binder Error: Referenced column "cust_id" not found',
            durationMs: 15,
          },
          {
            sql: 'SELECT customer_id, COUNT(*) AS count FROM orders GROUP BY 1',
            status: 'ok',
            durationMs: 30,
            rowCount: 2,
            truncated: false,
          },
        ],
        resultPreview: {
          columns: ['customer_id', 'count'],
          rows: [
            { customer_id: 1, count: 12 },
            { customer_id: 2, count: 8 },
          ],
        },
        answer: 'Customer 1 had 12 orders and Customer 2 had 8 orders.',
        status: 'success',
        tokens: { input: 1500, output: 300, total: 1800 },
        totalDurationMs: 2200,
        createdAt: new Date('2026-11-01T10:05:00Z'),
      },
      {
        runId: 'run-3',
        userId,
        conversationId,
        question: 'Show non-existent table metrics',
        datasets: mockConv.datasetSnapshots,
        model: { provider: 'google-genai', name: 'gemini-3.5-flash', temperature: 0, maxOutputTokens: 2048 },
        promptVersion: 'v1',
        steps: [
          { index: 1, type: 'tool', name: 'run_sql', status: 'rejected', durationMs: 5 },
        ],
        sqlAttempts: [
          {
            sql: 'ATTACH DATABASE "/etc/shadow" AS stolen',
            status: 'rejected',
            error: 'Administrative keyword "ATTACH" not permitted in sandbox',
            durationMs: 5,
          },
        ],
        answer: 'Analysis stopped: query rejected by security validator.',
        status: 'failed',
        tokens: { input: 800, output: 50, total: 850 },
        totalDurationMs: 600,
        createdAt: new Date('2026-11-01T10:10:00Z'),
      },
    ];

    // Mock Conversation.findOne
    Conversation.findOne = (() => ({
      exec: async () => mockConv,
    })) as any;

    // Mock User.findById
    User.findById = (() => ({
      exec: async () => mockUser,
    })) as any;

    // Mock RunLog.find
    RunLog.find = (() => ({
      sort: () => ({
        exec: async () => mockRuns,
      }),
    })) as any;

    const report = await buildReport(conversationId, userId);

    // Verify metadata
    assert.equal(report.conversationId, conversationId.toString());
    assert.equal(report.title, 'Sales & Returns Analysis');
    assert.ok(report.generatedAt);

    // Verify statistics
    assert.equal(report.stats.totalQuestions, 3);
    assert.equal(report.stats.totalSqlAttempts, 4); // 1 + 2 + 1
    assert.equal(report.stats.successfulQueries, 2); // 1 from run-1, 1 from run-2
    assert.equal(report.stats.failedQueries, 2); // 1 from run-2, 1 from run-3
    assert.equal(report.stats.chartsCount, 1);
    assert.equal(report.stats.chartsByType['bar'], 1);
    assert.equal(report.stats.totalTokens.total, 1450 + 1800 + 850);
    assert.ok(report.stats.avgLatencyMs > 0);

    // Verify notable events detection
    assert.ok(report.stats.notableEventsCount >= 2);

    // Verify markdown contains all 7 required sections
    assert.ok(report.markdown.includes('# Analysis Report — Sales & Returns Analysis'));
    assert.ok(report.markdown.includes('## 1. Overview'));
    assert.ok(report.markdown.includes('## 2. Data Used'));
    assert.ok(report.markdown.includes('## 3. System and Tools Used'));
    assert.ok(report.markdown.includes('## 4. How the Agent Works'));
    assert.ok(report.markdown.includes('## 5. Question-by-Question Log'));
    assert.ok(report.markdown.includes('## 6. Session Statistics'));
    assert.ok(report.markdown.includes('## 7. Notable Events'));

    // Check Candidate Joins detected
    assert.ok(report.markdown.includes('orders.customer_id'));
    assert.ok(report.markdown.includes('customers.id'));

    // Check Question 1, 2, 3 details
    assert.ok(report.markdown.includes('What is total revenue by customer country?'));
    assert.ok(report.markdown.includes('Count total orders per customer'));
    assert.ok(report.markdown.includes('Show non-existent table metrics'));

    // Check Self-correction recovery noted
    assert.ok(report.markdown.includes('Self-correction successfully resolved a SQL error'));

    // Check Security rejection noted
    assert.ok(report.markdown.includes('SQL rejected by security validator'));

    // Check table preview rendered in markdown
    assert.ok(report.markdown.includes('| USA | 12500.5 |'));
  });

  test('throws 404 when conversation does not exist or belongs to another user', async () => {
    Conversation.findOne = (() => ({
      exec: async () => null,
    })) as any;

    await assert.rejects(
      async () => {
        await buildReport(new Types.ObjectId(), new Types.ObjectId());
      },
      (err: any) => {
        assert.equal(err.status, 404);
        assert.equal(err.message, 'Conversation not found');
        return true;
      }
    );
  });
});
