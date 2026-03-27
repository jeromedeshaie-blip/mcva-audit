import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { functions } from "@/lib/inngest/functions";

// Allow longer execution per step — needed for LLM calls.
// Vercel Hobby: 10s (default), Pro: up to 300s.
// Each Inngest step is a separate invocation, so 60s covers any single LLM call.
export const maxDuration = 60;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
});
