import { Request, Response, Router } from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import multer from 'multer';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { uploadRateLimiter } from '../middleware/rateLimit.js';
import { Dataset } from '../models/Dataset.js';
import { Conversation } from '../models/Conversation.js';
import { renameDatasetSchema } from '../schemas/index.js';
import { generateUniqueTableName, sanitizeTableName } from '../services/datasets/tableName.js';
import { ingestCsv } from '../services/datasets/ingestCsv.js';

const router = Router();

// Configure multer with memory storage so we can validate and stream to user directory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.MAX_FILE_MB * 1024 * 1024,
    files: env.MAX_FILES_PER_UPLOAD,
  },
  fileFilter: (_req, file, cb) => {
    const isCsvExt = file.originalname.toLowerCase().endsWith('.csv');
    const isCsvMime =
      file.mimetype === 'text/csv' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.mimetype === 'text/plain' ||
      file.mimetype === 'application/csv';

    if (isCsvExt && isCsvMime) {
      cb(null, true);
    } else {
      cb(new Error(`File ${file.originalname} is not a valid CSV file.`));
    }
  },
});

// All dataset routes require authentication
router.use(requireAuth);

// POST /api/datasets (multi-CSV upload)
router.post(
  '/',
  uploadRateLimiter,
  upload.array('files', env.MAX_FILES_PER_UPLOAD),
  async (req: Request, res: Response): Promise<void> => {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({
        error: {
          code: 'NO_FILES_PROVIDED',
          message: 'Please select at least one CSV file to upload.',
        },
      });
      return;
    }

    const userId = req.user!.id;
    const userStorageDir = path.resolve(env.STORAGE_DIR, userId);
    await fs.mkdir(userStorageDir, { recursive: true });

    const results = [];

    for (const file of files) {
      const datasetId = new mongoose.Types.ObjectId();
      const savedFilePath = path.join(userStorageDir, `${datasetId.toString()}.csv`);

      try {
        // Write file buffer to storage
        await fs.writeFile(savedFilePath, file.buffer);

        // Ingest into DuckDB to validate format, get rowCount and columns
        const { rowCount, columns } = await ingestCsv(savedFilePath);

        // Generate sanitized, collision-free table name
        const tableName = await generateUniqueTableName(userId, file.originalname);

        // Display name defaults to filename without extension
        const displayName = file.originalname.replace(/\.[^/.]+$/, '');

        // Persist dataset document
        const dataset = await Dataset.create({
          _id: datasetId,
          userId: new mongoose.Types.ObjectId(userId),
          name: displayName,
          originalFilename: file.originalname,
          tableName,
          filePath: savedFilePath,
          sizeBytes: file.size,
          rowCount,
          columns,
        });

        results.push({
          filename: file.originalname,
          status: 'ok',
          dataset: {
            id: dataset._id.toString(),
            name: dataset.name,
            originalFilename: dataset.originalFilename,
            tableName: dataset.tableName,
            sizeBytes: dataset.sizeBytes,
            rowCount: dataset.rowCount,
            columns: dataset.columns,
            createdAt: dataset.createdAt.toISOString(),
          },
        });
      } catch (err: any) {
        // Remove corrupted or invalid file from disk
        await fs.unlink(savedFilePath).catch(() => {});

        results.push({
          filename: file.originalname,
          status: 'error',
          message: err?.message || 'Failed to parse and ingest CSV',
        });
      }
    }

    res.status(201).json({ results });
  }
);

// GET /api/datasets
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const datasets = await Dataset.find({ userId: new mongoose.Types.ObjectId(userId) })
    .sort({ createdAt: -1 })
    .lean();

  const formatted = datasets.map((d) => ({
    id: d._id.toString(),
    name: d.name,
    originalFilename: d.originalFilename,
    tableName: d.tableName,
    sizeBytes: d.sizeBytes,
    rowCount: d.rowCount,
    columns: d.columns,
    createdAt: d.createdAt.toISOString(),
  }));

  res.status(200).json({ datasets: formatted });
});

// GET /api/datasets/:id (schema + first 20 rows)
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const id = req.params.id as string;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Dataset not found' },
    });
    return;
  }

  const dataset = await Dataset.findOne({
    _id: new mongoose.Types.ObjectId(id),
    userId: new mongoose.Types.ObjectId(userId),
  }).lean();

  if (!dataset) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Dataset not found' },
    });
    return;
  }

  try {
    const { previewRows } = await ingestCsv(dataset.filePath);

    res.status(200).json({
      dataset: {
        id: dataset._id.toString(),
        name: dataset.name,
        originalFilename: dataset.originalFilename,
        tableName: dataset.tableName,
        sizeBytes: dataset.sizeBytes,
        rowCount: dataset.rowCount,
        columns: dataset.columns,
        createdAt: dataset.createdAt.toISOString(),
      },
      previewRows,
    });
  } catch (err: any) {
    res.status(500).json({
      error: {
        code: 'PREVIEW_ERROR',
        message: 'Could not generate preview for dataset',
        detail: err?.message,
      },
    });
  }
});

// PATCH /api/datasets/:id (rename display name or table name)
router.patch('/:id', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const id = req.params.id as string;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Dataset not found' },
    });
    return;
  }

  const parseResult = renameDatasetSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid rename parameters',
        detail: parseResult.error.flatten(),
      },
    });
    return;
  }

  const { name, tableName } = parseResult.data;

  const dataset = await Dataset.findOne({
    _id: new mongoose.Types.ObjectId(id),
    userId: new mongoose.Types.ObjectId(userId),
  });

  if (!dataset) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Dataset not found' },
    });
    return;
  }

  if (name) {
    dataset.name = name;
  }

  if (tableName) {
    const sanitized = sanitizeTableName(tableName);
    // Check if another dataset owned by this user has this tableName
    const collision = await Dataset.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      tableName: sanitized,
      _id: { $ne: dataset._id },
    });

    if (collision) {
      res.status(409).json({
        error: {
          code: 'TABLE_NAME_COLLISION',
          message: `Table name "${sanitized}" is already in use. Please pick another.`,
        },
      });
      return;
    }
    dataset.tableName = sanitized;
  }

  await dataset.save();

  res.status(200).json({
    dataset: {
      id: dataset._id.toString(),
      name: dataset.name,
      originalFilename: dataset.originalFilename,
      tableName: dataset.tableName,
      sizeBytes: dataset.sizeBytes,
      rowCount: dataset.rowCount,
      columns: dataset.columns,
      createdAt: dataset.createdAt.toISOString(),
    },
  });
});

// DELETE /api/datasets/:id
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const id = req.params.id as string;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Dataset not found' },
    });
    return;
  }

  const dataset = await Dataset.findOne({
    _id: new mongoose.Types.ObjectId(id),
    userId: new mongoose.Types.ObjectId(userId),
  });

  if (!dataset) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Dataset not found' },
    });
    return;
  }

  // Remove physical CSV file
  await fs.unlink(dataset.filePath).catch(() => {});

  // Remove DB record
  await dataset.deleteOne();

  // Mark conversations that used this dataset as readOnly
  await Conversation.updateMany(
    { datasetIds: dataset._id },
    { $set: { readOnly: true } }
  );

  res.status(200).json({
    message: 'Dataset deleted successfully',
  });
});

export default router;
