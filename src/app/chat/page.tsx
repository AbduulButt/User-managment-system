"use client";

import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Bot,
  LoaderCircle,
  LogOut,
  Send,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";

type Message = {
  id: number;
  sender: "bot" | "admin";
  text: string;
};

export default function ChatPage() {
  const router = useRouter();

  const [adminEmail, setAdminEmail] = useState("");
  const [command, setCommand] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      sender: "bot",
      text: "Hello! I can help you add, update, remove, find, and list users.",
    },
  ]);

  useEffect(() => {
    const savedEmail = localStorage.getItem("adminEmail");

    if (!savedEmail) {
      router.replace("/login");
      return;
    }

    setAdminEmail(savedEmail);
  }, [router]);
  useEffect(() => {
  messagesEndRef.current?.scrollIntoView({
    behavior: "smooth",
  });
}, [messages, isSending]);

async function handleSend(
  event: FormEvent<HTMLFormElement>
) {
  event.preventDefault();

  const trimmedCommand = command.trim();

  if (!trimmedCommand || isSending) {
    return;
  }

  const adminMessage: Message = {
    id: Date.now(),
    sender: "admin",
    text: trimmedCommand,
  };

  setMessages((currentMessages) => [
    ...currentMessages,
    adminMessage,
  ]);

  setCommand("");
  setIsSending(true);

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        command: trimmedCommand,
        adminEmail,
      }),
    });

    const result: {
      success?: boolean;
      message?: string;
    } = await response.json();

    const botMessage: Message = {
      id: Date.now() + 1,
      sender: "bot",
      text:
        result.message ??
        "The server returned an empty response.",
    };

    setMessages((currentMessages) => [
      ...currentMessages,
      botMessage,
    ]);
  } catch (error) {
    console.error("Send command error:", error);

    const botMessage: Message = {
      id: Date.now() + 1,
      sender: "bot",
      text:
        "I could not connect to the server. Please try again.",
    };

    setMessages((currentMessages) => [
      ...currentMessages,
      botMessage,
    ]);
  } finally {
    setIsSending(false);
  }
}

function handleCommandKeyDown(
  event: KeyboardEvent<HTMLTextAreaElement>
) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }
}

  function handleLogout() {
    localStorage.removeItem("adminEmail");
    router.replace("/login");
  }

  

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl">
        <aside className="hidden w-72 flex-col border-r border-slate-800 bg-slate-950 p-6 md:flex">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-600 p-3">
              <Bot className="h-6 w-6" />
            </div>

            <div>
              <h1 className="font-semibold">Admin Assistant</h1>
              <p className="text-sm text-slate-400">User management</p>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500">
              Logged in as
            </p>

            <p className="mt-2 break-all text-sm text-slate-200">
              {adminEmail || "Loading..."}
            </p>
          </div>

          <div className="mt-8">
            <h2 className="text-sm font-semibold text-slate-300">
              Example commands
            </h2>

            <div className="mt-4 space-y-3 text-sm text-slate-400">
              <p>Add john@example.com with phone +92332</p>
              <p>Update Samantha&apos;s city to Cordoba</p>
              <p>Remove john@example.com</p>
              <p>Find john@example.com</p>
              <p>List all users</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="mt-auto flex items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-slate-800 px-5 py-4 sm:px-7">
            <div>
              <h2 className="text-lg font-semibold">
                User Management Chatbot
              </h2>
              <p className="text-sm text-slate-400">
                Enter a natural-language command
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm text-emerald-400">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              Online
            </div>
          </header>

          <div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-7">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.sender === "admin"
                    ? "justify-end"
                    : "justify-start"
                  }`}
              >
                {message.sender === "bot" && (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600">
                    <Bot className="h-5 w-5" />
                  </div>
                )}

                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-6 sm:max-w-[70%] ${message.sender === "admin"
                      ? "rounded-br-md bg-blue-600 text-white"
                      : "rounded-bl-md border border-slate-700 bg-slate-800 text-slate-200"
                    }`}
                >
                  {message.text}
                  {isSending && (
  <div className="flex items-center gap-3">
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600">
      <Bot className="h-5 w-5" />
    </div>

    <div className="rounded-2xl rounded-bl-md border border-slate-700 bg-slate-800 px-4 py-3">
      <div className="flex gap-1">
        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:150ms]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:300ms]" />
      </div>
    </div>
  </div>
)}

<div ref={messagesEndRef} />
                </div>

                {message.sender === "admin" && (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-700">
                    <UserRound className="h-5 w-5" />
                  </div>
                )}
              </div>
            ))}
          </div>

          <form
            onSubmit={handleSend}
            className="border-t border-slate-800 bg-slate-950/60 p-4 sm:p-6"
          >
            <div className="flex items-end gap-3">
              <textarea
  value={command}
  onChange={(event) => setCommand(event.target.value)}
  onKeyDown={handleCommandKeyDown}
  placeholder='Try: "Add john@example.com with phone +92332"'
  rows={1}
  disabled={isSending}
  className="min-h-12 flex-1 resize-none rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
/>

             <button
  type="submit"
  disabled={isSending || !command.trim()}
  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
  aria-label="Send command"
>
  {isSending ? (
    <LoaderCircle className="h-5 w-5 animate-spin" />
  ) : (
    <Send className="h-5 w-5" />
  )}
</button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}