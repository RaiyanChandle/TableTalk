import { Request, Response, Router } from 'express';
import mongoose from 'mongoose';
import { requireAuth } from '../middleware/requireAuth.js';
import { chatRateLimiter } from '../middleware/rateLimit.js';
import { Conversation, IDatasetSnapshot } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { Dataset } from '../models/Dataset.js';
import { RunLog } from '../models/RunLog.js';
import { createConversationSchema, createMessageSchema, updateConversationSchema } from '../schemas/index.js';
import { createSandbox } from '../services/sandbox/createSandbox.js';
import { runAgent, ChatHistoryItem } from '../services/agent/runAgent.js';
import { DatasetToolContext } from '../services/agent/tools.js';
import { buildReport } from '../services/report/buildReport.js';

const router = Router();

// All conversation routes require authentication
router.use(requireAuth);

/**
 * POST /api/conversations
 * Create a new conversation from 1 to 5 datasetIds
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const parseResult = createConversationSchema.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid conversation parameters',
        detail: parseResult.error.flatten(),
      },
    });
    return;
  }

  const { datasetIds, title } = parseResult.data;

  // Validate ObjectIds
  const validIds = datasetIds.every((id) => mongoose.Types.ObjectId.isValid(id));
  if (!validIds) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'One or more datasets not found' },
    });
    return;
  }

  const objectIds = datasetIds.map((id) => new mongoose.Types.ObjectId(id));

  // Verify ownership: all datasets must belong to current user
  const datasets = await Dataset.find({
    _id: { $in: objectIds },
    userId: new mongoose.Types.ObjectId(userId),
  }).lean();

  if (datasets.length !== datasetIds.length) {
    // Return 404 to avoid user enumeration
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'One or more datasets not found' },
    });
    return;
  }

  // Preserve order of datasetIds passed by user
  const datasetMap = new Map(datasets.map((d) => [d._id.toString(), d]));
  const orderedDatasets = datasetIds.map((id) => datasetMap.get(id)!);

  // Build immutable snapshot of dataset schemas
  const datasetSnapshots: IDatasetSnapshot[] = orderedDatasets.map((d) => ({
    datasetId: d._id as mongoose.Types.ObjectId,
    name: d.name,
    tableName: d.tableName,
    rowCount: d.rowCount,
    columns: d.columns.map((c) => ({ name: c.name, type: c.type })),
  }));

  const conversationTitle =
    title && title.trim().length > 0
      ? title.trim()
      : orderedDatasets.map((d) => d.name).join(' & ');

  const conversation = await Conversation.create({
    userId: new mongoose.Types.ObjectId(userId),
    title: conversationTitle,
    datasetIds: objectIds,
    datasetSnapshots,
    readOnly: false,
  });

  res.status(201).json({
    conversation: {
      id: conversation._id.toString(),
      title: conversation.title,
      datasetIds: conversation.datasetIds.map((id) => id.toString()),
      datasetSnapshots: conversation.datasetSnapshots,
      readOnly: conversation.readOnly,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
    },
  });
});

/**
 * GET /api/conversations
 * List user's conversations
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;

  const conversations = await Conversation.find({
    userId: new mongoose.Types.ObjectId(userId),
  })
    .sort({ updatedAt: -1 })
    .lean();

  const formatted = conversations.map((c) => ({
    id: c._id.toString(),
    title: c.title,
    datasetIds: c.datasetIds.map((id) => id.toString()),
    datasetSnapshots: c.datasetSnapshots,
    readOnly: c.readOnly,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }));

  res.status(200).json({ conversations: formatted });
});

/**
 * GET /api/conversations/:id
 * Fetch conversation details with snapshots
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const id = req.params.id as string;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Conversation not found' },
    });
    return;
  }

  const conversation = await Conversation.findOne({
    _id: new mongoose.Types.ObjectId(id),
    userId: new mongoose.Types.ObjectId(userId),
  }).lean();

  if (!conversation) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Conversation not found' },
    });
    return;
  }

  res.status(200).json({
    conversation: {
      id: conversation._id.toString(),
      title: conversation.title,
      datasetIds: conversation.datasetIds.map((dId) => dId.toString()),
      datasetSnapshots: conversation.datasetSnapshots,
      readOnly: conversation.readOnly,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
    },
  });
});

/**
 * PATCH /api/conversations/:id
 * Rename conversation title
 */
router.patch('/:id', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const id = req.params.id as string;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Conversation not found' },
    });
    return;
  }

  const parseResult = updateConversationSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid title',
        detail: parseResult.error.flatten(),
      },
    });
    return;
  }

  const conversation = await Conversation.findOne({
    _id: new mongoose.Types.ObjectId(id),
    userId: new mongoose.Types.ObjectId(userId),
  });

  if (!conversation) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Conversation not found' },
    });
    return;
  }

  conversation.title = parseResult.data.title;
  conversation.updatedAt = new Date();
  await conversation.save();

  res.status(200).json({
    conversation: {
      id: conversation._id.toString(),
      title: conversation.title,
      datasetIds: conversation.datasetIds.map((dId) => dId.toString()),
      datasetSnapshots: conversation.datasetSnapshots,
      readOnly: conversation.readOnly,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
    },
  });
});

/**
 * DELETE /api/conversations/:id
 * Delete conversation, associated messages, and run logs
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const id = req.params.id as string;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Conversation not found' },
    });
    return;
  }

  const conversation = await Conversation.findOne({
    _id: new mongoose.Types.ObjectId(id),
    userId: new mongoose.Types.ObjectId(userId),
  });

  if (!conversation) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Conversation not found' },
    });
    return;
  }

  // Delete all associated messages and run logs
  await Promise.all([
    Message.deleteMany({ conversationId: conversation._id }),
    RunLog.deleteMany({ conversationId: conversation._id }),
    conversation.deleteOne(),
  ]);

  res.status(200).json({
    message: 'Conversation deleted successfully',
  });
});

/**
 * GET /api/conversations/:id/messages
 * Fetch message history for a conversation
 */
router.get('/:id/messages', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const id = req.params.id as string;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Conversation not found' },
    });
    return;
  }

  const conversation = await Conversation.findOne({
    _id: new mongoose.Types.ObjectId(id),
    userId: new mongoose.Types.ObjectId(userId),
  }).lean();

  if (!conversation) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Conversation not found' },
    });
    return;
  }

  const messages = await Message.find({
    conversationId: conversation._id,
  })
    .sort({ createdAt: 1 })
    .lean();

  const formatted = messages.map((m) => ({
    id: m._id.toString(),
    conversationId: m.conversationId.toString(),
    role: m.role,
    content: m.content,
    sql: m.sql,
    tablePreview: m.tablePreview,
    chartSpec: m.chartSpec,
    chartSpecs: m.chartSpecs && m.chartSpecs.length > 0 ? m.chartSpecs : (m.chartSpec ? [m.chartSpec] : []),
    error: m.error,
    runId: m.runId,
    createdAt: m.createdAt.toISOString(),
  }));

  res.status(200).json({ messages: formatted });
});

/**
 * GET /api/conversations/:id/runs
 * Fetch run logs for conversation
 */
router.get('/:id/runs', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const id = req.params.id as string;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Conversation not found' },
    });
    return;
  }

  const conversation = await Conversation.findOne({
    _id: new mongoose.Types.ObjectId(id),
    userId: new mongoose.Types.ObjectId(userId),
  }).lean();

  if (!conversation) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Conversation not found' },
    });
    return;
  }

  const runs = await RunLog.find({
    conversationId: conversation._id,
    userId: new mongoose.Types.ObjectId(userId),
  })
    .sort({ createdAt: 1 })
    .lean();

  res.status(200).json({ runs });
});

/**
 * GET /api/conversations/:id/report
 * Fetch deterministic living analysis report in JSON or file download if ?format=md
 */
router.get('/:id/report', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const id = req.params.id as string;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Conversation not found' },
    });
    return;
  }

  try {
    const report = await buildReport(id, userId);

    if (req.query.format === 'md') {
      const safeTitle = (report.title || 'report')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'analysis';
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `analysis-report-${safeTitle}-${dateStr}.md`;

      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(report.markdown);
      return;
    }

    res.status(200).json(report);
  } catch (err: any) {
    if (err?.status === 404 || err?.message === 'Conversation not found') {
      res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Conversation not found' },
      });
      return;
    }
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to build report', detail: String(err) },
    });
  }
});

/**
 * POST /api/conversations/:id/messages
 * Ask question with SSE streaming response
 */
router.post('/:id/messages', chatRateLimiter, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const id = req.params.id as string;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Conversation not found' },
    });
    return;
  }

  const conversation = await Conversation.findOne({
    _id: new mongoose.Types.ObjectId(id),
    userId: new mongoose.Types.ObjectId(userId),
  });

  if (!conversation) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Conversation not found' },
    });
    return;
  }

  if (conversation.readOnly) {
    res.status(400).json({
      error: {
        code: 'CONVERSATION_READ_ONLY',
        message: 'This conversation is read-only because one or more datasets have been deleted.',
      },
    });
    return;
  }

  const parseResult = createMessageSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Question cannot be empty',
        detail: parseResult.error.flatten(),
      },
    });
    return;
  }

  const question = parseResult.data.content;

  // Retrieve current active datasets to load files into sandbox
  const datasets = await Dataset.find({
    _id: { $in: conversation.datasetIds },
    userId: new mongoose.Types.ObjectId(userId),
  }).lean();

  if (datasets.length !== conversation.datasetIds.length) {
    // A dataset was removed outside this session
    conversation.readOnly = true;
    await conversation.save();

    res.status(400).json({
      error: {
        code: 'DATASET_MISSING',
        message: 'One or more datasets for this conversation are missing. The conversation has been marked read-only.',
      },
    });
    return;
  }

  // Save the user question message
  const userMessage = await Message.create({
    conversationId: conversation._id,
    userId: new mongoose.Types.ObjectId(userId),
    role: 'user',
    content: question,
  });

  // Set up SSE response headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const sendEvent = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    (res as any).flush?.();
  };

  sendEvent('status', { message: 'Initializing analytical sandbox...' });

  // Prepare sandbox
  let sandbox;
  try {
    sandbox = await createSandbox(
      datasets.map((d) => ({
        tableName: d.tableName,
        filePath: d.filePath,
      }))
    );
  } catch (err: any) {
    sendEvent('error', {
      message: 'Failed to initialize database sandbox for datasets.',
      detail: err?.message,
    });
    res.end();
    return;
  }

  try {
    // Fetch recent conversation history
    const previousMessages = await Message.find({
      conversationId: conversation._id,
      _id: { $ne: userMessage._id },
    })
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();

    const history: ChatHistoryItem[] = previousMessages.reverse().map((m) => ({
      role: m.role,
      content: m.content,
      sql: m.sql,
    }));

    // Tool context for agent
    const datasetContexts: DatasetToolContext[] = datasets.map((d) => ({
      datasetId: d._id.toString(),
      tableName: d.tableName,
      filename: d.originalFilename,
      rowCount: d.rowCount,
      columns: d.columns.map((c) => ({ name: c.name, type: c.type })),
    }));

    sendEvent('status', { message: 'Analyzing question and schema relations...' });

    let tokenStreamed = false;

    const result = await runAgent({
      question,
      datasets: datasetContexts,
      sandbox,
      history,
      userId,
      conversationId: conversation._id.toString(),
      messageId: userMessage._id.toString(),
      collectorOptions: {
        onStep: (step) => {
          sendEvent('step', {
            index: step.index,
            name: step.name,
            status: step.status,
            durationMs: step.durationMs,
          });
        },
        onStatus: (message) => {
          sendEvent('status', { message });
        },
        onToken: (token) => {
          tokenStreamed = true;
          sendEvent('token', { text: token });
        },
      },
      callbacks: {
        onSql: (data) => {
          sendEvent('sql', data);
        },
        onTable: (data) => {
          sendEvent('table', data);
        },
        onChart: (chart) => {
          sendEvent('chart', chart);
        },
      },
    });

    // If tokens weren't streamed incrementally by the provider, send full answer
    if (!tokenStreamed && result.answer) {
      sendEvent('token', { text: result.answer });
    }

    // Save assistant message to DB
    const assistantMessage = await Message.create({
      conversationId: conversation._id,
      userId: new mongoose.Types.ObjectId(userId),
      role: 'assistant',
      content: result.answer,
      sql: result.sql,
      tablePreview: result.table,
      chartSpec: result.chart,
      chartSpecs: result.charts,
      error: result.status === 'failed' ? result.answer : undefined,
      runId: result.runId,
    });

    // Update conversation title if this was the first question and title was default
    const messageCount = await Message.countDocuments({ conversationId: conversation._id });
    if (messageCount <= 2 && conversation.title.includes('&')) {
      // First exchange: use the question as the title (max 50 chars)
      const shortenedTitle = question.length > 50 ? `${question.slice(0, 47)}...` : question;
      conversation.title = shortenedTitle;
    }

    conversation.updatedAt = new Date();
    await conversation.save();

    // Signal completion
    sendEvent('done', {
      messageId: assistantMessage._id.toString(),
      runId: result.runId,
    });
  } catch (err: any) {
    sendEvent('error', {
      message: err?.message || 'Unexpected error during query execution.',
      detail: String(err),
    });
  } finally {
    try {
      sandbox.close();
    } catch (_e) {}
    res.end();
  }
});

export default router;
