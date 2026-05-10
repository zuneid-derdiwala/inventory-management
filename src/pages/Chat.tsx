"use client";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ChatPanel from "@/components/ChatPanel";
import { isGroqEnabled } from "@/lib/groq";
import { MessageSquare } from "lucide-react";

const Chat = () => {
  if (!isGroqEnabled()) {
    return (
      <div className="flex flex-1 justify-center p-4 md:p-6">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Chat
            </CardTitle>
            <CardDescription>
              Chat is off. Set <code className="rounded bg-muted px-1 py-0.5 text-xs">GROQ_ENABLED=true</code> or{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">VITE_GROQ_ENABLED=true</code> in your{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">.env</code>, add{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">GROQ_API_KEY</code>, then restart the dev server. See{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">GROQ.md</code>.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-stretch p-4 md:p-6">
      <ChatPanel variant="standalone" />
    </div>
  );
};

export default Chat;
