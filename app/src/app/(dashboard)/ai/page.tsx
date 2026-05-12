'use client';

import type { KeyboardEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Bot,
  CheckCircle2,
  Copy,
  Database,
  Download,
  Filter,
  Lightbulb,
  Loader2,
  RotateCcw,
  Send,
  Sparkles,
  Table2,
  User,
  WandSparkles,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { useDashboardData } from '@/lib/dashboard-client';
import { downloadCSV } from '@/lib/download';
import { abbreviateIDR, formatNumber, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sql?: string;
  table?: { headers: string[]; rows: (string | number)[][] };
  chartSuggestion?: string;
  downloadUrl?: string;
  assistantMode?: 'local_semantic' | 'llm_api';
  llmProvider?: string;
  llmModel?: string;
  llmError?: string;
  timestamp: Date;
}

interface InsightCard {
  title: string;
  value: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
}

const promptGroups = [
  {
    id: 'executive',
    label: 'Executive',
    prompts: [
      'Ringkas performa omnichannel dan soroti risiko terbesar saat ini.',
      'Channel mana yang paling berkontribusi terhadap Booked GMV dan Active GMV?',
      'Apa insight utama yang harus saya bawa ke meeting management?',
    ],
  },
  {
    id: 'gt',
    label: 'GT Team',
    prompts: [
      'Bandingkan performa Regional Manager berdasarkan GT GMV.',
      'Area Manager mana yang paling tinggi GMV dan quantity?',
      'Sales/BD mana yang paling besar kontribusinya di GT?',
    ],
  },
  {
    id: 'retention',
    label: 'Retention',
    prompts: [
      'Jelaskan retensi customer per channel dan siapa customer repeat tertinggi.',
      'Channel mana yang paling banyak one-time customer?',
      'Bagaimana pola repeat customer jika filter bulan lebih dari satu?',
    ],
  },
  {
    id: 'geo',
    label: 'Geo Sales',
    prompts: [
      'Tampilkan top kota dengan GMV terbesar dan cancellation value.',
      'Provinsi atau kota mana yang perlu diprioritaskan untuk follow up?',
      'Bandingkan GMV kota berdasarkan channel aktif.',
    ],
  },
  {
    id: 'quality',
    label: 'Quality',
    prompts: [
      'Apakah ada data quality issue yang perlu dicek sebelum reporting?',
      'Jelaskan dampak cancelled order terhadap Active GMV.',
      'Buat link export cleaned dataset untuk filter aktif.',
    ],
  },
] as const;

function createUserMessage(question: string): ChatMessage {
  return {
    id: `user-${Date.now()}`,
    role: 'user',
    content: question,
    timestamp: new Date(),
  };
}

function createAssistantMessageId() {
  return `assistant-${Date.now()}`;
}

function createUnavailableMessage(question: string): ChatMessage {
  return {
    id: createAssistantMessageId(),
    role: 'assistant',
    content: `Saya belum bisa mengambil jawaban live untuk pertanyaan: "${question}". Coba ulangi sebentar lagi, atau gunakan menu dashboard untuk melihat data yang sudah terfilter.`,
    assistantMode: 'local_semantic',
    timestamp: new Date(),
  };
}

function queryToFilters(query: string) {
  return Object.fromEntries(new URLSearchParams(query).entries());
}

function filterChips(query: string) {
  const params = new URLSearchParams(query);
  const chips: string[] = [];

  if (params.get('start') || params.get('end')) {
    chips.push(`${params.get('start') || 'Start'} to ${params.get('end') || 'Now'}`);
  }
  if (params.get('channels')) chips.push(`Channels: ${params.get('channels')}`);
  if (params.get('regionalManager')) chips.push(`RM: ${params.get('regionalManager')}`);
  if (params.get('areaManager')) chips.push(`AM: ${params.get('areaManager')}`);
  if (params.get('province')) chips.push(`Province: ${params.get('province')}`);
  if (params.get('city')) chips.push(`City: ${params.get('city')}`);
  if (params.get('status')) chips.push(`Status: ${params.get('status')}`);

  return chips.length ? chips.slice(0, 5) : ['All available dates', 'All channels'];
}

function insightToneClass(severity: InsightCard['severity']) {
  if (severity === 'critical') return 'border-red-400/25 bg-red-500/10 text-red-200';
  if (severity === 'warning') return 'border-amber-400/25 bg-amber-400/10 text-amber-100';
  return 'border-primary/20 bg-primary/10 text-primary';
}

function insightIcon(severity: InsightCard['severity']) {
  if (severity === 'critical') return <AlertTriangle className="h-4 w-4 text-red-400" />;
  if (severity === 'warning') return <AlertTriangle className="h-4 w-4 text-amber-400" />;
  return <CheckCircle2 className="h-4 w-4 text-primary" />;
}

function AssistantText({ content }: { content: string }) {
  return (
    <div className="space-y-2 whitespace-pre-wrap text-sm leading-6 text-foreground">
      {content.split('\n').map((line, lineIndex) => {
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <p key={`${line}-${lineIndex}`}>
            {parts.map((part, partIndex) =>
              part.startsWith('**') && part.endsWith('**') ? (
                <strong key={`${part}-${partIndex}`} className="font-semibold text-foreground">
                  {part.slice(2, -2)}
                </strong>
              ) : (
                <span key={`${part}-${partIndex}`}>{part}</span>
              ),
            )}
          </p>
        );
      })}
    </div>
  );
}

function ModeBadge({ message }: { message: ChatMessage }) {
  const isLlm = message.assistantMode === 'llm_api';

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <Badge
        variant="secondary"
        className={cn(
          'border text-[10px]',
          isLlm ? 'border-primary/25 bg-primary/10 text-primary' : 'border-border bg-background/50 text-muted-foreground',
        )}
      >
        {isLlm ? 'LLM API' : 'Local semantic'}
      </Badge>
      {message.llmModel && (
        <Badge variant="secondary" className="border border-border bg-background/50 text-[10px] text-muted-foreground">
          {message.llmProvider ?? 'LLM'} - {message.llmModel}
        </Badge>
      )}
      {message.llmError && (
        <Badge variant="secondary" className="border border-amber-400/30 bg-amber-400/10 text-[10px] text-amber-300">
          LLM fallback aktif
        </Badge>
      )}
    </div>
  );
}

export default function AIChatbotPage() {
  const { data, isLoading, error } = useDashboardData();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '0',
      role: 'assistant',
      content:
        'Halo, saya AI Assistant untuk Omnichannel Sales Dashboard. Saya bisa menjawab dari data upload dan filter aktif. Jika API LLM tersedia di env, saya memakai LLM untuk merapikan insight; jika tidak ada, saya memakai semantic fallback lokal.',
      assistantMode: 'local_semantic',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activePromptGroup, setActivePromptGroup] = useState<(typeof promptGroups)[number]['id']>('executive');
  const [filterQuery, setFilterQuery] = useState(() => (typeof window === 'undefined' ? '' : window.location.search.slice(1)));
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const autoInsights = useMemo<InsightCard[]>(() => {
    if (!data) return [];

    const topChannel = [...data.channels].sort((a, b) => b.bookedGMV - a.bookedGMV)[0];
    const highestCancellation = [...data.channels].sort((a, b) => b.cancellationRate - a.cancellationRate)[0];
    const topCity = [...data.locations].sort((a, b) => b.gmv - a.gmv)[0];
    const retention = data.customerRetentionAnalytics.summary;
    const quality = data.dataQuality;

    return [
      topChannel && {
        title: 'Top Channel',
        value: abbreviateIDR(topChannel.bookedGMV),
        description: `${topChannel.channel} leads Booked GMV with ${formatNumber(topChannel.orders)} orders.`,
        severity: 'info' as const,
      },
      retention.uniqueCustomers > 0 && {
        title: 'Repeat Rate',
        value: formatPercent(retention.repeatRate),
        description: `${formatNumber(retention.repeatCustomers)} repeat customers from ${formatNumber(retention.uniqueCustomers)} unique customers.`,
        severity: retention.repeatRate < 10 ? ('warning' as const) : ('info' as const),
      },
      highestCancellation && highestCancellation.cancelledOrders > 0 && {
        title: 'Cancellation Watch',
        value: formatPercent(highestCancellation.cancellationRate),
        description: `${highestCancellation.channel} has ${formatNumber(highestCancellation.cancelledOrders)} cancelled orders.`,
        severity: highestCancellation.cancellationRate >= 25 ? ('critical' as const) : ('warning' as const),
      },
      topCity && {
        title: 'Top Location',
        value: abbreviateIDR(topCity.gmv),
        description: `${topCity.city}, ${topCity.province} leads location GMV in current scope.`,
        severity: 'info' as const,
      },
      quality && quality.criticalIssues > 0 && {
        title: 'Data Quality',
        value: formatNumber(quality.criticalIssues),
        description: 'Critical issues should be reviewed before management reporting.',
        severity: 'critical' as const,
      },
    ].filter(Boolean) as InsightCard[];
  }, [data]);

  const activePrompts = useMemo(
    () => promptGroups.find((group) => group.id === activePromptGroup)?.prompts ?? promptGroups[0].prompts,
    [activePromptGroup],
  );

  const filterBadges = useMemo(() => filterChips(filterQuery), [filterQuery]);

  useEffect(() => {
    const syncQuery = (event?: Event) => {
      const query =
        event instanceof CustomEvent && typeof event.detail?.query === 'string'
          ? event.detail.query
          : window.location.search.slice(1);
      setFilterQuery(query);
    };

    window.addEventListener('popstate', syncQuery);
    window.addEventListener('dashboard-filter-change', syncQuery);

    return () => {
      window.removeEventListener('popstate', syncQuery);
      window.removeEventListener('dashboard-filter-change', syncQuery);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async (text?: string) => {
    const question = text || input.trim();
    if (!question || isTyping) return;

    setMessages((prev) => [...prev, createUserMessage(question)]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question, filters: queryToFilters(filterQuery) }),
      });
      const payload = await response.json();
      if (!payload.ok) throw new Error(payload.error?.message ?? 'AI query failed');

      setMessages((prev) => [
        ...prev,
        {
          id: createAssistantMessageId(),
          role: 'assistant',
          content: payload.data.answer,
          sql: payload.data.generatedSql,
          table: payload.data.table ?? undefined,
          chartSuggestion: payload.data.chartSuggestion
            ? `${payload.data.chartSuggestion.type} chart - ${payload.data.chartSuggestion.dimension} / ${payload.data.chartSuggestion.metric}`
            : undefined,
          downloadUrl: payload.data.downloadUrl ?? undefined,
          assistantMode: payload.data.assistantMode,
          llmProvider: payload.data.llmProvider,
          llmModel: payload.data.llmModel,
          llmError: payload.data.llmError,
          timestamp: new Date(),
        },
      ]);
    } catch {
      setMessages((prev) => [...prev, createUnavailableMessage(question)]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey) return;
    event.preventDefault();
    void handleSend();
  };

  const handleDownload = (msg: ChatMessage) => {
    if (!msg.table) return;
    downloadCSV(`query-result-${msg.id}`, msg.table.headers, msg.table.rows);
  };

  const resetConversation = () => {
    setMessages([
      {
        id: '0',
        role: 'assistant',
        content:
          'Percakapan sudah dibersihkan. Silakan tanyakan performa channel, GT team, retensi customer, geo sales, data quality, atau export cleaned dataset.',
        assistantMode: 'local_semantic',
        timestamp: new Date(),
      },
    ]);
  };

  return (
    <div className="animate-fade-in-up grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
      <aside className="space-y-4 xl:sticky xl:top-4 xl:max-h-[calc(100vh-9rem)] xl:overflow-y-auto">
        <section className="rounded-[8px] border border-border bg-card p-4 shadow-sm shadow-black/10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-primary/20 bg-primary/10 text-primary">
                  <WandSparkles className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">AI Insight Center</h2>
                  <p className="text-xs text-muted-foreground">Hybrid analytics assistant</p>
                </div>
              </div>
            </div>
            <Badge variant="secondary" className="border border-border bg-background/40 text-[10px] text-muted-foreground">
              {isLoading ? 'Syncing' : 'Live'}
            </Badge>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-[8px] border border-border bg-background/35 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Booked GMV</p>
              <p className="mt-1 text-sm font-bold text-foreground">{data ? abbreviateIDR(data.summary.bookedGMV) : '-'}</p>
            </div>
            <div className="rounded-[8px] border border-border bg-background/35 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Active GMV</p>
              <p className="mt-1 text-sm font-bold text-foreground">{data ? abbreviateIDR(data.summary.activeGMV) : '-'}</p>
            </div>
            <div className="rounded-[8px] border border-border bg-background/35 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Orders</p>
              <p className="mt-1 text-sm font-bold text-foreground">{data ? formatNumber(data.summary.orders) : '-'}</p>
            </div>
            <div className="rounded-[8px] border border-border bg-background/35 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Customers</p>
              <p className="mt-1 text-sm font-bold text-foreground">{data ? formatNumber(data.summary.customers) : '-'}</p>
            </div>
          </div>

          {error && (
            <div className="mt-3 rounded-[8px] border border-red-400/25 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              {error}
            </div>
          )}
        </section>

        <section className="rounded-[8px] border border-border bg-card p-4 shadow-sm shadow-black/10">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">Auto Insights</h3>
          </div>
          <div className="space-y-2">
            {autoInsights.map((insight) => (
              <div key={insight.title} className={cn('rounded-[8px] border p-3', insightToneClass(insight.severity))}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    {insightIcon(insight.severity)}
                    <span className="truncate text-sm font-semibold">{insight.title}</span>
                  </div>
                  <span className="shrink-0 text-xs font-bold">{insight.value}</span>
                </div>
                <p className="mt-2 text-xs leading-5 opacity-80">{insight.description}</p>
              </div>
            ))}
            {!autoInsights.length && (
              <div className="rounded-[8px] border border-dashed border-border bg-background/30 p-3 text-xs leading-5 text-muted-foreground">
                Upload data atau ubah filter untuk menghasilkan insight otomatis.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-[8px] border border-border bg-card p-4 shadow-sm shadow-black/10">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-primary" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">Current Scope</h3>
            </div>
            <Badge variant="secondary" className="border border-border bg-background/40 text-[10px] text-muted-foreground">
              {filterQuery ? 'Filtered' : 'All data'}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            {filterBadges.map((chip) => (
              <span key={chip} className="max-w-full truncate rounded-[8px] border border-border bg-muted/25 px-2.5 py-1 text-[11px] text-muted-foreground">
                {chip}
              </span>
            ))}
          </div>
        </section>

        <section className="rounded-[8px] border border-border bg-card p-4 shadow-sm shadow-black/10">
          <div className="mb-3 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">Prompt Studio</h3>
          </div>
          <div className="mb-3 flex gap-1 overflow-x-auto pb-1">
            {promptGroups.map((group) => (
              <button
                key={group.id}
                type="button"
                onClick={() => setActivePromptGroup(group.id)}
                className={cn(
                  'shrink-0 rounded-[8px] border px-2.5 py-1.5 text-[11px] font-semibold transition',
                  activePromptGroup === group.id
                    ? 'border-primary/35 bg-primary/10 text-primary'
                    : 'border-border bg-background/30 text-muted-foreground hover:text-foreground',
                )}
              >
                {group.label}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            {activePrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => handleSend(prompt)}
                disabled={isTyping}
                className="w-full rounded-[8px] border border-border bg-background/35 px-3 py-2 text-left text-xs leading-5 text-muted-foreground transition hover:border-primary/35 hover:bg-primary/5 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>
        </section>
      </aside>

      <section className="flex min-h-[680px] flex-col overflow-hidden rounded-[8px] border border-border bg-card shadow-sm shadow-black/10 xl:h-[calc(100vh-9rem)]">
        <div className="border-b border-border bg-background/25 px-4 py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] border border-primary/20 bg-primary/10 text-primary">
                <Bot className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-sm font-semibold text-foreground">Business Analytics Chat</h1>
                <p className="truncate text-xs text-muted-foreground">Ask anything about GMV, GT team, retention, geo sales, SKU, cancellation, and exports.</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="border border-primary/20 bg-primary/10 text-[10px] text-primary">
                Hybrid AI
              </Badge>
              <Badge variant="secondary" className="border border-border bg-background/40 text-[10px] text-muted-foreground">
                Live Data
              </Badge>
              <button
                type="button"
                onClick={resetConversation}
                className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-border bg-background/35 px-3 text-xs font-medium text-muted-foreground transition hover:bg-muted/40 hover:text-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          {messages.map((msg) => (
            <div key={msg.id} className={cn('flex gap-3', msg.role === 'user' && 'justify-end')}>
              {msg.role === 'assistant' && (
                <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-gradient-to-br from-cyan-500 to-indigo-500 text-white shadow-sm shadow-primary/20">
                  <Bot className="h-4 w-4" />
                </div>
              )}

              <div
                className={cn(
                  'min-w-0 rounded-[8px] border px-4 py-3 shadow-sm',
                  msg.role === 'user'
                    ? 'max-w-[88%] border-primary/25 bg-primary text-primary-foreground sm:max-w-[72%]'
                    : 'max-w-[96%] border-border bg-muted/35 sm:max-w-[86%]',
                )}
              >
                <AssistantText content={msg.content} />

                {msg.sql && (
                  <div className="mt-3 rounded-[8px] border border-border bg-background/50 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <Database className="h-3 w-3" />
                        Semantic Trace
                      </span>
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(msg.sql!)}
                        className="rounded-[6px] p-1 text-muted-foreground transition hover:bg-accent hover:text-foreground"
                        aria-label="Copy semantic trace"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                    <pre className="max-h-24 overflow-x-auto text-[11px] leading-relaxed text-emerald-300">
                      <code>{msg.sql}</code>
                    </pre>
                  </div>
                )}

                {msg.table && (
                  <div className="mt-3 overflow-hidden rounded-[8px] border border-border bg-background/50">
                    <div className="flex items-center justify-between border-b border-border px-3 py-2">
                      <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <Table2 className="h-3 w-3" />
                        Result Table
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDownload(msg)}
                        className="inline-flex items-center gap-1 rounded-[6px] px-2 py-1 text-[10px] text-muted-foreground transition hover:bg-accent hover:text-foreground"
                      >
                        <Download className="h-3 w-3" />
                        CSV
                      </button>
                    </div>
                    <div className="max-h-72 overflow-auto">
                      <table className="w-full min-w-[560px] text-xs">
                        <thead className="sticky top-0 bg-background">
                          <tr className="border-b border-border">
                            {msg.table.headers.map((header) => (
                              <th key={header} className="px-3 py-2 text-left font-semibold text-muted-foreground">
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {msg.table.rows.map((row, rowIndex) => (
                            <tr key={`${msg.id}-${rowIndex}`} className="border-b border-border/50 last:border-0">
                              {row.map((cell, cellIndex) => (
                                <td key={`${msg.id}-${rowIndex}-${cellIndex}`} className="px-3 py-2 text-foreground">
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {msg.chartSuggestion && (
                  <div className="mt-3 flex items-center gap-2 rounded-[8px] border border-primary/20 bg-primary/5 px-3 py-2 text-primary">
                    <BarChart3 className="h-3.5 w-3.5" />
                    <span className="text-xs">{msg.chartSuggestion}</span>
                  </div>
                )}

                {msg.downloadUrl && (
                  <a href={msg.downloadUrl} className="mt-3 inline-flex items-center gap-2 rounded-[8px] border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary">
                    <Download className="h-3.5 w-3.5" />
                    Download cleaned dataset
                  </a>
                )}

                {msg.role === 'assistant' && msg.id !== '0' && <ModeBadge message={msg} />}

                {msg.role === 'assistant' && msg.id !== '0' && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/70 pt-3">
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(msg.content)}
                      className="inline-flex items-center gap-1 rounded-[6px] px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <Copy className="h-3 w-3" /> Copy answer
                    </button>
                    {msg.table && (
                      <button
                        type="button"
                        onClick={() => handleDownload(msg)}
                        className="inline-flex items-center gap-1 rounded-[6px] px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      >
                        <Download className="h-3 w-3" /> Export table
                      </button>
                    )}
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border border-border bg-secondary text-foreground">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-gradient-to-br from-cyan-500 to-indigo-500 text-white">
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-3 rounded-[8px] border border-border bg-muted/35 px-4 py-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Analyzing dashboard data...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-border bg-background/25 p-3 sm:p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="border border-border bg-background/40 text-[10px] text-muted-foreground">
              Current filter
            </Badge>
            {filterBadges.slice(0, 3).map((chip) => (
              <span key={chip} className="max-w-[220px] truncate rounded-[8px] border border-border bg-muted/25 px-2.5 py-1 text-[10px] text-muted-foreground">
                {chip}
              </span>
            ))}
          </div>
          <div className="flex items-end gap-2">
            <div className="relative flex-1">
              <Sparkles className="absolute left-3 top-3 h-4 w-4 text-primary/60" />
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="Tanyakan: bandingkan Regional Manager, jelaskan retensi customer, top kota GMV, SKU terbesar, cancellation TikTok, atau export cleaned dataset..."
                rows={2}
                className="max-h-32 min-h-12 w-full resize-none rounded-[8px] border border-border bg-card py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/10"
              />
            </div>
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={!input.trim() || isTyping}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[8px] bg-primary text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Send question"
            >
              {isTyping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">Enter untuk kirim, Shift + Enter untuk baris baru.</p>
        </div>
      </section>
    </div>
  );
}
