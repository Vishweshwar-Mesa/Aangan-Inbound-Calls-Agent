import { CopyField } from "@/components/copy-field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { TestConnectionButton } from "./test-connection-button";

function isSet(name: string): boolean {
  return Boolean(process.env[name] && process.env[name]!.length > 0);
}

function EnvRow({ name }: { name: string }) {
  const set = isSet(name);
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="font-mono text-[#111111]">{name}</span>
      <span
        className={cn(
          "text-xs font-bold tracking-wide uppercase",
          set ? "text-[#111111]" : "text-[#A8A295]",
        )}
      >
        {set ? "Set" : "Not set"}
      </span>
    </div>
  );
}

function ServiceCard({
  title,
  vars,
  testService,
}: {
  title: string;
  vars: string[];
  testService?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {vars.map((name) => (
          <EnvRow key={name} name={name} />
        ))}
        {testService && (
          <div className="mt-2 border-t-2 border-[#111111] pt-3">
            <TestConnectionButton service={testService} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const designerName = process.env.DESIGNER_NAME || "(not set)";
  const escalationChat = process.env.TELEGRAM_ESCALATION_CHAT_ID || "(not set)";

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight text-[#111111]">SETTINGS</h1>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ServiceCard
          title="Vani"
          vars={["VANI_API_KEY", "VANI_AGENT_ID", "VANI_PHONE_NUMBER", "VANI_WEBHOOK_SECRET"]}
        />
        <ServiceCard
          title="Cal.com"
          vars={["CALCOM_API_KEY", "CALCOM_EVENT_TYPE_ID"]}
          testService="calcom"
        />
        <ServiceCard
          title="Telegram"
          vars={[
            "TELEGRAM_BOT_TOKEN",
            "TELEGRAM_DESIGNER_CHAT_ID",
            "TELEGRAM_ESCALATION_CHAT_ID",
            "TELEGRAM_WEBHOOK_SECRET",
          ]}
          testService="telegram"
        />
        <ServiceCard
          title="HubSpot"
          vars={["HUBSPOT_PRIVATE_APP_TOKEN"]}
          testService="hubspot"
        />
        <ServiceCard
          title="Gemini"
          vars={["GEMINI_API_KEY", "GEMINI_MODEL"]}
          testService="gemini"
        />
        <ServiceCard
          title="Database (Neon)"
          vars={["DATABASE_URL", "DATABASE_URL_UNPOOLED"]}
          testService="database"
        />
        <ServiceCard title="Resend" vars={["RESEND_API_KEY"]} testService="resend" />
        <ServiceCard
          title="Auth & app"
          vars={["AUTH_SECRET", "ALLOWED_EMAILS", "APP_URL", "CRON_SECRET", "DESIGNER_NAME"]}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Webhook URLs</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <CopyField label="Vani call-ended" value={`${appUrl}/api/vani/call-ended`} />
          <CopyField label="Telegram" value={`${appUrl}/api/telegram`} />
          <CopyField label="Cron (every 10 min)" value={`${appUrl}/api/cron`} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs font-bold tracking-wide uppercase text-[#6B6659]">
              Rubric version
            </p>
            <p className="text-[#111111]">v1</p>
          </div>
          <div>
            <p className="text-xs font-bold tracking-wide uppercase text-[#6B6659]">Designer</p>
            <p className="text-[#111111]">{designerName}</p>
          </div>
          <div>
            <p className="text-xs font-bold tracking-wide uppercase text-[#6B6659]">
              Escalation chat
            </p>
            <p className="text-[#111111]">{escalationChat}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
