import { Link } from "react-router-dom";
import {
  deleteLlmKey,
  installStatus,
  type ProviderInfo,
  saveLlmSettings,
  startInstall,
  testProvider,
} from "../lib/llm";

type Props = {
  providers: ProviderInfo[];
  probing: boolean;
  selected: string;
  /** Called after any mutation (key save/clear, install, test-refresh). */
  onChanged: (providerId: string) => Promise<void> | void;
  /** Set a provider as the active editor selection (never auto-picks a model). */
  onUse: (providerId: string) => void;
};

import { useState } from "react";

function statusDot(p: ProviderInfo, probing: boolean) {
  if (p.kind === "local") {
    if (probing)
      return (
        <span className="w-2 h-2 rounded-full bg-zinc-500 animate-pulse" />
      );
    return p.detected ? (
      <span className="w-2 h-2 rounded-full bg-emerald-500" />
    ) : (
      <span className="w-2 h-2 rounded-full bg-zinc-600" />
    );
  }
  return p.configured ? (
    <span className="w-2 h-2 rounded-full bg-emerald-500" />
  ) : (
    <span className="w-2 h-2 rounded-full bg-amber-500" />
  );
}

function statusText(p: ProviderInfo, probing: boolean): string {
  if (p.kind === "local") {
    if (probing) return "Probing…";
    return p.detected
      ? `Detected · ${p.models?.length ?? 0} models`
      : "Not found";
  }
  return p.configured ? "Key configured" : "Missing key";
}

/**
 * Fleet provider cards (local free vs cloud paid, status dots, key entry,
 * Test, one-click Ollama install). Butterchurn-styled twin of the template
 * LlmProviderCards — same behavior, no shadcn dependency.
 */
export function LlmProviderCards({
  providers,
  probing,
  selected,
  onChanged,
  onUse,
}: Props) {
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [cardMsg, setCardMsg] = useState<Record<string, string>>({});
  const [installing, setInstalling] = useState(false);
  const [installMsg, setInstallMsg] = useState<string | null>(null);

  const localProviders = providers.filter((p) => p.kind === "local");
  const cloudProviders = providers.filter((p) => p.kind === "cloud");

  async function saveKey(id: string) {
    const key = keyInputs[id]?.trim();
    if (!key) return;
    setCardMsg((m) => ({ ...m, [id]: "Saving…" }));
    try {
      // No-auto-pick: saving a key must not select a model (select:false
      // keeps the active pair untouched).
      await saveLlmSettings({
        provider: id,
        model: "",
        api_key: key,
        select: false,
      });
      setKeyInputs((k) => ({ ...k, [id]: "" }));
      await onChanged(id);
      setCardMsg((m) => ({ ...m, [id]: "Key saved." }));
    } catch (e) {
      setCardMsg((m) => ({
        ...m,
        [id]: e instanceof Error ? e.message : String(e),
      }));
    }
  }

  async function clearKey(id: string) {
    setCardMsg((m) => ({ ...m, [id]: "Clearing…" }));
    try {
      await deleteLlmKey(id);
      await onChanged(id);
      setCardMsg((m) => ({ ...m, [id]: "Key cleared." }));
    } catch (e) {
      setCardMsg((m) => ({
        ...m,
        [id]: e instanceof Error ? e.message : String(e),
      }));
    }
  }

  async function runCardTest(id: string) {
    setCardMsg((m) => ({ ...m, [id]: "Testing…" }));
    try {
      // Offer the card's typed key (if any): testing without it reports
      // curated names as success while status stays unkeyed.
      const typed = keyInputs[id]?.trim() || undefined;
      const t = await testProvider(id, typed);
      if (t.ok) {
        setCardMsg((m2) => ({
          ...m2,
          [id]: `Live — ${t.models.length} model(s).${typed ? " Save key to keep it." : ""}`,
        }));
      } else {
        setCardMsg((m2) => ({
          ...m2,
          [id]: t.note || t.error || "Not reachable — check the endpoint.",
        }));
      }
    } catch (e) {
      setCardMsg((m) => ({
        ...m,
        [id]: e instanceof Error ? e.message : String(e),
      }));
    }
  }

  async function installOllama() {
    setInstalling(true);
    setInstallMsg("Starting winget install…");
    try {
      await startInstall("ollama");
      for (let i = 0; i < 120; i++) {
        await new Promise((r) => setTimeout(r, 5000));
        const st = await installStatus("ollama");
        if (st.state === "done") {
          setInstallMsg("Installed. Re-probing…");
          await onChanged("ollama");
          setInstallMsg(
            "Ollama installed and detected. Pull a model: ollama pull gemma4:12b",
          );
          break;
        }
        if (st.state === "error") {
          setInstallMsg(
            `Install failed: ${(st.output ?? "").slice(-300) || "see backend logs"}`,
          );
          break;
        }
        setInstallMsg(`Installing… (${i * 5 + 5}s)`);
      }
    } catch (e) {
      setInstallMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setInstalling(false);
    }
  }

  const cardCls = (id: string) =>
    `rounded-xl border p-4 space-y-2 transition-colors ${
      id === selected
        ? "border-amber-500/60 bg-zinc-900"
        : "border-zinc-800 bg-zinc-900"
    }`;

  const btnSecondary =
    "h-7 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 transition-colors disabled:opacity-40";
  const btnGhost =
    "h-7 px-3 rounded-lg hover:bg-zinc-800 text-xs text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-40";

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {localProviders.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-zinc-500 font-medium">
            Local engines (free)
          </p>
          {localProviders.map((p) => (
            <div
              key={p.id}
              data-testid={`llm-provider-card-${p.id}`}
              className={cardCls(p.id)}
            >
              <div className="flex items-center gap-2">
                {statusDot(p, probing)}
                <span className="text-sm font-semibold text-zinc-100">
                  {p.label}
                </span>
                <span className="text-[10px] rounded bg-zinc-800 px-1.5 py-0.5 font-medium text-zinc-500">
                  local · free
                </span>
                <span className="text-xs text-zinc-500 ml-auto">
                  {statusText(p, probing)}
                </span>
              </div>
              {p.id === "ollama" && !p.detected && !probing && (
                <div className="text-xs text-zinc-400 rounded-lg border border-zinc-800 px-2.5 py-2 space-y-2">
                  <p>
                    Not running. Manual:{" "}
                    <code className="font-mono text-zinc-300">
                      winget install -e --id Ollama.Ollama
                    </code>{" "}
                    then{" "}
                    <code className="font-mono text-zinc-300">
                      ollama pull gemma4:12b
                    </code>{" "}
                    — or see the{" "}
                    <Link to="/skills" className="underline text-amber-300">
                      llm-guide skill
                    </Link>
                    .
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className={btnSecondary}
                      data-testid="llm-install-ollama"
                      disabled={installing}
                      onClick={() => void installOllama()}
                    >
                      {installing ? "Installing…" : "Install Ollama now"}
                    </button>
                    {installMsg && (
                      <span className="text-zinc-500">{installMsg}</span>
                    )}
                  </div>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                {p.id !== selected && (
                  <button
                    type="button"
                    className={btnSecondary}
                    onClick={() => onUse(p.id)}
                  >
                    Use
                  </button>
                )}
                <button
                  type="button"
                  className={btnGhost}
                  data-testid={`llm-test-${p.id}`}
                  onClick={() => void runCardTest(p.id)}
                >
                  Test
                </button>
                {cardMsg[p.id] && (
                  <span className="text-xs text-zinc-500">{cardMsg[p.id]}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {cloudProviders.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-zinc-500 font-medium">Cloud (API key)</p>
          {cloudProviders.map((p) => (
            <div
              key={p.id}
              data-testid={`llm-provider-card-${p.id}`}
              className={cardCls(p.id)}
            >
              <div className="flex items-center gap-2">
                {statusDot(p, probing)}
                <span className="text-sm font-semibold text-zinc-100">
                  {p.label}
                </span>
                <span className="text-[10px] rounded bg-zinc-800 px-1.5 py-0.5 font-medium text-zinc-500">
                  cloud · paid
                </span>
                <span className="text-xs text-zinc-500 ml-auto">
                  {statusText(p, probing)}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type={showKeys[p.id] ? "text" : "password"}
                  value={keyInputs[p.id] ?? ""}
                  onChange={(e) =>
                    setKeyInputs((k) => ({ ...k, [p.id]: e.target.value }))
                  }
                  placeholder={
                    p.configured ? "•••••••• configured" : `Paste ${p.key_env}`
                  }
                  aria-label={`${p.label} API key`}
                  data-testid={`llm-key-${p.id}`}
                  className="flex-1 min-w-40 h-8 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 text-xs font-mono text-zinc-200 placeholder:text-zinc-600"
                />
                <button
                  type="button"
                  className={btnGhost}
                  onClick={() =>
                    setShowKeys((s) => ({ ...s, [p.id]: !s[p.id] }))
                  }
                >
                  {showKeys[p.id] ? "Hide" : "Show"}
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={btnSecondary}
                  disabled={!keyInputs[p.id]?.trim()}
                  onClick={() => void saveKey(p.id)}
                >
                  Save key
                </button>
                {p.configured && (
                  <button
                    type="button"
                    className={btnGhost}
                    onClick={() => void clearKey(p.id)}
                  >
                    Clear
                  </button>
                )}
                <button
                  type="button"
                  className={btnGhost}
                  data-testid={`llm-test-${p.id}`}
                  onClick={() => void runCardTest(p.id)}
                >
                  Test
                </button>
                {p.id !== selected && p.configured && (
                  <button
                    type="button"
                    className={btnSecondary}
                    onClick={() => onUse(p.id)}
                  >
                    Use
                  </button>
                )}
                {cardMsg[p.id] && (
                  <span className="text-xs text-zinc-500">{cardMsg[p.id]}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
