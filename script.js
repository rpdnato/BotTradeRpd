const ccxt = require('ccxt');
const TA_Lib = require('ta-lib');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const api_key = '**************************************';
const api_secret = '***************************************';
const exchange = new ccxt.binance({
  apiKey: api_key,
  secret: api_secret,
  enableRateLimit: true,
});

const symbol = 'BTC/USDT';
const timeframe = '1m';
const stop_loss_percent = 0.01;
const take_profit_percent = 0.02;

async function check_entry_conditions() {
  const historical_data = await exchange.fetchOHLCV(symbol, timeframe);
  const close_prices = historical_data.map((data) => data[4]);
  const sma = TA_Lib.SMA(close_prices, 20);

  const current_price = (await exchange.fetchTicker(symbol))['last'];
  return current_price > sma[sma.length - 1];
}

async function check_exit_conditions() {
  const historical_data = await exchange.fetchOHLCV(symbol, timeframe);
  const close_prices = historical_data.map((data) => data[4]);
  const sma = TA_Lib.SMA(close_prices, 20);

  const current_price = (await exchange.fetchTicker(symbol))['last'];
  return current_price < sma[sma.length - 1];
}

async function main() {
  while (true) {
    try {
      const ohlcv = await exchange.fetchOHLCV(symbol, timeframe, undefined, { limit: 2 });
      const current_price = ohlcv[1][4];

      if (await check_entry_conditions()) {
        const stop_loss_price = current_price * (1 - stop_loss_percent);
        const take_profit_price = current_price * (1 + take_profit_percent);

        await exchange.createMarketOrder(symbol, 'buy', 0.001);

        while (true) {
          const ohlcv = await exchange.fetchOHLCV(symbol, timeframe, undefined, { limit: 1 });
          const current_price = ohlcv[0][4];

          if (await check_exit_conditions()) {
            await exchange.createMarketOrder(symbol, 'sell', 0.001);
            break;
          }

          await sleep(10000);
        }
      }
    } catch (e) {
      console.log(`Erro: ${e}`);
    }

    await sleep(10000);
  }
}

main();
