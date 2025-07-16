import http from 'http';
import WebSocket, { WebSocketServer } from 'ws';

const PORT_HTTP = 23517;
const PORT_WS = 8080;
const HOST = '127.0.0.1';

let clients: WebSocket[] = [];

export function startRayServer() {
  const wss = new WebSocketServer({ port: PORT_WS });

  wss.on('connection', (ws) => {
    clients.push(ws);
    console.log('🧩 Cliente React conectado via WS');

    ws.on('close', () => {
      clients = clients.filter(c => c !== ws);
    });
  });

  const server = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/_availability_check') {
      res.writeHead(404);
      res.end();
      return;
    }

    if (req.method === 'POST' && req.url === '/') {
      let body = '';

      req.on('data', chunk => {
        body += chunk.toString();
      });

      req.on('end', () => {
        try {
          const json = JSON.parse(body);
          const message = JSON.stringify(json, null, 2);

          console.log('📥 Ray PHP enviou:\n', message);

          // envia para React via WS
          clients.forEach(ws => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(message);
            }
          });

          res.writeHead(200);
          res.end();
        } catch (err: any) {
          console.error('❌ JSON inválido:', err.message);
          console.log('📦 Conteúdo bruto:', body);
          res.writeHead(400);
          res.end();
        }
      });

      return;
    }

    res.writeHead(404);
    res.end();
  });

  server.listen(PORT_HTTP, HOST, () => {
    console.log(`🚀 Ray HTTP escutando em http://${HOST}:${PORT_HTTP}`);
    console.log(`🌐 WebSocket ativo em ws://localhost:${PORT_WS}`);
  });
}