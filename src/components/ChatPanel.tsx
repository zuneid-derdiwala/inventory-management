"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { showError, showSuccess } from "@/utils/toast";
import {
  getGroqModel,
  isGroqEnabled,
  groqChat,
  groqListModels,
  type GroqChatMessage,
} from "@/lib/groq";
import { CHAT_SUGGESTIONS } from "@/constants/chatSuggestions";
import { useData } from "@/context/DataContext";
import { buildInventorySystemContext } from "@/lib/chatInventoryContext";
import { Bot, Lightbulb, Loader2, MessageSquare, SendHorizontal, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ChatPanelProps = {
  variant?: "standalone" | "embedded";
};

type ChatRow = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function toApiMessages(rows: ChatRow[]): GroqChatMessage[] {
  return rows.map((r) => ({ role: r.role, content: r.content }));
}

const ChatPanel = ({ variant = "standalone" }: ChatPanelProps) => {
  const { database, isLoadingData } = useData();
  const [pingState, setPingState] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [pingDetail, setPingDetail] = useState<string>("");
  const [messages, setMessages] = useState<ChatRow[]>([]);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  const handlePing = useCallback(async () => {
    setPingState("loading");
    setPingDetail("");
    try {
      const { models } = await groqListModels();
      const names = models?.map((m) => m.name).join(", ") || "(no models)";
      setPingState("ok");
      setPingDetail(names);
      showSuccess("Groq responded.");
    } catch (e: unknown) {
      setPingState("error");
      setPingDetail(e instanceof Error ? e.message : "Unknown error");
      showError("Could not reach Groq. Check API key and network.");
    }
  }, []);

  const sendWithText = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isSending) return;

      const userRow: ChatRow = { id: uid(), role: "user", content: trimmed };
      setMessages((prev) => [...prev, userRow]);
      setIsSending(true);

      try {
        const systemContent = buildInventorySystemContext(database);
        const history: GroqChatMessage[] = [
          { role: "system", content: systemContent },
          ...toApiMessages([...messages, userRow]),
        ];
        const content = await groqChat(history, { temperature: 0.45 });
        setMessages((prev) => [...prev, { id: uid(), role: "assistant", content }]);
      } catch (e: unknown) {
        showError(e instanceof Error ? e.message : "Chat request failed");
      } finally {
        setIsSending(false);
      }
    },
    [database, isSending, messages]
  );

  const sendMessage = useCallback(async () => {
    const text = draft.trim();
    if (!text || isSending) return;
    setDraft("");
    await sendWithText(text);
  }, [draft, isSending, sendWithText]);

  const applySuggestion = useCallback((prompt: string) => {
    setDraft(prompt);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  const clearChat = useCallback(() => {
    setMessages([]);
    setDraft("");
  }, []);

  if (!isGroqEnabled()) {
    return null;
  }

  const model = getGroqModel();

  const headerBlock =
    variant === "embedded" ? (
      <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-border/60">
        <span className="text-sm font-medium text-foreground">AI chat</span>
        <Badge variant="outline" className="font-mono text-xs">
          {model}
        </Badge>
        <Badge
          variant={
            pingState === "ok" ? "default" : pingState === "error" ? "destructive" : "secondary"
          }
          className="text-xs"
        >
          {pingState === "loading"
            ? "Checking…"
            : pingState === "ok"
              ? "Reachable"
              : pingState === "error"
                ? "Unreachable"
                : "Not checked"}
        </Badge>
        <Badge variant="outline" className="text-xs font-normal">
          {isLoadingData ? "Loading…" : `${database.length} entries`}
        </Badge>
        <p className="w-full text-xs text-muted-foreground font-normal">
          Inventory insights from your loaded entries (aggregates only; no IMEIs sent).
        </p>
      </div>
    ) : (
      <>
        <CardHeader className="pb-2 space-y-1">
          <CardTitle className="flex flex-wrap items-center gap-2 text-base sm:text-lg">
            <MessageSquare className="h-5 w-5 shrink-0" />
            Chat
            <Badge variant="outline" className="font-mono text-xs">
              {model}
            </Badge>
            <Badge
              variant={
                pingState === "ok" ? "default" : pingState === "error" ? "destructive" : "secondary"
              }
              className="text-xs"
            >
              {pingState === "loading"
                ? "Checking…"
                : pingState === "ok"
                  ? "Reachable"
                  : pingState === "error"
                    ? "Unreachable"
                    : "Not checked"}
            </Badge>
            <Badge variant="outline" className="text-xs font-normal">
              {isLoadingData ? "Loading data…" : `${database.length} entries`}
            </Badge>
          </CardTitle>
          <p className="text-xs text-muted-foreground font-normal">
            Ask about sellers, models, what is selling, trends — each send includes a fresh summary of your inventory.
          </p>
        </CardHeader>
      </>
    );

  const body = (
    <div className={cn("space-y-3", variant === "embedded" && "pt-1")}>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={handlePing} disabled={pingState === "loading"}>
          {pingState === "loading" ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              List models
            </>
          ) : (
            "List models"
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={clearChat}
          disabled={messages.length === 0 && !draft.trim()}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Clear chat
        </Button>
      </div>

      {pingDetail && (
        <Alert variant={pingState === "error" ? "destructive" : "default"}>
          <AlertDescription className="text-xs break-words font-mono">{pingDetail}</AlertDescription>
        </Alert>
      )}

      <div className="rounded-lg border bg-muted/20">
        <ScrollArea className="h-[min(380px,45vh)] sm:h-[min(420px,50vh)] p-3">
          <div className="space-y-3 pr-2">
            {messages.length === 0 && !isSending && (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-sm text-muted-foreground">
                <Bot className="h-10 w-10 opacity-40" />
                <p>Ask about sellers, trending models, stock vs sold, or monthly inward activity.</p>
                <p className="text-xs">Each reply uses your loaded inventory summary plus this conversation.</p>
                <p className="text-xs">Use quick prompts below, or type your own question.</p>
                <p className="text-xs">Enter sends · Shift+Enter new line</p>
              </div>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn("flex w-full", m.role === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[90%] rounded-2xl px-3 py-2 text-sm shadow-sm",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted rounded-bl-md border"
                  )}
                >
                  {m.role === "assistant" && (
                    <div className="mb-1 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      <Bot className="h-3 w-3" />
                      {model}
                    </div>
                  )}
                  <div className="whitespace-pre-wrap break-words">{m.content}</div>
                </div>
              </div>
            ))}
            {isSending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border bg-muted px-3 py-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Thinking…
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        </ScrollArea>
      </div>

      <div className="space-y-2">
        <div className="rounded-lg border border-border/80 bg-muted/30 px-2.5 py-2 space-y-2">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Lightbulb className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Quick prompts (uses your data)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {CHAT_SUGGESTIONS.map((s) => (
              <Button
                key={s.label}
                type="button"
                variant="secondary"
                size="sm"
                className="h-auto min-h-8 max-w-full whitespace-normal px-2.5 py-1 text-left text-xs font-normal leading-snug"
                disabled={isSending}
                title={s.prompt}
                onClick={() => applySuggestion(s.prompt)}
              >
                {s.label}
              </Button>
            ))}
          </div>
        </div>
        <label htmlFor="groq-chat-input" className="sr-only">
          Message
        </label>
        <Textarea
          ref={textareaRef}
          id="groq-chat-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. Which seller sold the most? What model is trending?"
          rows={3}
          disabled={isSending}
          className="resize-none min-h-[80px] text-sm"
        />
        <div className="flex justify-end">
          <Button type="button" onClick={() => void sendMessage()} disabled={isSending || !draft.trim()}>
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending…
              </>
            ) : (
              <>
                <SendHorizontal className="mr-2 h-4 w-4" />
                Send
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );

  if (variant === "embedded") {
    return (
      <div className="w-full space-y-3">
        {headerBlock}
        {body}
      </div>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      {headerBlock}
      <CardContent className="space-y-3">{body}</CardContent>
    </Card>
  );
};

export default ChatPanel;
