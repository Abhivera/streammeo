import type { DocGuide } from "./types";

export const DOC_GUIDES: DocGuide[] = [
  {
    slug: "getting-started",
    title: "Getting started",
    summary:
      "Create a workspace, sign in, and take a quick tour of the agent console before handling your first ticket.",
    sections: [
      {
        title: "Create your workspace",
        paragraphs: [
          "Go to the home page and click Start free trial, or open /register directly. Enter your company name, your name, email, and a password (at least 8 characters).",
          "If Google sign-in is enabled for your workspace, you can sign up with Google — enter your company name first so Streammeo knows which workspace to create.",
          "After registration you land in the agent console at /dashboard. Each workspace is isolated: tickets, inboxes, SLA policies, and the chat widget API key belong to that workspace only.",
        ],
      },
      {
        title: "Sign in",
        steps: [
          "Open /login and enter your email and password, or use Sign in with Google if enabled.",
          "Forgot your password? Use Forgot password on the login page — a reset link is emailed when Firebase password reset is configured.",
          "Sessions use a JWT stored in the browser. Use Log out in the sidebar when you finish on a shared machine.",
        ],
      },
      {
        title: "Recommended first steps",
        steps: [
          "Open Dashboard — review open ticket count, SLA breaches, and recent tickets.",
          "Open Tickets — click a ticket to read the thread, change status, and send a reply.",
          "Open Settings → Workspace & billing — copy your live chat embed snippet and note your plan limits.",
          "Configure inboxes, SLA policies, canned responses, and knowledge base articles under Settings in the sidebar.",
        ],
      },
    ],
  },
  {
    slug: "agent-console",
    title: "Agent console",
    summary:
      "How to work the ticket queue, reply to customers, use AI suggestions, and avoid duplicate replies with presence.",
    sections: [
      {
        title: "Dashboard",
        paragraphs: [
          "The dashboard shows live queue health: open tickets, volume today/this week, average CSAT, SLA breach count, resolution rate, open tickets by priority, and a recent-tickets table.",
          "Click any ticket subject to open the detail view. SLA breach badges appear on tickets that missed first-response or resolution targets.",
        ],
      },
      {
        title: "Ticket queue",
        paragraphs: [
          "Tickets lists all conversations in your workspace. Filter by status, search by subject or requester, and use bulk actions to resolve or close multiple tickets at once.",
          "Ticket statuses follow this flow: new → open → pending → resolved → closed. Valid transitions are enforced by the API — for example, you cannot jump from new directly to closed without going through open.",
        ],
      },
      {
        title: "Ticket detail — replies & notes",
        steps: [
          "Public reply — visible to the customer. When Brevo is configured, outbound email is sent to the requester.",
          "Internal note — toggle Internal note before sending. Only agents see these; they appear in the timeline but are not emailed.",
          "Canned responses — pick a template from the dropdown to insert pre-written text (supports {{customer_name}} and {{agent_name}} placeholders).",
          "AI suggest reply — on Growth+ plans, click to draft a reply from ticket context. Review and edit before sending; usage counts against your monthly AI limit.",
          "Portal link — generate a customer portal URL so the requester can view and reply without email.",
        ],
      },
      {
        title: "Status & collaboration",
        paragraphs: [
          "Change ticket status from the detail page dropdown. Resolving a ticket triggers a CSAT survey email when email delivery is configured.",
          "When real-time presence is enabled, opening a ticket shows who else is viewing it and typing indicators — use this to avoid duplicate replies.",
          "The ticket queue can auto-refresh when new conversations arrive from email or chat webhooks, without manual reload.",
        ],
      },
    ],
  },
  {
    slug: "settings",
    title: "Workspace & settings",
    summary:
      "Configure inboxes, SLA policies, canned responses, knowledge base articles, billing, and your chat widget embed.",
    sections: [
      {
        title: "Workspace & billing (Settings → index)",
        paragraphs: [
          "View workspace name, slug, your role, and current plan usage (tickets and AI replies this month).",
          "Upgrade plans via Razorpay when RAZORPAY_KEY_ID and related secrets are set on the backend. Payments are in INR.",
          "Copy the live chat widget snippet from Settings → Live widget — it includes your workspace API key and the correct API URL for your environment.",
        ],
      },
      {
        title: "Shared inboxes",
        steps: [
          "Go to Settings → Inboxes and create an inbox (name + support email address).",
          "Point inbound email webhooks (Brevo) at POST /api/v1/webhooks/email/inbound — each inbound message creates or updates a ticket.",
          "Optional auto-responder adds an automatic reply comment on new tickets when enabled.",
        ],
      },
      {
        title: "SLA policies",
        paragraphs: [
          "SLA policies define first-response and resolution time targets in minutes. Assign a default policy and optional priority-specific policies (e.g. Urgent = 60 min first response).",
          "A background checker runs every 60 seconds and flags breached tickets. Breaches appear on the dashboard and ticket detail.",
        ],
      },
      {
        title: "Canned responses & knowledge base",
        paragraphs: [
          "Canned responses are reusable reply templates agents insert from the ticket detail page.",
          "Knowledge base articles are stored per workspace. Public search (GET /api/v1/portal/:slug/kb) powers self-service. Matching articles can surface in the live chat widget.",
        ],
      },
    ],
  },
  {
    slug: "live-chat-widget",
    title: "Live chat widget",
    summary:
      "Embed Streammeo chat on your website and hand off conversations to your ticket queue when visitors need an agent.",
    sections: [
      {
        title: "Embed the widget",
        steps: [
          "Sign in and open Settings → Live widget.",
          "Customize colors, copy, and launcher style, then copy the embed snippet.",
          "Paste it before </body> on every page where you want the chat bubble.",
          "Publish your site — the snippet includes your workspace API key and the correct API URL for your account.",
        ],
      },
      {
        title: "Script attributes",
        code:
          '<script\n  src="https://your-app.com/chat-widget.js"\n  data-api-key="YOUR_WORKSPACE_API_KEY"\n  data-api-url="https://your-api.example.com"\n  data-accent="#FF1E2D"\n></script>',
        paragraphs: [
          "data-api-key — required. Your workspace API key (unique per workspace; never expose it in public source repositories).",
          "data-api-url — required. Base URL of the Streammeo API (no trailing slash). Use the value shown in Settings.",
          "data-accent — optional. Overrides accent color on that site only; workspace theme is set under Settings → Live widget.",
          "The widget uses Shadow DOM and sends your API key on every chat API request.",
        ],
      },
      {
        title: "Preview before launch",
        steps: [
          "Use the widget demo page linked from Settings to confirm the bubble loads and messages send correctly.",
          "Verify chat sessions appear under Live chat in the agent console.",
        ],
      },
      {
        title: "Convert chat to ticket",
        paragraphs: [
          "When a visitor needs agent help, open Live chat in the agent console, select the session, and click Convert to ticket. The conversation appears in your ticket queue with the full transcript.",
        ],
      },
    ],
  },
  {
    slug: "customer-experience",
    title: "Customer portal & CSAT (for agents)",
    summary:
      "How to share portal links with customers, what they see, and when CSAT surveys are sent. Customer-facing help lives at /help.",
    sections: [
      {
        title: "Customer help center",
        paragraphs: [
          "End customers should use the public Help center at /help — not /docs. It explains live chat, ticket links, surveys, and FAQ in plain language.",
          "Link to /help from your website footer, auto-replies, and portal pages so customers know how support works.",
        ],
      },
      {
        title: "Sending a portal link",
        steps: [
          "Open a ticket in the agent console.",
          "Click Get portal link to generate a signed URL (/portal/ticket/:token).",
          "Share the link with the customer by email or chat — they can view the thread and reply without an account.",
          "Customer replies on resolved or pending tickets reopen the ticket automatically.",
        ],
      },
      {
        title: "CSAT surveys",
        paragraphs: [
          "When you set a ticket to resolved, Streammeo can email a CSAT link (/portal/csat/:token) if outbound email (Brevo) is configured.",
          "Scores and comments feed into the dashboard CSAT average. Customers can only submit once per ticket.",
          "Point customers to /help/rate-your-experience if they ask what the survey is for.",
        ],
      },
    ],
  },
];

export function getDocGuide(slug: string): DocGuide | undefined {
  return DOC_GUIDES.find((guide) => guide.slug === slug);
}
