// Phase 3 fills this in: Telegram Bot API, HTML parse mode, inline "Got it"
// button. Between 7pm and 9am IST, queue instead of sending.

export interface DesignerBriefMessage {
  bookedAt: Date | null;
  brief: string;
  callUrl: string;
}

export async function sendDesignerBrief(
  message: DesignerBriefMessage,
): Promise<void> {
  throw new Error("sendDesignerBrief: not implemented until Phase 3");
}

export async function sendEscalation(text: string): Promise<void> {
  throw new Error("sendEscalation: not implemented until Phase 3");
}
