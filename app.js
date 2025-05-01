import createBinanceSocket from "./src/utils/webSocket.js";
import { WEBSOCKET_STREAM_ENDPOINT, WEBSOCKET_API_ENDPOINT, ED25519_API_KEY, ED25519_PRIVATE_KEY, WEB_APP_URL, DELTA } from "./src/config/config.js";
import { sessionLogon, getLastTrade, saveTrade, getSymbol } from "./src/utils/functions.js";

const symbol = getSymbol();
const wallet_increment = 0;
const min_notional = 5;
const price_filter = 0.01000000;
const lot_size = 0.00001000;
let isProcessing = false;

const last_trade = await getLastTrade(WEB_APP_URL);

const ws_api = createBinanceSocket(WEBSOCKET_API_ENDPOINT);

ws_api.on("close", (code, reason) => console.log(code, reason.toString(), "ws_api closed"));

ws_api.on("open", () => {
  console.log("ws_api: open");

  ws_api.send(sessionLogon(ED25519_API_KEY, ED25519_PRIVATE_KEY));
});

ws_api.on("error", (error) => console.error(error));

ws_api.on("message", async (data) => {
  const parsedData = JSON.parse(data);
  if (parsedData.status && parsedData.status !== 200) console.error(parsedData);

  switch (parsedData.id) {
    case "session_logon":

      ws_api.send(JSON.stringify({
        "id": "account_status",
        "method": "account.status",
        "params": {
          "timestamp": Date.now()
        }
      }));

      ws_api.send(JSON.stringify({
        "id": "userDataStream_subscribe",
        "method": "userDataStream.subscribe"
      }));
      break;
    case "userDataStream_subscribe":
      console.log("userDataStream_subscribe");
      break;
    case "order_place":
      // 
      break;
    case "account_status":
      //
      break;
    default:
      break;
  }

  switch (parsedData?.event?.e) {
    case "executionReport":
      const trade = parsedData.event;

      if (trade.X === "FILLED") {
        last_trade.side = trade.S;
        last_trade.time = trade.E;
        last_trade.price = parseFloat(trade.p);
        last_trade.price_executed = parseFloat(trade.L);
        last_trade.wallet_target += wallet_increment;
        last_trade.base_required = last_trade.wallet_target / last_trade.price;
        last_trade.base_to_buy = parseFloat(trade.S === "BUY" ? trade.q : -trade.q);
        last_trade.base_to_buy_fee = (trade.N === symbol.base ? parseFloat(trade.n) : 0);
        last_trade.base_owned += last_trade.base_to_buy - last_trade.base_to_buy_fee;
        last_trade.quote_spent = parseFloat(trade.S === "BUY" ? trade.Z : -trade.Z);
        last_trade.quote_spent_fee = (trade.N === symbol.quote ? parseFloat(trade.n) : 0);
        last_trade.quote_spent_sum += last_trade.quote_spent - last_trade.quote_spent_fee;
        last_trade.buffer = last_trade.wallet_target + last_trade.quote_spent_sum;

        const response = await saveTrade(WEB_APP_URL, {
          side: last_trade.side,
          time: last_trade.time,
          id: trade.i,
          price: last_trade.price,
          price_executed: last_trade.price_executed,
          wallet_target: last_trade.wallet_target,
          base_required: last_trade.base_required,
          base_to_buy: last_trade.base_to_buy,
          base_to_buy_fee: last_trade.base_to_buy_fee,
          base_owned: last_trade.base_owned,
          quote_spent: last_trade.quote_spent,
          quote_spent_fee: last_trade.quote_spent_fee,
          quote_spent_sum: last_trade.quote_spent_sum,
          buffer: last_trade.buffer
        });

        console.log(response.data);

        isProcessing = false;

        return;
      } else if (parsedData.event.X === "EXPIRED") {
        isProcessing = false;
        return;
      }

      break;
    default:
      break;
  }
});

const ws_stream = createBinanceSocket(WEBSOCKET_STREAM_ENDPOINT);

ws_stream.on("close", (code, reason) => console.log(code, reason?.toString(), "ws_stream closed"));

ws_stream.on("open", () => {
  console.log("ws_stream: open");

  ws_stream.send(JSON.stringify({
    "method": "SUBSCRIBE",
    "params": [
      "btcusdc@aggTrade"
    ],
    "id": "subscribe"
  }));
});

ws_stream.on("error", (error) => console.error(error));

ws_stream.on("message", (data) => {
  const parsedData = JSON.parse(data);

  if (parsedData.result === null) return;

  switch (parsedData.e) {
    case "aggTrade":

      if (isProcessing) return;

      const price = parseFloat(parsedData.p);

      const wallet_target = last_trade.wallet_target + wallet_increment;
      const base_required = wallet_target / price;
      const base_to_buy = parseFloat((Math.round((base_required - last_trade.base_owned) / lot_size) * lot_size).toFixed(-Math.log10(lot_size)));
      const side = base_to_buy > 0 ? "BUY" : "SELL";
      const quote_to_buy = base_to_buy * price;

      if (Math.abs(quote_to_buy) >= min_notional && Math.abs((price - last_trade.price_executed) / (price >= last_trade.price_executed ? last_trade.price_executed : price)) >= DELTA) {
        // Execute the order

        isProcessing = true;
        const trade = {
          id: "order_place",
          method: "order.place",
          params: {
            symbol: `${symbol.base}${symbol.quote}`,
            side: side,
            type: "LIMIT",
            timeInForce: "FOK",
            price: price,
            quantity: Math.abs(base_to_buy),
            timestamp: Date.now()
          }
        };

        ws_api.send(JSON.stringify(trade));
      }

      break;
    default:
      //
      break;
  }
});
