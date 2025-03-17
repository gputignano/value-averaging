import WebSocket from "ws";

export const createWebSocket = (url) => {
  let ws;
  const listeners = new Map();

  const connect = () => {
    ws = new WebSocket(url);

    ws.on("open", () => {
      console.log(`${new Date().toLocaleString()} ✅ WebSocket connesso`);
      listeners.forEach((handler, event) => ws.on(event, handler));
    });

    ws.on("ping", (data) => ws.pong(data));

    ws.on("error", (error) => console.log("❌ Errore WebSocket:", error));

    ws.on("close", () => {
      console.log(`${new Date().toLocaleString()} ❌ WebSocket chiuso, riconnessione...`);
      setTimeout(connect, 5000);
    });
  };

  connect();

  return {
    send: (message) => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(message);
      } else {
        console.warn("⚠️ WebSocket non connesso, impossibile inviare il messaggio.");
      }
    },

    on: (event, handler) => {
      listeners.set(event, handler);
      ws.on(event, handler);
    },

    close: () => {
      ws?.close();
    }
  };
};
