// import WebSocket from "ws";
import createBinanceSocket from "./src/utils/webSocket.js";
import { WEBSOCKET_STREAM_ENDPOINT, WEBSOCKET_API_ENDPOINT, ED25519_API_KEY, ED25519_PRIVATE_KEY } from "./src/config/config.js";
import { sessionLogon } from "./src/utils/functions.js";

const symbol = {
  base: "BTC",
  quote: "USDC"
};
const wallet_increment = 0;
const min_notional = 5;
const price_filter = 0.01000000;
const lot_size = 0.00001000;
let isProcessing = false;
const last_trade = {
  side: null,
  time: null,
  price: 0,
  price_executed: 0,
  wallet_target: 1000, // Set initial value
  base_required: 0,
  base_to_buy: 0,
  base_to_buy_fee: 0,
  base_owned: 0, // Set initial value
  quote_spent: 0,
  quote_spent_fee: 0,
  quote_spent_sum: 0, // Set initial value
  delta: 0,
  buffer: 0 // Set initial value
};

const ws_api = createBinanceSocket(WEBSOCKET_API_ENDPOINT);

ws_api.getSocket().on("close", (code, reason) => console.log(code, reason.toString(), "ws_api closed"));

ws_api.getSocket().on("open", () => {
  console.log("ws_api: open");

  ws_api.send(sessionLogon(ED25519_API_KEY, ED25519_PRIVATE_KEY));
});

ws_api.getSocket().on("error", (error) => console.error(error));

ws_api.getSocket().on("message", (data) => {
  const parsedData = JSON.parse(data);

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
      // const btcBalance = parsedData.result.balances.filter(row => row.asset === "BTC")[0].free;

      // ws_api.send(JSON.stringify({
      //   id: "order_place",
      //   method: "order.place",
      //   params: {
      //     symbol: `${symbol.base}${symbol.quote}`,
      //     side: "SELL",
      //     type: "MARKET",
      //     quantity: btcBalance,
      //     timestamp: Date.now()
      //   }
      // }));

      const ws_stream = createBinanceSocket(WEBSOCKET_STREAM_ENDPOINT);

      ws_stream.getSocket().on("close", (code, reason) => console.log(code, reason.toString(), "ws_stream closed"));

      ws_stream.getSocket().on("open", () => {
        console.log("ws_stream: open");

        ws_stream.send(JSON.stringify({
          "method": "SUBSCRIBE",
          "params": [
            "btcusdc@aggTrade"
          ],
          "id": "subscribe"
        }));
      });

      ws_stream.getSocket().on("error", (error) => console.error(error));

      ws_stream.getSocket().on("message", (data) => {
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

            if (Math.abs(quote_to_buy) >= min_notional && Math.abs((price - last_trade.price) / last_trade.price) >= 0.01) {
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
    default:
      break;
  }

  switch (parsedData?.event?.e) {
    case "executionReport":
      const trade = parsedData.event;

      if (trade.X === "FILLED") {
        last_trade.x = trade.x;
        last_trade.X = trade.X;
        last_trade.side = trade.S;
        last_trade.time = new Date(trade.E).toLocaleString();
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
        last_trade.delta = wallet_increment - last_trade.quote_spent;
        last_trade.buffer += last_trade.delta;

        isProcessing = false;

        // console.log(parsedData, last_trade);
        console.log(`${last_trade.side},${last_trade.price_executed},${last_trade.base_to_buy},${last_trade.base_owned},${last_trade.quote_spent},${last_trade.quote_spent_sum},${last_trade.delta},${last_trade.buffer}`);

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
