import { motion } from "framer-motion";
import {
  Download,
  Eraser,
  MessageSquare,
  Send,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchModels, loadLLMConfig } from "../lib/provider";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  ts?: string;
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
  { group: "Browse", pills: ["Show me trippy presets", "Which presets have good bass response?", "Find presets by Geiss"] },
  { group: "Technical", pills: ["What makes a good warp shader?", "Explain wave modes in MilkDrop", "How do comp equations work?"] },
  { group: "Mix", pills: ["Best presets for electronic music", "Suggest a preset slideshow for a DJ set", "Which presets work well with slow BPM?"] },
];

function buildSystemPrompt(skillContent: string, personalityId: string, personalityPrompt: string, customPrompt: string): string {
  if (personalityId === "custom") return customPrompt || skillContent;
  return `${skillContent}\n\n---\n\n## Role\n${personalityPrompt}`;
}

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [personalityId, setPersonalityId] = useState(() => localStorage.getItem(PERSONALITY_KEY) || "research-assistant");
  const [customPrompt, setCustomPrompt] = useState("");
  const [skillContent, setSkillContent] = useState("");
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [providerStatus, setProviderStatus] = useState<"detecting" | "detected" | "not_found">("detecting");
  const [providerName, setProviderName] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const personalityPrompt = PERSONALITIES[personalityId] ?? PERSONALITIES["research-assistant"];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-MAX_HISTORY)));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem(PERSONALITY_KEY, personalityId);
  }, [personalityId]);

  useEffect(() => {
    const saved = loadLLMConfig();
    if (!saved.provider) {
      setProviderStatus("not_found");
      return;
    }
    setProviderStatus("detecting");
    const port = saved.provider === "Ollama" ? 11434 : saved.provider === "LM Studio" ? 1234 : 8000;
    const base = `http://127.0.0.1:${port}`;
    setBaseUrl(base);
    setProviderName(saved.provider);
    setModel(saved.model);

    fetchModels(saved.provider, base).then((ms) => {
      if (ms.length > 0) {
        setProviderStatus("detected");
        if (!saved.model || !ms.includes(saved.model)) {
          setModel(ms[0]);
        }
      } else {
        setProviderStatus("not_found");
      }
    });
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/skills");
        if (r.ok) {
          const data = await r.json();
          if (data.skills?.length > 0) {
            setSkillContent(data.skills[0].content || "Butterchurn MCP server for MilkDrop visualization. Available tools: get_bpm, set_bpm, list_presets, load_preset, list_visualizers.");
          }
        }
      } catch {}
      if (!skillContent) {
        setSkillContent("Butterchurn MCP server for MilkDrop visualization. Available tools: get_bpm, set_bpm, list_presets, load_preset, list_visualizers.");
      }
    })();
  }, []);

  const systemPrompt = useMemo(
    () => buildSystemPrompt(skillContent, personalityId, personalityPrompt, customPrompt),
    [skillContent, personalityId, personalityPrompt, customPrompt],
  );

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading || providerStatus !== "detected") return;
    setInput("");

    const userMsg: ChatMessage = { role: "user", content: text, ts: new Date().toISOString() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setLoading(true);

    try {
      const chatBody = {
        model,
        messages: [
          { role: "system", content: systemPrompt },
          ...updated.map((m) => ({ role: m.role, content: m.content })),
        ],
        stream: false,
      };

      const r = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(chatBody),
      });

      if (!r.ok) {
        const errText = await r.text().catch(() => "Unknown error");
        setMessages((prev) => [...prev, { role: "assistant", content: `Error: HTTP ${r.status} — ${errText}`, ts: new Date().toISOString() }]);
        return;
      }

      const data = await r.json();
      const reply = data.choices?.[0]?.message?.content || "No response";
      setMessages((prev) => [...prev, { role: "assistant", content: reply, ts: new Date().toISOString() }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${err instanceof Error ? err.message : "Network error"}`, ts: new Date().toISOString() }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, providerStatus, messages, systemPrompt, model, baseUrl]);

  const clearChat = useCallback(() => {
    setMessages([]);
    localStorage.removeItem(HISTORY_KEY);
  }, []);

  const exportChat = useCallback(() => {
    if (messages.length === 0) return;
    const text = messages
      .map((m) => `[${m.ts ?? "no-date"}] ${m.role === "user" ? "You" : "Assistant"}: ${m.content}`)
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
    <div className="h-full flex flex-col overflow-hidden" data-testid="chat-page">
      <div className="shrink-0 flex items-center justify-between gap-2 px-4 py-2 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center gap-2">
          <MessageSquare size={16} className="text-amber-400" />
          <span className="text-sm font-medium text-zinc-200">Chat</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
            providerStatus === "detected" ? "bg-emerald-900/30 text-emerald-300" : "bg-zinc-800 text-zinc-500"
          }`}>
            {providerStatus === "detecting" ? "Detecting…" : providerStatus === "detected" ? `${providerName} :${model}` : "No LLM"}
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
            onClick={exportChat}
            disabled={messages.length === 0}
            className="p-1.5 rounded text-zinc-500 hover:text-zinc-300 disabled:opacity-30 transition-colors"
            title="Export chat"
            data-testid="chat-export"
          >
            <Download size={14} />
          </button>
          <button
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

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" data-testid="chat-messages">
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
            <Sparkles size={32} className="mb-3 opacity-40" />
            <p className="text-sm mb-4">Ask about presets, visual techniques, or mixing</p>
            <div className="w-full max-w-lg space-y-2">
              {SUGGESTIONS.map((group) => (
                <div key={group.group}>
                  <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1.5">{group.group}</p>
                  <div className="flex flex-wrap gap-1.5" data-testid="example-prompts">
                    {group.pills.map((pill) => (
                      <button
                        key={pill}
                        onClick={() => { setInput(pill); inputRef.current?.focus(); }}
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
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[75%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-amber-600/20 text-zinc-100 border border-amber-700/30"
                  : "bg-zinc-800 text-zinc-200 border border-zinc-700"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-400">
              Thinking…
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="shrink-0 border-t border-zinc-800 bg-zinc-900/50 px-4 py-3">
        <div className="flex items-end gap-2 max-w-3xl mx-auto">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
            }}
            placeholder={
              providerStatus === "detected" ? "Ask about visualizers…" : "No LLM provider detected — check Settings"
            }
            disabled={providerStatus !== "detected"}
            rows={1}
            className="flex-1 resize-none rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
            data-testid="chat-input"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading || providerStatus !== "detected"}
            className="h-9 w-9 flex items-center justify-center rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-40 transition-colors"
            data-testid="chat-send"
          >
            <Send size={14} className="text-white" />
          </button>
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
