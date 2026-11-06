import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import mongoose from 'mongoose';
import { createConversationSchema, createMessageSchema } from '../schemas/index.js';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';

describe('Conversation Schemas Validation', () => {
  it('validates conversation creation with 1 to 5 datasetIds', () => {
    const valid = createConversationSchema.safeParse({
      datasetIds: ['507f1f77bcf86cd799439011'],
      title: 'Sales Analysis',
    });
    assert.equal(valid.success, true);
    if (valid.success) {
      assert.equal(valid.data.title, 'Sales Analysis');
      assert.equal(valid.data.datasetIds.length, 1);
    }

    // Rejects empty datasets array
    const empty = createConversationSchema.safeParse({
      datasetIds: [],
    });
    assert.equal(empty.success, false);

    // Rejects more than 5 datasets
    const overLimit = createConversationSchema.safeParse({
      datasetIds: ['1', '2', '3', '4', '5', '6'],
    });
    assert.equal(overLimit.success, false);
  });

  it('validates message input schema', () => {
    const valid = createMessageSchema.safeParse({
      content: 'What was the average order revenue by country?',
    });
    assert.equal(valid.success, true);

    const empty = createMessageSchema.safeParse({
      content: '   ',
    });
    assert.equal(empty.success, false);
  });
});

describe('Conversation & Message Models Structure', () => {
  it('constructs a valid Conversation document with snapshots', () => {
    const userId = new mongoose.Types.ObjectId();
    const datasetId = new mongoose.Types.ObjectId();

    const doc = new Conversation({
      userId,
      title: 'Q3 Financials',
      datasetIds: [datasetId],
      datasetSnapshots: [
        {
          datasetId,
          name: 'Q3 Orders',
          tableName: 'q3_orders',
          rowCount: 500,
          columns: [
            { name: 'id', type: 'BIGINT' },
            { name: 'revenue', type: 'DOUBLE' },
          ],
        },
      ],
      readOnly: false,
    });

    assert.equal(doc.title, 'Q3 Financials');
    assert.equal(doc.datasetSnapshots.length, 1);
    assert.equal(doc.datasetSnapshots[0].tableName, 'q3_orders');
    assert.equal(doc.readOnly, false);
  });

  it('constructs a valid Message document with preview and chart spec', () => {
    const conversationId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();

    const doc = new Message({
      conversationId,
      userId,
      role: 'assistant',
      content: 'Total revenue by country shows US leading.',
      sql: 'SELECT country, SUM(total) as revenue FROM orders GROUP BY country',
      tablePreview: {
        columns: ['country', 'revenue'],
        rows: [{ country: 'USA', revenue: 45000 }],
        truncated: false,
      },
      chartSpec: {
        type: 'bar',
        xKey: 'country',
        yKeys: ['revenue'],
        title: 'Revenue by Country',
        data: [{ country: 'USA', revenue: 45000 }],
      },
      runId: 'run_test_123',
    });

    assert.equal(doc.role, 'assistant');
    assert.equal(doc.chartSpec?.type, 'bar');
    assert.equal(doc.chartSpec?.xKey, 'country');
    assert.deepEqual(doc.chartSpec?.yKeys, ['revenue']);
    assert.equal(doc.tablePreview?.columns.length, 2);
    assert.equal(doc.runId, 'run_test_123');
  });
});
