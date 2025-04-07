import WebSocket from "ws";

// export const createWebSocket = (url) => {
//   let ws;
//   const listeners = new Map();

//   const connect = () => {
//     ws = new WebSocket(url);

//     ws.on("open", () => {
//       console.log(`${new Date().toLocaleString()} ✅ WebSocket connesso`);
//       // listeners.forEach((handler, event) => ws.on(event, handler));
//     });

//     ws.on("ping", (data) => ws.pong(data));

//     ws.on("error", (error) => console.log("❌ Errore WebSocket:", error));

//     ws.on("close", () => {
//       console.log(`${new Date().toLocaleString()} ❌ WebSocket chiuso, riconnessione...`);
//       setTimeout(connect, 5000);
//     });
//   };

//   connect();

//   return {
//     send: (message) => {
//       if (ws?.readyState === WebSocket.OPEN) {
//         ws.send(message);
//       } else {
//         console.warn("⚠️ WebSocket non connesso, impossibile inviare il messaggio.");
//       }
//     },

//     on: (event, handler) => {
//       listeners.set(event, handler);
//       ws.on(event, handler);
//     },

//     close: () => {
//       ws?.close();
//     }
//   };
// };

// binanceSocket.js

export default function createBinanceSocket(url) {
  let socket = null;
  let reconnectInterval = 5000; // Intervallo di riconnessione (5 secondi)
  let manualClose = false; // Flag per indicare la chiusura manuale

  const connect = () => {
    socket = new WebSocket(url);

    socket.on('open', () => {
      console.log('Connessione WebSocket a Binance aperta');
      reconnectInterval = 5000; // Resetta l'intervallo di riconnessione
      manualClose = false; // Resetta il flag di chiusura manuale
    });

    socket.on('ping', (data) => {
      socket.pong(data); // Invia il payload di ping con pong
    });

    socket.on('close', (event) => {
      console.log(`Connessione WebSocket chiusa: ${event.code} ${event.reason}`);
      if (!manualClose) {
        reconnect(); // Riconnetti solo se la chiusura non è manuale
      }
    });

    socket.on('error', (error) => {
      console.error('Errore WebSocket:', error);
      if (!manualClose) {
        reconnect(); // Riconnetti solo se la chiusura non è manuale
      }
    });
  };

  const reconnect = () => {
    console.log(`Tentativo di riconnessione in ${reconnectInterval / 1000} secondi...`);
    setTimeout(connect, reconnectInterval);
    reconnectInterval = Math.min(reconnectInterval * 2, 60000); // Aumenta l'intervallo fino a 60 secondi
  };

  connect();

  return {
    getSocket: () => socket,
    send: (data) => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(data);
      } else {
        console.error('Socket non connesso o non aperto');
      }
    },
    close: () => {
      if (socket) {
        manualClose = true; // Imposta il flag di chiusura manuale
        socket.close();
      }
    },
  };
}
