import React, { useEffect, useState } from 'react';
import './style/global.css';

interface RayPayloadContent {
  values: string[];
  meta?: any[];
}

interface RayPayload {
  type: string;
  content: RayPayloadContent;
  origin?: {
    file?: string;
    line_number?: number;
    hostname?: string;
  };
}

interface RayMessage {
  uuid: string;
  payloads: RayPayload[];
  meta?: any;
}

function DumpHtml({ html, id }: { html: string; id: string }) {
  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof window.Sfdump === 'function') {
        window.Sfdump(id);
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [id]);

  return (
    <div
      id={id}
      className="bg-gray-800 text-yellow-400 rounded p-2 mb-2 select-text"
      style={{ fontFamily: 'monospace', fontSize: 14, whiteSpace: 'pre-wrap' }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function App() {
  const [messages, setMessages] = useState<RayMessage[]>([]);

  useEffect(() => {
    const socket = new WebSocket('ws://localhost:8080');

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Processar scripts sf-dump
        const values: string[] = data.payloads?.flatMap((p: any) => p.content?.values || []) ?? [];

        values.forEach((htmlString) => {
          const temp = document.createElement('div');
          temp.innerHTML = htmlString;

          const scriptTags = temp.querySelectorAll('script');
          scriptTags.forEach((script) => {
            const tag = document.createElement('script');
            if (script.src) {
              tag.src = script.src;
              tag.async = false;
            } else {
              tag.textContent = script.textContent;
            }
            document.body.appendChild(tag);
          });
        });

        setMessages((prev) => [...prev, data]);
      } catch {
        setMessages((prev) => [
          ...prev,
          { uuid: '', payloads: [{ type: 'log', content: { values: [event.data] } }] },
        ]);
      }
    };

    return () => {
      socket.close();
    };
  }, []);

  return (
    <div className="p-4 font-mono bg-black text-white min-h-screen overflow-auto">
      <h1 className="text-2xl font-bold mb-6 text-green-400">Ray Debug Viewer</h1>
      <div className="space-y-8 max-w-4xl mx-auto">
        {messages.map((msg, i) => (
          <div key={i} className="bg-gray-900 rounded p-4 shadow-md border border-gray-700">
            <div className="mb-2 text-sm text-gray-400 select-text">
              <strong>UUID:</strong> {msg.uuid || '—'}
            </div>
            {msg.payloads.map((payload, pi) => (
              <div key={pi} className="mb-4">
                <div className="mb-1 text-yellow-300 font-semibold">{payload.type.toUpperCase()}</div>
                <div className="pl-4">
                  {payload.content.values.map((v, vi) => (
                    <DumpHtml key={vi} html={v} id={`sf-dump-${i}-${pi}-${vi}`} />
                  ))}
                </div>
                {payload.origin && (
                  <div className="mt-1 text-xs text-gray-500 italic select-text">
                    {payload.origin.file && (
                      <>
                        <strong>Arquivo:</strong> {payload.origin.file}:{payload.origin.line_number}{' '}
                      </>
                    )}
                    {payload.origin.hostname && <>| <strong>Host:</strong> {payload.origin.hostname}</>}
                  </div>
                )}
              </div>
            ))}
            {msg.meta && (
              <div className="text-xs text-gray-600 italic select-text border-t border-gray-700 pt-2">
                PHP v{msg.meta.php_version} — Ray v{msg.meta.ray_package_version}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;