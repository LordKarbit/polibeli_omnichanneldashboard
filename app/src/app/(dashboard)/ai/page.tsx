'use client';

import { useState, useRef, useEffect } from 'react';
import { ChartCard } from '@/components/ui/chart-card';
import { Send, Bot, User, Sparkles, Copy, Download, BarChart3, Table2, Lightbulb, TrendingUp, AlertTriangle, CheckCircle2, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { autoInsights } from '@/data/mock/phase-completion';
import { downloadCSV } from '@/lib/download';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sql?: string;
  table?: { headers: string[]; rows: string[][] };
  chartSuggestion?: string;
  timestamp: Date;
}

const suggestedQuestions = [
  'Berapa total GMV GT bulan April berdasarkan kolom AV?',
  'Area Manager mana yang paling tinggi GMV dan quantity?',
  'Bandingkan performa Nur Setyo Aji vs Hakim Abdul Aziz.',
  'SKU apa yang paling besar kontribusinya di MT?',
  'Berapa cancellation rate TikTok Shop (Kayou Card ID)?',
  'Tampilkan top 10 kota dengan GMV terbesar.',
  'Buat chart bubble GMV vs order count by Area Manager.',
  'Download semua order GT milik Riky Marojahan Hasibuan.',
];

function getSimulatedResponse(question: string): ChatMessage {
  const q = question.toLowerCase();
  const id = Date.now().toString();

  if (q.includes('gmv gt') || q.includes('total gmv') && q.includes('gt')) {
    return {
      id,
      role: 'assistant',
      content: '**Total GMV GT bulan April 2026** (berdasarkan kolom AV / SKUGMV sku gmv):\n\n**Rp 107.203.300** (Booked GMV)\n**Rp 104.753.000** (Active GMV)\n\n📊 Filter: Channel = GT, Period = Apr 2026, GMV Source = kolom AV.\n\nGT memiliki 91 orders dari 60 unique customers, dengan AOV Rp 1.178.058.',
      sql: `SELECT\n  SUM(skugmv_sku_gmv) AS booked_gmv,\n  SUM(CASE WHEN normalized_status != 'cancelled' THEN skugmv_sku_gmv ELSE 0 END) AS active_gmv,\n  COUNT(DISTINCT order_key) AS orders\nFROM fact_order_item foi\nJOIN fact_order fo ON foi.order_id = fo.id\nWHERE fo.channel_group = 'GT'\n  AND fo.order_created_at BETWEEN '2026-04-01' AND '2026-04-30';`,
      timestamp: new Date(),
    };
  }

  if (q.includes('area manager') && (q.includes('tinggi') || q.includes('ranking') || q.includes('terbaik'))) {
    return {
      id,
      role: 'assistant',
      content: '**Area Manager dengan GMV tertinggi** (GT, April 2026):\n\n🥇 **Riky Marojahan Hasibuan** — Rp 28.731.200 (26.8% dari GT)\n🥈 **Wahyu Kusuma Nugroho** — Rp 19.468.900 (18.2%)\n🥉 **Nur Setyo Aji** — Rp 15.102.200 (14.1%)\n\nRiky juga memimpin di quantity sold (5.347 unit) meskipun hanya memiliki 8 customers.',
      table: {
        headers: ['Area Manager', 'GMV', 'Orders', 'Qty', 'Customers'],
        rows: [
          ['Riky Marojahan H.', 'Rp 28.731.200', '14', '5.347', '8'],
          ['Wahyu Kusuma N.', 'Rp 19.468.900', '18', '3.168', '14'],
          ['Nur Setyo Aji', 'Rp 15.102.200', '12', '2.371', '11'],
          ['Pungguh Ikhsan P.', 'Rp 13.708.300', '16', '2.618', '8'],
          ['Lamsihar Sitorus', 'Rp 12.667.700', '13', '2.034', '11'],
        ],
      },
      chartSuggestion: 'Lollipop chart — Area Manager GMV Ranking (lihat di GT Performance page)',
      timestamp: new Date(),
    };
  }

  if (q.includes('cancellation') && q.includes('kayou card')) {
    return {
      id,
      role: 'assistant',
      content: '**Cancellation Rate TikTok Shop (Kayou Card ID):**\n\n⚠️ **57.9%** — tertinggi di semua channel!\n\n- Total orders: 121\n- Cancelled: 70 orders\n- Completed: 33 orders\n- Shipped: 18 orders\n\nRefund amount: **Rp 22.100.114**\n\n💡 *Insight:* Cancel rate ini sangat tinggi dibanding TikTok Shop (Kayou ID) (31.1%) dan Shopee (12.8%). Perlu investigasi apakah ini karena stok, buyer behavior, atau operational issue.',
      timestamp: new Date(),
    };
  }

  if (q.includes('sku') && q.includes('mt')) {
    return {
      id,
      role: 'assistant',
      content: '**Top SKU di Modern Trade (April 2026):**\n\nMT sangat didominasi oleh pembelian bulk:\n\n🥇 **NARUTO Earth Scroll** — Rp 272.160.000 (65.8% MT GMV)\n🥈 **MLBB-HOD-1 packSet** — Rp 38.400.000\n🥉 **Free Fire Survival Pack** — Rp 38.400.000\n\n💡 *Insight:* Hanya 3 SKU menyumbang 84.3% dari total MT GMV. NARUTO sendiri mendominasi karena single bulk order dari Agency.',
      timestamp: new Date(),
    };
  }

  // Default response
  return {
    id,
    role: 'assistant',
    content: `Terima kasih atas pertanyaannya. Berdasarkan data omnichannel April 2026:\n\n📊 Total Booked GMV: **Rp 854.698.594**\n📊 Active GMV: **Rp 671.192.934**\n📊 Total Orders: **2.748**\n\nBisa tolong spesifikkan channel, metric, atau dimensi yang ingin Anda analisis? Contoh: "GMV GT by Area Manager" atau "Top SKU di Shopee".\n\n💡 *Tip:* Saya bisa membuat chart, tabel, dan download hasil query ke CSV.`,
    timestamp: new Date(),
  };
}

export default function AIChatbotPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '0',
      role: 'assistant',
      content: 'Halo! 👋 Saya adalah AI Assistant untuk Omnichannel Sales Dashboard.\n\nSaya bisa menjawab pertanyaan tentang data penjualan GT, MT, Shopee, dan TikTok Shop berdasarkan data yang sudah diupload (April 2026).\n\nContoh pertanyaan yang bisa Anda tanyakan:',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (text?: string) => {
    const question = text || input.trim();
    if (!question) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: question,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Simulate AI response delay
    setTimeout(() => {
      const response = getSimulatedResponse(question);
      setMessages((prev) => [...prev, response]);
      setIsTyping(false);
    }, 800 + Math.random() * 1200);
  };

  const handleDownload = (msg: ChatMessage) => {
    if (!msg.table) return;
    downloadCSV(`query-result-${msg.id}`, msg.table.headers, msg.table.rows);
  };

  return (
    <div className="animate-fade-in-up flex h-[calc(100vh-7rem)] flex-col gap-4">
      
      {/* Top: Auto Insights Section */}
      <div className="shrink-0">
        <div className="mb-2 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Auto-Generated Insights</h3>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted-foreground/20">
          {autoInsights.map((insight, i) => (
            <div key={i} className="min-w-[280px] shrink-0 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {insight.severity === 'critical' && <AlertTriangle className="h-4 w-4 text-red-500" />}
                  {insight.severity === 'warning' && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                  {insight.severity === 'info' && <CheckCircle2 className="h-4 w-4 text-blue-500" />}
                  <span className="text-sm font-semibold text-foreground">{insight.title}</span>
                </div>
                <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary">{insight.value}</Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{insight.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Top: Suggested questions */}
      <div className="shrink-0">
        <div className="flex flex-wrap gap-2">
          {suggestedQuestions.slice(0, 4).map((q) => (
            <button
              key={q}
              onClick={() => handleSend(q)}
              className="group flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-all hover:border-primary/30 hover:bg-primary/5 hover:text-foreground"
            >
              <Lightbulb className="h-3 w-3 text-primary opacity-0 transition-opacity group-hover:opacity-100" />
              <span className="max-w-[250px] truncate">{q}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card">
        {/* Messages */}
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'assistant' && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-400">
                  <Bot className="h-4 w-4 text-white" />
                </div>
              )}
              <div
                className={`max-w-[75%] rounded-xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/50'
                }`}
              >
                {/* Message content with simple markdown-like rendering */}
                <div className="space-y-2 text-sm leading-relaxed whitespace-pre-wrap">
                  {msg.content.split('\n').map((line, i) => {
                    // Bold text
                    const parts = line.split(/(\*\*[^*]+\*\*)/g);
                    return (
                      <p key={i}>
                        {parts.map((part, j) =>
                          part.startsWith('**') && part.endsWith('**') ? (
                            <strong key={j} className="font-semibold">{part.slice(2, -2)}</strong>
                          ) : (
                            <span key={j}>{part}</span>
                          )
                        )}
                      </p>
                    );
                  })}
                </div>

                {/* SQL preview */}
                {msg.sql && (
                  <div className="mt-3 rounded-lg bg-background/50 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Generated SQL</span>
                      <button 
                        onClick={() => navigator.clipboard.writeText(msg.sql!)}
                        className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                    <pre className="overflow-x-auto text-[11px] leading-relaxed text-emerald-400">
                      <code>{msg.sql}</code>
                    </pre>
                  </div>
                )}

                {/* Table result */}
                {msg.table && (
                  <div className="mt-3 overflow-x-auto rounded-lg bg-background/50">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border">
                          {msg.table.headers.map((h) => (
                            <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {msg.table.rows.map((row, ri) => (
                          <tr key={ri} className="border-b border-border/50">
                            {row.map((cell, ci) => (
                              <td key={ci} className="px-3 py-1.5 text-foreground">{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Chart suggestion */}
                {msg.chartSuggestion && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                    <BarChart3 className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs text-primary">{msg.chartSuggestion}</span>
                  </div>
                )}

                {/* Action buttons for assistant messages */}
                {msg.role === 'assistant' && msg.id !== '0' && (
                  <div className="mt-3 flex items-center gap-2">
                    <button 
                      onClick={() => navigator.clipboard.writeText(msg.content)}
                      className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <Copy className="h-3 w-3" /> Copy
                    </button>
                    {msg.table && (
                      <button 
                        onClick={() => handleDownload(msg)}
                        className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      >
                        <Download className="h-3 w-3" /> CSV
                      </button>
                    )}
                    <button className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                      <Table2 className="h-3 w-3" /> Table
                    </button>
                  </div>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary">
                  <User className="h-4 w-4 text-foreground" />
                </div>
              )}
            </div>
          ))}

          {/* Suggested questions after welcome message */}
          {messages.length === 1 && (
            <div className="ml-11 flex flex-wrap gap-2">
              {suggestedQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSend(q)}
                  className="rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-400">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="flex items-center gap-1 rounded-xl bg-muted/50 px-4 py-3">
                <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:0ms]" />
                <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:150ms]" />
                <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:300ms]" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input bar */}
        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px]">Apr 2026</Badge>
              <Badge variant="secondary" className="text-[10px]">All Channels</Badge>
              <Badge variant="secondary" className="text-[10px]">Active GMV</Badge>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <div className="relative flex-1">
              <Sparkles className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/50" />
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Tanyakan apa saja tentang data penjualan..."
                className="w-full rounded-lg border border-border bg-muted/30 py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/20"
              />
            </div>
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isTyping}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
