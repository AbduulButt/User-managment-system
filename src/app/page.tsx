import Link from "next/link";
import {
  ArrowRight,
  Bot,
  MessageSquareText,
  ShieldCheck,
  UserRoundCog,
} from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-6xl items-center">
        <div className="grid w-full gap-12 lg:grid-cols-2 lg:items-center">
          <section>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-300">
              <Bot className="h-4 w-4" />
              Intelligent user management
            </div>

            <h1 className="max-w-3xl text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              Manage users through a simple conversation
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              Add, update, find and remove user records using natural chat
              commands instead of complicated administration forms.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-slate-950 transition hover:bg-slate-200"
              >
                Open admin portal
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl">
            <div className="mb-6 flex items-center gap-3 border-b border-slate-800 pb-5">
              <div className="rounded-xl bg-blue-500/10 p-3">
                <MessageSquareText className="h-6 w-6 text-blue-400" />
              </div>

              <div>
                <h2 className="font-semibold">User Management Assistant</h2>
                <p className="text-sm text-slate-400">Ready for your command</p>
              </div>
            </div>

            <div className="space-y-4">
              <Feature
                icon={<UserRoundCog className="h-5 w-5" />}
                title="Natural commands"
                description='Try: "Update Samantha&apos;s city to Cordoba."'
              />

              <Feature
                icon={<ShieldCheck className="h-5 w-5" />}
                title="Controlled operations"
                description="Commands are validated before database changes."
              />

              <Feature
                icon={<Bot className="h-5 w-5" />}
                title="Helpful responses"
                description="The assistant explains successful actions and errors."
              />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

type FeatureProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
};

function Feature({ icon, title, description }: FeatureProps) {
  return (
    <div className="flex gap-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="mt-1 text-blue-400">{icon}</div>

      <div>
        <h3 className="font-medium">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-400">{description}</p>
      </div>
    </div>
  );
}