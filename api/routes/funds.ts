import { Router } from 'express';
import { searchFundsRealtime } from '../services/fundSearch.js';
import { getFundEstimateFromEastMoney, getBatchEstimatesFromEastMoney } from '../services/fundEstimate.js';
import { getFundHistoryFromEastMoney } from '../services/fundHistory.js';

const router = Router();

// 搜索基金（使用真实API）
router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;
    const queryStr = (query as string || '').trim();
    
    const funds = queryStr ? await searchFundsRealtime(queryStr) : [];
    
    res.json({
      success: true,
      data: {
        funds,
        total: funds.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// 获取基金实时估值（使用真实API）
router.get('/estimate/:code', async (req, res) => {
  try {
    const { code } = req.params;
    
    const estimate = await getFundEstimateFromEastMoney(code);
    
    if (!estimate) {
      return res.status(404).json({
        success: false,
        error: '无法获取估值数据',
      });
    }
    
    res.json({
      success: true,
      data: estimate,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// 批量获取基金估值（使用真实API）
router.post('/estimates', async (req, res) => {
  try {
    const { codes } = req.body;
    
    if (!Array.isArray(codes)) {
      return res.status(400).json({
        success: false,
        error: 'codes must be an array',
      });
    }
    
    const estimates = await getBatchEstimatesFromEastMoney(codes);
    
    res.json({
      success: true,
      data: estimates,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// 获取基金历史数据（使用真实API）
router.get('/history/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const { period = '1m' } = req.query;
    
    const validPeriods = ['1d', '1w', '1m', '3m', '6m', '1y'];
    const validatedPeriod = validPeriods.includes(period as string) 
      ? period as string
      : '1m';
    
    const data = await getFundHistoryFromEastMoney(code, validatedPeriod);
    
    res.json({
      success: true,
      data: {
        code,
        period: validatedPeriod,
        history: data,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
