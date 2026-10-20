import express, { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { db } from './db.js';
import { parseMT5CSV } from './csvParser.js';
import { aggregateCandles, getAllowedTimeframes, isTimeframeAllowed } from './timeframeAggregator.js';
import { Candle, Timeframe } from '../types/index.js';

const apiApp = express();

// Initialize DB on boot
db.init().catch((e) => console.error('[API] DB init error:', e));

// Middleware
apiApp.use(express.json({ limit: '150mb' }));
apiApp.use(express.urlencoded({ extended: true, limit: '150mb' }));

// Health / Status
apiApp.get('/health', async (_req: Request, res: Response) => {
  const status = await db.getStatus();
  res.json(status);
});

apiApp.get('/db-status', async (_req: Request, res: Response) => {
  const status = await db.getStatus();
  res.json(status);
});

// GET /api/datasets - List all datasets
apiApp.get('/datasets', async (_req: Request, res: Response) => {
  try {
    const datasets = await db.getAllDatasets();
    res.json(datasets);
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal mengambil daftar dataset: ' + err.message });
  }
});

// GET /api/datasets/:id - Dataset detail
apiApp.get('/datasets/:id', async (req: Request, res: Response) => {
  try {
    const dataset = await db.getDataset(req.params.id);
    if (!dataset) {
      return res.status(404).json({ error: 'Dataset tidak ditemukan.' });
    }
    res.json(dataset);
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal mengambil detail dataset: ' + err.message });
  }
});

// GET /api/datasets/:id/timeframes - Allowed timeframes
apiApp.get('/datasets/:id/timeframes', async (req: Request, res: Response) => {
  try {
    const dataset = await db.getDataset(req.params.id);
    if (!dataset) {
      return res.status(404).json({ error: 'Dataset tidak ditemukan.' });
    }
    const sourceTf = dataset.timeframe as Timeframe;
    const allowed = getAllowedTimeframes(sourceTf);
    res.json({ sourceTimeframe: sourceTf, allowedTimeframes: allowed });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/datasets/preview - Preview CSV without saving
apiApp.post('/datasets/preview', async (req: Request, res: Response) => {
  try {
    const { csvContent, fileName, symbol, timeframe } = req.body;
    if (!csvContent) {
      return res.status(400).json({ error: 'Konten CSV tidak ditemukan.' });
    }

    const sym = (symbol || 'XAUUSD').toUpperCase().trim();
    const tf = timeframe as Timeframe | undefined;

    const parsed = parseMT5CSV(csvContent, sym, tf);
    if (!parsed.valid) {
      return res.status(400).json({
        valid: false,
        error: parsed.error || 'Format MT5 CSV tidak valid.',
        details: parsed,
      });
    }

    res.json({
      valid: true,
      fileName: fileName || 'preview.csv',
      fileSize: Buffer.byteLength(csvContent, 'utf-8'),
      symbol: parsed.symbol,
      detectedTimeframe: parsed.detectedTimeframe,
      totalRows: parsed.totalRows,
      validRows: parsed.validRows,
      invalidRows: parsed.invalidRows,
      duplicateRows: parsed.duplicateRows,
      firstTimestamp: parsed.firstTimestamp,
      lastTimestamp: parsed.lastTimestamp,
      minPrice: parsed.minPrice,
      maxPrice: parsed.maxPrice,
      sampleCandles: parsed.sampleCandles,
    });
  } catch (err: any) {
    console.error('Preview error:', err);
    res.status(500).json({ error: 'Gagal memproses preview: ' + err.message });
  }
});

// POST /api/datasets/import - Import CSV to database
apiApp.post('/datasets/import', async (req: Request, res: Response) => {
  const jobId = randomUUID();
  try {
    const { csvContent, fileName, name, symbol, timeframe } = req.body;
    if (!csvContent) {
      return res.status(400).json({ error: 'Konten CSV diperlukan.' });
    }

    const sym = (symbol || 'XAUUSD').toUpperCase().trim();
    const dsName = (name || `${sym} MT5 ${fileName || 'Data'}`).trim();
    const fName = fileName || 'uploaded_mt5.csv';
    const fileSize = Buffer.byteLength(csvContent, 'utf-8');
    const tfOverride = timeframe as Timeframe | undefined;

    await db.saveJob({
      id: jobId,
      fileName: fName,
      fileSize,
      symbol: sym,
      timeframe: tfOverride || 'M1',
      status: 'PROCESSING',
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      duplicateRows: 0,
      progressPercent: 15.0,
      startedAt: new Date().toISOString(),
    });

    const parsed = parseMT5CSV(csvContent, sym, tfOverride);
    if (!parsed.valid || parsed.candles.length === 0) {
      await db.saveJob({
        id: jobId,
        fileName: fName,
        fileSize,
        symbol: sym,
        timeframe: tfOverride || 'M1',
        status: 'FAILED',
        totalRows: parsed.totalRows,
        validRows: 0,
        invalidRows: parsed.invalidRows,
        duplicateRows: parsed.duplicateRows,
        progressPercent: 0,
        errorMessage: parsed.error || 'CSV tidak berisi candle valid.',
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      });
      return res.status(400).json({ error: parsed.error || 'CSV tidak berisi candle valid.' });
    }

    const datasetId = randomUUID();
    const firstCandle = parsed.candles[0];
    const lastCandle = parsed.candles[parsed.candles.length - 1];

    const datasetRecord = {
      id: datasetId,
      name: dsName,
      symbol: sym,
      timeframe: parsed.detectedTimeframe,
      startDate: new Date(firstCandle.timestamp * 1000).toISOString(),
      endDate: new Date(lastCandle.timestamp * 1000).toISOString(),
      candleCount: parsed.candles.length,
      fileSize,
      sourceFormat: 'MT5_CSV',
      status: 'READY',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.saveDataset(datasetRecord);
    await db.insertCandles(datasetId, parsed.candles);

    await db.saveJob({
      id: jobId,
      datasetId,
      fileName: fName,
      fileSize,
      symbol: sym,
      timeframe: parsed.detectedTimeframe,
      status: 'COMPLETED',
      totalRows: parsed.totalRows,
      validRows: parsed.validRows,
      invalidRows: parsed.invalidRows,
      duplicateRows: parsed.duplicateRows,
      progressPercent: 100.0,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    });

    res.status(201).json({
      success: true,
      jobId,
      dataset: datasetRecord,
      stats: {
        totalRows: parsed.totalRows,
        validRows: parsed.validRows,
        invalidRows: parsed.invalidRows,
        duplicateRows: parsed.duplicateRows,
        timeframe: parsed.detectedTimeframe,
      },
    });
  } catch (err: any) {
    console.error('Import error:', err);
    res.status(500).json({ error: 'Gagal melakukan import dataset: ' + err.message });
  }
});

// GET /api/datasets/:id/import-status
apiApp.get('/datasets/:id/import-status', async (req: Request, res: Response) => {
  try {
    const job = await db.getJob(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Import job tidak ditemukan.' });
    }
    res.json(job);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/datasets/:id/candles
apiApp.get('/datasets/:id/candles', async (req: Request, res: Response) => {
  try {
    const datasetId = req.params.id;
    const requestedTf = (req.query.timeframe as Timeframe) || 'M1';
    const maxTimestamp = req.query.maxTimestamp ? parseInt(req.query.maxTimestamp as string, 10) : undefined;
    const limit = req.query.limit ? Math.min(parseInt(req.query.limit as string, 10), 500000) : 200000;

    const dataset = await db.getDataset(datasetId);
    if (!dataset) {
      return res.status(404).json({ error: 'Dataset tidak ditemukan.' });
    }

    const sourceTf = (dataset.timeframe as Timeframe) || 'M1';
    // Fallback to source timeframe if requested timeframe is lower than source
    const effectiveTf: Timeframe = isTimeframeAllowed(sourceTf, requestedTf) ? requestedTf : sourceTf;

    // Fetch raw source candles up to maxTimestamp
    const rawCandles = await db.getCandles(datasetId, maxTimestamp, limit);

    // Aggregate to requested timeframe without leaking future data
    const aggregated = aggregateCandles(rawCandles, sourceTf, effectiveTf, maxTimestamp);

    res.json({
      datasetId,
      sourceTimeframe: sourceTf,
      activeTimeframe: effectiveTf,
      candleCount: aggregated.length,
      candles: aggregated,
    });
  } catch (err: any) {
    console.error('Candles error:', err);
    res.status(500).json({ error: 'Gagal mengambil candles: ' + err.message });
  }
});

// SESSIONS ENDPOINTS
apiApp.get('/backtest-sessions', async (_req: Request, res: Response) => {
  try {
    const sessions = await db.getAllSessions();
    res.json(sessions);
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal mengambil sesi: ' + err.message });
  }
});

apiApp.get('/backtest-sessions/:id', async (req: Request, res: Response) => {
  try {
    const session = await db.getSession(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Sesi tidak ditemukan.' });
    }
    res.json(session);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiApp.post('/backtest-sessions', async (req: Request, res: Response) => {
  try {
    const { name, datasetId, activeTimeframe, startReplayTime, replaySpeed, notes } = req.body;
    if (!name || !datasetId) {
      return res.status(400).json({ error: 'Nama sesi dan datasetId wajib diisi.' });
    }

    const dataset = await db.getDataset(datasetId);
    if (!dataset) {
      return res.status(404).json({ error: 'Dataset tidak ditemukan.' });
    }

    const sourceTf = dataset.timeframe as Timeframe;
    const tf = (activeTimeframe as Timeframe) || sourceTf;

    if (!isTimeframeAllowed(sourceTf, tf)) {
      return res.status(400).json({ error: `Timeframe ${tf} tidak valid untuk dataset sumber ${sourceTf}.` });
    }

    let initialTime = startReplayTime;
    if (!initialTime) {
      const candles = await db.getCandles(datasetId, undefined, 1);
      initialTime = candles.length > 0 ? candles[0].timestamp : Math.floor(Date.now() / 1000);
    }

    const sessionId = randomUUID();
    const speed = replaySpeed || 1.0;

    await db.saveSession({
      id: sessionId,
      name,
      datasetId,
      symbol: dataset.symbol,
      sourceTimeframe: sourceTf,
      activeTimeframe: tf,
      startReplayTime: initialTime,
      currentReplayTime: initialTime,
      currentCandleIndex: 0,
      replaySpeed: speed,
      status: 'ACTIVE',
      notes: notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await db.saveReplayState({
      id: randomUUID(),
      sessionId,
      currentTime: initialTime,
      currentIndex: 0,
      speed,
      activeTimeframe: tf,
      isPlaying: false,
      lastSavedAt: new Date().toISOString(),
    });

    res.status(201).json({ id: sessionId, message: 'Sesi backtest berhasil dibuat!' });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal membuat sesi: ' + err.message });
  }
});

apiApp.patch('/backtest-sessions/:id', async (req: Request, res: Response) => {
  try {
    const session = await db.getSession(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Sesi tidak ditemukan.' });
    }

    const { name, activeTimeframe, replaySpeed, status, notes } = req.body;
    if (name !== undefined) session.name = name;
    if (activeTimeframe !== undefined) session.activeTimeframe = activeTimeframe;
    if (replaySpeed !== undefined) session.replaySpeed = replaySpeed;
    if (status !== undefined) session.status = status;
    if (notes !== undefined) session.notes = notes;
    session.updatedAt = new Date().toISOString();

    await db.saveSession(session);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiApp.patch('/backtest-sessions/:id/replay-state', async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.id;
    const { currentTime, currentIndex, speed, activeTimeframe, isPlaying } = req.body;

    if (currentTime === undefined) {
      return res.status(400).json({ error: 'currentTime wajib ada.' });
    }

    await db.saveReplayState({
      id: randomUUID(),
      sessionId,
      currentTime,
      currentIndex: currentIndex || 0,
      speed: speed || 1.0,
      activeTimeframe: activeTimeframe || 'M1',
      isPlaying: Boolean(isPlaying),
      lastSavedAt: new Date().toISOString(),
    });

    res.json({ success: true, savedAt: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal menyimpan posisi replay: ' + err.message });
  }
});

apiApp.delete('/backtest-sessions/:id', async (req: Request, res: Response) => {
  try {
    await db.deleteSession(req.params.id);
    res.json({ success: true, message: 'Sesi backtest berhasil dihapus.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/backtest-sessions/:id/drawings
apiApp.get('/backtest-sessions/:id/drawings', async (req: Request, res: Response) => {
  try {
    const drawings = await db.getDrawings(req.params.id);
    res.json(drawings);
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal mengambil drawings: ' + err.message });
  }
});

// POST /api/backtest-sessions/:id/drawings - Save/Replace drawings
apiApp.post('/backtest-sessions/:id/drawings', async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.id;
    const drawings = req.body.drawings || [];
    await db.saveAllDrawings(sessionId, drawings);
    res.json({ success: true, count: drawings.length });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal menyimpan drawings: ' + err.message });
  }
});

// DELETE /api/backtest-sessions/:id/drawings/:drawingId
apiApp.delete('/backtest-sessions/:id/drawings/:drawingId', async (req: Request, res: Response) => {
  try {
    await db.deleteDrawing(req.params.drawingId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal menghapus drawing: ' + err.message });
  }
});

// GET /api/backtest-sessions/:id/preference
apiApp.get('/backtest-sessions/:id/preference', async (req: Request, res: Response) => {
  try {
    const pref = await db.getPreference(req.params.id);
    res.json(pref || {
      sessionId: req.params.id,
      timezone: 'Asia/Jakarta',
      showVolume: true,
      volumeType: 'TICK',
      volumeHeight: 0.18,
      indicators: [
        { id: 'ema-9', type: 'EMA', name: 'EMA 9', visible: true, period: 9, color: '#3b82f6', strokeWidth: 2, pane: 'main' },
        { id: 'ema-21', type: 'EMA', name: 'EMA 21', visible: true, period: 21, color: '#f59e0b', strokeWidth: 2, pane: 'main' },
        { id: 'ema-200', type: 'EMA', name: 'EMA 200', visible: false, period: 200, color: '#ef4444', strokeWidth: 2, pane: 'main' },
      ],
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal mengambil preferensi: ' + err.message });
  }
});

// POST /api/backtest-sessions/:id/preference
apiApp.post('/backtest-sessions/:id/preference', async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.id;
    const pref = req.body;
    await db.savePreference({
      ...pref,
      sessionId,
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal menyimpan preferensi: ' + err.message });
  }
});

export default apiApp;
