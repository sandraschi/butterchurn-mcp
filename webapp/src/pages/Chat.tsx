import {
  Check,
  Copy,
  Download,
  Eraser,
  MessageSquare,
  Send,
  Sparkles,
  Square,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Link } from "react-router-dom";
import {
  fetchLlmSettings,
  fetchModels,
  loadSelection,
  streamChat,
  subscribeSelection,
} from "../lib/llm";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  ts?: string;
}

let msgSeq = 0;

function nextMsgId(): string {
  msgSeq += 1;
  return `m${Date.now().toString(36)}-${msgSeq}`;
}

function withIds(list: Array<Omit<ChatMessage, "id">>): ChatMessage[] {
  return list.map((m) => ({ ...m, id: nextMsgId() }));
}

const HISTORY_KEY = "butterchurn:chat";
const PERSONALITY_KEY = "butterchurn:personality";
const MAX_HISTORY = 100;

const PERSONALITIES: Record<string, string> = {
  "research-assistant":
    "You are a research assistant for MilkDrop visualizations. Provide concise, informative answers with references to preset names and visual techniques. Use clear bullet points when listing things.",
  "expert-reviewer":
    "You are an expert visualizer critic. Analyze presets critically, discuss technical aspects (warp shaders, comp equations, wave modes), and suggest improvements. Be honest about weak presets.",
  "quick-summarizer":
    "You are a quick summarizer. Give the shortest possible answer — one sentence or a brief list. No explanations unless asked.",
  custom: "",
};

const SUGGESTIONS = [
  {
    group: "Browse",
    pills: [
      "Show me trippy presets",
      "Which presets have good bass response?",
      "Find presets by Geiss",
    ],
  },
  {
    group: "Technical",
    pills: [
      "What makes a good warp shader?",
      "Explain wave modes in MilkDrop",
      "How do comp equations work?",
    ],
  },
  {
    group: "Mix",
    pills: [
      "Best presets for electronic music",
      "Suggest a preset slideshow for a DJ set",
      "Which presets work well with slow BPM?",
    ],
  },
];

function buildSystemPrompt(
  skillContent: string,
  personalityId: string,
  personalityPrompt: string,
  customPrompt: string,
): string {
  if (personalityId === "custom") return customPrompt || skillContent;
  return `${skillContent}\n\n---\n\n## Role\n${personalityPrompt}`;
}

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? withIds(parsed) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [personalityId, setPersonalityId] = useState(
    () => localStorage.getItem(PERSONALITY_KEY) || "research-assistant",
  );
  const [customPrompt, setCustomPrompt] = useState("");
  const [skillContent, setSkillContent] = useState("");
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [providerStatus, setProviderStatus] = useState<
    "detecting" | "detected" | "not_found"
  >("detecting");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const copyTimerRef = useRef<number | null>(null);

  const personalityPrompt =
    PERSONALITIES[personalityId] ?? PERSONALITIES["research-assistant"];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  });

  useEffect(() => {
    localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify(messages.slice(-MAX_HISTORY)),
    );
  }, [messages]);

  useEffect(() => {
    localStorage.setItem(PERSONALITY_KEY, personalityId);
  }, [personalityId]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
    };
  }, []);

  // Backend-first selection: backend truth on mount/focus, live-sync across tabs.
  useEffect(() => {
    let cancelled = false;
    const resolve = async () => {
      // Fast mirror first so the header paints instantly.
      const mirror = loadSelection();
      if (!cancelled && mirror.provider) {
        setProvider(mirror.provider);
        setModel(mirror.model);
      }
      try {
        const s = await fetchLlmSettings();
        if (cancelled) return;
        const p = s.provider ?? "";
        const m = s.model ?? "";
        setProvider(p);
        setModel(m);
        if (!p || !m) {
          setProviderStatus("not_found");
          return;
        }
        // Confirm the saved model is still live (not evicted/uninstalled).
        try {
          const live = await fetchModels(p);
          setProviderStatus(live.models.includes(m) ? "detected" : "not_found");
        } catch {
          // Backend reachable and selection non-empty: allow send; the
          // send-time guard re-checks and surfaces the real error.
          setProviderStatus("detected");
        }
      } catch {
        if (cancelled) return;
        setProviderStatus(
          mirror.provider && mirror.model ? "detected" : "not_found",
        );
      }
    };
    void resolve();
    const onFocus = () => void resolve();
    const unsub = subscribeSelection((sel) => {
      setProvider(sel.provider);
      setModel(sel.model);
      setProviderStatus(sel.provider && sel.model ? "detected" : "not_found");
    });
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      unsub();
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/skills");
        if (r.ok) {
          const data = await r.json();
          if (data.skills?.length > 0) {
            setSkillContent(
              data.skills[0].content ||
                "Butterchurn MCP server for MilkDrop visualization. Available tools: get_bpm, set_bpm, list_presets, load_preset, list_visualizers.",
            );
          }
        }
      } catch {}
      if (!skillContent) {
        setSkillContent(
          "Butterchurn MCP server for MilkDrop visualization. Available tools: get_bpm, set_bpm, list_presets, load_preset, list_visualizers.",
        );
      }
    })();
  }, [skillContent]);

  const systemPrompt = useMemo(
    () =>
      buildSystemPrompt(
        skillContent,
        personalityId,
        personalityPrompt,
        customPrompt,
      ),
    [skillContent, personalityId, personalityPrompt, customPrompt],
  );

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const copyMessage = useCallback((idx: number, text: string) => {
    const done = () => {
      setCopiedIdx(idx);
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = window.setTimeout(() => setCopiedIdx(null), 1500);
    };
    try {
      const p = navigator.clipboard?.writeText(text);
      if (p) {
        void p.then(done).catch(() => {});
        return;
      }
    } catch {}
    // Clipboard API unavailable (permissions): fall back to a temp textarea.
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      done();
    } catch {}
  }, []);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    // Send-time guard: re-read the live selection, refuse when empty.
    // No fallback model, ever.
    let live = { provider, model };
    try {
      const s = await fetchLlmSettings();
      live = { provider: s.provider ?? "", model: s.model ?? "" };
      setProvider(live.provider);
      setModel(live.model);
    } catch {
      live = loadSelection();
    }
    if (!live.provider || !live.model) {
      setMessages((prev) => [
        ...prev,
        {
          id: nextMsgId(),
          role: "user",
          content: text,
          ts: new Date().toISOString(),
        },
        {
          id: nextMsgId(),
          role: "assistant",
          content: "No LLM selected — pick one in Settings first.",
          ts: new Date().toISOString(),
        },
      ]);
      setInput("");
      return;
    }
    setProviderStatus("detected");
    setInput("");

    const userMsg: ChatMessage = {
      id: nextMsgId(),
      role: "user",
      content: text,
      ts: new Date().toISOString(),
    };
    const context = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));
    setMessages((prev) => [
      ...prev,
      userMsg,
      {
        id: nextMsgId(),
        role: "assistant",
        content: "",
        ts: new Date().toISOString(),
      },
    ]);
    setLoading(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    let acc = "";
    try {
      await streamChat(
        live.provider,
        live.model,
        [{ role: "system", content: systemPrompt }, ...context],
        (token) => {
          acc += token;
          const snapshot = acc;
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = {
              ...next[next.length - 1],
              content: snapshot,
            };
            return next;
          });
        },
        ctrl.signal,
      );
      if (!acc) {
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            ...next[next.length - 1],
            content: "(no response)",
          };
          return next;
        });
      }
    } catch (err) {
      const aborted = err instanceof DOMException && err.name === "AbortError";
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (acc) {
          next[next.length - 1] = {
            ...last,
            content: aborted ? `${acc}\n\n*(stopped)*` : acc,
          };
        } else {
          next[next.length - 1] = {
            ...last,
            content: aborted
              ? "(stopped)"
              : `Error: ${err instanceof Error ? err.message : "Network error"}`,
          };
        }
        return next;
      });
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [input, loading, messages, systemPrompt, provider, model]);

  const clearChat = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    localStorage.removeItem(HISTORY_KEY);
  }, []);

  const exportChat = useCallback(() => {
    if (messages.length === 0) return;
    const text = messages
      .map(
        (m) =>
          `[${m.ts ?? "no-date"}] ${m.role === "user" ? "You" : "Assistant"}: ${m.content}`,
      )
      .join("\n\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `butterchurn-chat-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [messages]);

  return (
    <div
      className="h-full flex flex-col overflow-hidden"
      data-testid="chat-page"
    >
      <div className="shrink-0 flex items-center justify-between gap-2 px-4 py-2 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center gap-2">
          <MessageSquare size={16} className="text-amber-400" />
          <span className="text-sm font-medium text-zinc-200">Chat</span>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded ${
              providerStatus === "detected"
                ? "bg-emerald-900/30 text-emerald-300"
                : "bg-zinc-800 text-zinc-500"
            }`}
          >
            {providerStatus === "detecting"
              ? "Detecting…"
              : providerStatus === "detected"
                ? `${provider} :${model}`
                : "No LLM"}
          </span>
        </div>
        <div className="flex items-center gap-1.5" data-testid="chat-controls">
          <select
            value={personalityId}
            onChange={(e) => setPersonalityId(e.target.value)}
            className="h-7 rounded border border-zinc-700 bg-zinc-800 px-2 text-[11px] text-zinc-300"
            data-testid="personality-select"
          >
            <option value="research-assistant">Research Assistant</option>
            <option value="expert-reviewer">Expert Reviewer</option>
            <option value="quick-summarizer">Quick Summarizer</option>
            <option value="custom">Custom</option>
          </select>
          <button
            type="button"
            onClick={exportChat}
            disabled={messages.length === 0}
            className="p-1.5 rounded text-zinc-500 hover:text-zinc-300 disabled:opacity-30 transition-colors"
            title="Export chat"
            data-testid="chat-export"
          >
            <Download size={14} />
          </button>
          <button
            type="button"
            onClick={clearChat}
            disabled={messages.length === 0}
            className="p-1.5 rounded text-zinc-500 hover:text-zinc-300 disabled:opacity-30 transition-colors"
            title="Clear chat"
            data-testid="chat-clear"
          >
            <Eraser size={14} />
          </button>
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
        data-testid="chat-messages"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
            <Sparkles size={32} className="mb-3 opacity-40" />
            {providerStatus === "not_found" ? (
              <p className="text-sm mb-4">
                No LLM selected —{" "}
                <Link to="/settings" className="underline text-amber-300">
                  pick one in Settings
                </Link>
              </p>
            ) : (
              <p className="text-sm mb-4">
                Ask about presets, visual techniques, or mixing
              </p>
            )}
            <div className="w-full max-w-lg space-y-2">
              {SUGGESTIONS.map((group) => (
                <div key={group.group}>
                  <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1.5">
                    {group.group}
                  </p>
                  <div
                    className="flex flex-wrap gap-1.5"
                    data-testid="example-prompts"
                  >
                    {group.pills.map((pill) => (
                      <button
                        key={pill}
                        type="button"
                        onClick={() => {
                          setInput(pill);
                          inputRef.current?.focus();
                        }}
                        className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 transition-colors"
                      >
                        {pill}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "user" ? (
              <div className="max-w-[75%] rounded-xl px-4 py-2.5 text-sm leading-relaxed bg-amber-600/20 text-zinc-100 border border-amber-700/30">
                {msg.content}
              </div>
            ) : (
              <div className="max-w-[75%] rounded-xl px-4 py-2.5 bg-zinc-800 text-zinc-200 border border-zinc-700">
                {msg.content ? (
                  <div className="chat-md">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <span className="text-sm text-zinc-400 animate-pulse">
                    Thinking…
                  </span>
                )}
                {msg.content && (
                  <button
                    type="button"
                    onClick={() => copyMessage(i, msg.content)}
                    className="mt-1.5 flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
                    title="Copy reply"
                  >
                    {copiedIdx === i ? <Check size={12} /> : <Copy size={12} />}
                    {copiedIdx === i ? "Copied" : "Copy"}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="shrink-0 border-t border-zinc-800 bg-zinc-900/50 px-4 py-3">
        <div className="flex items-end gap-2 max-w-3xl mx-auto">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder={
              providerStatus === "detected"
                ? "Ask about visualizers…"
                : "No LLM provider detected — check Settings"
            }
            rows={1}
            className="flex-1 resize-none rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
            data-testid="chat-input"
          />
          {loading ? (
            <button
              type="button"
              onClick={stopStreaming}
              className="h-9 w-9 flex items-center justify-center rounded-lg bg-zinc-700 hover:bg-zinc-600 transition-colors"
              title="Stop generating"
              data-testid="chat-stop"
            >
              <Square size={14} className="text-white" />
            </button>
          ) : (
            <button
              type="button"
              onClick={sendMessage}
              disabled={!input.trim()}
              className="h-9 w-9 flex items-center justify-center rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-40 transition-colors"
              data-testid="chat-send"
            >
              <Send size={14} className="text-white" />
            </button>
          )}
        </div>
      </div>

      {personalityId === "custom" && (
        <div className="shrink-0 border-t border-zinc-800 bg-zinc-900/50 px-4 py-2">
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Write your custom system prompt…"
            rows={2}
            className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-500"
          />
        </div>
      )}
    </div>
  );
}
