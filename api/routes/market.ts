import { Router } from 'express';
import { getMarketIndices, getIndexTrend, getIndexKline } from '../services/marketIndex.js';

const router = Router();

router.get('/indices', async (_req, res) => {
  try {
    const indices = await getMarketIndices();
    res.json({
      success: true,
      data: indices,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/trend/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const data = await getIndexTrend(code);
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/kline/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const period = (req.query.period as string) || 'day';
    const data = await getIndexKline(code, period);
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
