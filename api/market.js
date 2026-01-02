import yahooFinance from 'yahoo-finance2';

export default async function handler(request, response) {
  // 1. Handle CORS (allows your local dev server to talk to this backend)
  response.setHeader('Access-Control-Allow-Credentials', true);
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  response.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  const { ticker, type } = request.query;
  if (!ticker) return response.status(400).json({ error: 'Ticker required' });

  try {
    let data;

    // A. Historical Data (for Charts & Quant Engine)
    if (type === 'history') {
      const queryOptions = { period1: '2023-01-01', interval: '1d' };
      const history = await yahooFinance.historical(ticker, queryOptions);
      
      data = history.map(day => ({
        date: day.date.toISOString().split('T')[0],
        timestamp: Math.floor(new Date(day.date).getTime() / 1000),
        open: day.open,
        high: day.high,
        low: day.low,
        close: day.adjClose || day.close,
        volume: day.volume
      }));
    } 
    
    // B. Full Quote & Fundamentals (for AI Analysis)
    else if (type === 'quote') {
      // Fetch multiple modules in parallel for speed
      const result = await yahooFinance.quoteSummary(ticker, {
        modules: ['price', 'summaryDetail', 'defaultKeyStatistics', 'financialData']
      });

      const price = result.price || {};
      const summary = result.summaryDetail || {};
      const stats = result.defaultKeyStatistics || {};
      const financial = result.financialData || {};

      data = {
        symbol: price.symbol,
        price: price.regularMarketPrice,
        change: price.regularMarketChange,
        changePercent: price.regularMarketChangePercent,
        marketCap: price.marketCap,
        volume: price.regularMarketVolume,
        // Deep Fundamentals for Claude
        forwardPE: summary.forwardPE,
        trailingPE: summary.trailingPE,
        pegRatio: stats.pegRatio,
        profitMargins: financial.profitMargins,
        grossMargins: financial.grossMargins,
        revenueGrowth: financial.revenueGrowth,
        operatingMargins: financial.operatingMargins,
        targetPrice: financial.targetMeanPrice,
        recommendation: financial.recommendationKey,
        fiftyTwoWeekHigh: summary.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: summary.fiftyTwoWeekLow
      };
    }

    return response.status(200).json(data);
  } catch (error) {
    console.error("Yahoo API Error:", error);
    return response.status(500).json({ error: error.message });
  }
}