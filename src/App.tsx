import React, { useEffect, useState } from 'react';
import './style/global.css';
import { motion } from 'framer-motion';

interface RayPayloadContent {
  content: any;
  label: any;
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
    const el = document.getElementById(id);
    if (typeof window.Sfdump === 'function' && el) {
      window.Sfdump(id);
    }
  }, [id]);

  return (
    <div
      id={id}
      className="bg-[#1e1e1e] text-yellow-400 rounded p-3 mb-2 select-text shadow-inner hover:shadow-md transition-all duration-300 overflow-auto max-h-[400px]"
      style={{
        fontFamily: 'Fira Code, monospace',
        fontSize: 14,
        whiteSpace: 'pre-wrap',
      }}
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

        const values: string[] = data.payloads?.flatMap(
          (p: any) => p.content?.values || []
        ) ?? [];

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
        data.payloads.forEach((payload: RayPayload) => {
            if (payload.type.toLowerCase() === 'custom' && payload.content.label?.toLowerCase() === 'null') {
              payload.type = 'log';
              payload.content.values = ['null'];
            } else if (payload.type.toLowerCase() === 'custom' && payload.content.label?.toLowerCase() === 'boolean') {
              payload.type = 'log';
              payload.content.values = [payload.content.content ? 'true' : 'false'];
            }
        });
        setMessages((prev) => [...prev, data]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            uuid: '',
            payloads: [
              {
                type: 'log',
                content: { content: null, label: null, values: [event.data] },
              },
            ],
          },
        ]);
      }
    };

    return () => {
      socket.close();
    };
  }, []);

  const clearMessages = () => {
    setMessages([]);
  };

  return (
    <div className="h-screen w-screen bg-[#121212] text-[#e0e0e0] overflow-hidden">
      <motion.header
        className="relative text-4xl font-bold py-6 text-center text-[#00ffd1] shadow-md border-b border-[#2a2a2a]"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
      >
        Ekan Ray 🚀
        <button
          onClick={clearMessages}
          title="Clear all"
          className="absolute right-6 top-1/2 -translate-y-1/2 transform bg-[#00ffd1] text-black px-4 py-1.5 rounded-full hover:bg-[#00cfa1] transition-all flex items-center justify-center text-sm font-semibold shadow"
        >
          Clear
        </button>
      </motion.header>

      <main className="overflow-y-auto h-[calc(100vh-80px)] px-4 sm:px-8 pb-10">
        <div className="space-y-8 max-w-6xl mx-auto pt-6">
          {messages.map((msg, i) => (
            <div
              key={i}
              className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-lg p-6 shadow hover:shadow-md transition"
            >
              <div className="mb-2 text-sm text-[#999] select-text">
                <strong>UUID:</strong> {msg.uuid || '—'}
              </div>

              {Array.isArray(msg.payloads)
                ? msg.payloads.map((payload, pi) => (
                    <div key={pi} className="mb-4">
                      <div className="mb-1 text-[#00ffd1] font-semibold text-base">
                        {payload.type.toUpperCase()}
                      </div>
                      <div className="pl-4">
                        {Array.isArray(payload.content?.values)
                          ? payload.content.values.map((v, vi) => (
                              <DumpHtml
                                key={vi}
                                html={v}
                                id={`sf-dump-${i}-${pi}-${vi}`}
                              />
                            ))
                          : null}
                      </div>

                      {payload.origin && (
                        <div className="mt-1 text-xs text-gray-500 italic select-text">
                          {payload.origin.file && (
                            <>
                              <strong>Arquivo:</strong> {payload.origin.file}:
                              {payload.origin.line_number}{' '}
                            </>
                          )}
                          {payload.origin.hostname && (
                            <>
                              | <strong>Host:</strong> {payload.origin.hostname}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                : null}

              {msg.meta && (
                <div className="text-xs text-gray-600 italic select-text border-t border-[#2a2a2a] pt-2">
                  PHP v{msg.meta.php_version} — Ray v{msg.meta.ray_package_version}
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default App;