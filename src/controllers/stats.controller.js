import * as statsService from '../services/stats.service.js';

export const getSummary = async (req, res) => {
  try {
    const { from, to } = req.query;
    const stats = await statsService.getStatsSummary({ from, to });
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
};

export const getSales = async (req, res) => {
  try {
    const { from, to, groupBy } = req.query;
    if (groupBy && !['day', 'month'].includes(groupBy)) {
      return res.status(400).json({ error: { message: "groupBy must be 'day' or 'month'" } });
    }
    const sales = await statsService.getSalesByPeriod({ from, to, groupBy });
    res.json(sales);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
};

export const getTopProducts = async (req, res) => {
  try {
    const { from, to, limit } = req.query;
    const products = await statsService.getTopProducts({ 
      from, 
      to, 
      limit: limit ? parseInt(limit, 10) : 5 
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
};

export const getCustomers = async (req, res) => {
  try {
    const stats = await statsService.getCustomerStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
};

export const getConversion = async (req, res) => {
  try {
    const { from, to } = req.query;
    const stats = await statsService.getConversionStats({ from, to });
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
};

export const getPurchaseTime = async (req, res) => {
  try {
    const { from, to } = req.query;
    const stats = await statsService.getPurchaseTimeStats({ from, to });
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
};
