import type { DocGuide } from "../docs/types";

export const HELP_GUIDES: DocGuide[] = [
  {
    slug: "getting-help",
    title: "How to get help",
    summary:
      "Ways to contact a company’s support team when they use Streammeo — email, live chat, and secure ticket links.",
    sections: [
      {
        title: "You’re in the right place",
        paragraphs: [
          "Streammeo powers customer support for many businesses. If you bought a product, use a service, or need help from a company, they — not Streammeo — handle your request.",
          "This help center explains how support usually works when a company uses Streammeo. For account-specific questions (billing, orders, access), contact that company directly using the channel they gave you.",
        ],
      },
      {
        title: "Common ways to reach support",
        steps: [
          "Email — send a message to their support address (for example support@company.com). You’ll often get an automatic acknowledgement, then a reply from an agent.",
          "Live chat — on their website, click the chat bubble (usually bottom-right). Type your question and wait for a reply.",
          "Ticket link — if they emailed you a secure link, open it to read the full conversation and reply in your browser without logging in.",
        ],
      },
      {
        title: "What information to include",
        paragraphs: [
          "Help agents resolve issues faster when you share: your name, the email on your account, a clear description of the problem, and any order or invoice numbers. Screenshots are helpful for billing or technical issues.",
          "Do not send passwords or full payment card numbers in chat or email. A legitimate support team will never ask for your password.",
        ],
      },
    ],
  },
  {
    slug: "live-chat",
    title: "Using live chat",
    summary:
      "How the chat bubble on a website works, what to expect while you wait, and what happens after your conversation.",
    sections: [
      {
        title: "Starting a chat",
        steps: [
          "Look for the chat icon, usually in the bottom-right corner of the company’s website.",
          "Click it to open the chat panel.",
          "Type your question and press Send.",
          "You may see an automatic reply first — that confirms your message was received.",
        ],
      },
      {
        title: "While you wait",
        paragraphs: [
          "Many teams reply within minutes during business hours. Outside those hours, you may get an automatic message and a follow-up by email when an agent is available.",
          "Stay on the page if you can, or leave your email in the chat if asked so the team can reply later.",
          "If the issue is urgent (cannot access your account, payment charged twice, etc.), say so clearly at the start of the message.",
        ],
      },
      {
        title: "After the chat",
        paragraphs: [
          "Complex issues are often turned into a support ticket so an agent can investigate and email you updates.",
          "You may receive a link to track the ticket online — see Track your request for how to use it.",
          "Keep the chat window open until you’ve confirmed your question was answered, or note any ticket or reference number the agent gives you.",
        ],
      },
    ],
  },
  {
    slug: "track-your-request",
    title: "Track your request",
    summary:
      "Use the secure link from email to view your support conversation, send replies, and understand ticket status.",
    sections: [
      {
        title: "Opening your ticket link",
        steps: [
          "Check your email for a message from the company’s support team with a link to your ticket or portal.",
          "Click the link — it opens in your browser. You do not need to create an account or sign in.",
          "If the link does not work, it may have expired. Reply to the original email or contact the company’s support address to request a new link.",
        ],
      },
      {
        title: "Reading the conversation",
        paragraphs: [
          "The page shows your ticket number, subject, and current status at the top.",
          "Below that you’ll see the full thread: your messages and replies from the support team, newest at the bottom.",
          "Only messages meant for you are shown — internal notes from agents are not visible on this page.",
        ],
      },
      {
        title: "Sending a reply",
        steps: [
          "Scroll to the reply box at the bottom of the page.",
          "Type your message and click Send reply.",
          "Your message is added to the ticket and the support team is notified.",
        ],
        paragraphs: [
          "If your ticket was marked resolved but you still need help, send a new reply — it will reopen automatically so the team can continue helping you.",
          "If the ticket is closed, you may not be able to reply on the portal. Contact the company by email or chat to open a new request.",
        ],
      },
      {
        title: "What the status means",
        paragraphs: [
          "New — your request was just received and may not have been read yet.",
          "Open — an agent is working on it or waiting for information from you.",
          "Pending — the team is waiting for you to reply or for something outside their control (e.g. a payment provider).",
          "Resolved — the team believes your issue is fixed. Reply if it is not.",
          "Closed — the ticket is finished and usually cannot be updated on the portal.",
        ],
      },
    ],
  },
  {
    slug: "rate-your-experience",
    title: "Rate your experience",
    summary:
      "After your issue is resolved, you may receive a short survey — here’s how it works and why your feedback matters.",
    sections: [
      {
        title: "When you’ll get a survey",
        paragraphs: [
          "After a support agent marks your ticket as resolved, the company may email you a link to rate your experience.",
          "The survey is optional but helps the team improve response times, tone, and quality.",
        ],
      },
      {
        title: "Completing the survey",
        steps: [
          "Open the link in the email — it goes to a simple rating page.",
          "Choose a score from 1 (poor) to 5 (excellent).",
          "Optionally add a short comment about what went well or what could be better.",
          "Submit — you’ll see a thank-you message. You can only submit once per ticket.",
        ],
      },
      {
        title: "If the link does not work",
        paragraphs: [
          "Survey links can expire after some time. If yours is invalid, you can ignore it — your ticket is still resolved.",
          "For serious unresolved issues, do not rely on the survey alone; reply on your ticket portal link or email support directly.",
        ],
      },
    ],
  },
  {
    slug: "faq",
    title: "Frequently asked questions",
    summary: "Quick answers to common questions from customers using Streammeo-powered support.",
    sections: [
      {
        title: "Who is Streammeo?",
        paragraphs: [
          "Streammeo is software that companies use to manage customer support. The company you contacted (your merchant, SaaS provider, etc.) is responsible for helping you — not Streammeo directly.",
        ],
      },
      {
        title: "How fast will I get a reply?",
        paragraphs: [
          "Response times depend on the company’s support hours and policies. Many teams aim to reply within a few hours on business days. Urgent issues are often prioritized when you mark them as such.",
        ],
      },
      {
        title: "I didn’t receive a password reset / I can’t log in",
        paragraphs: [
          "Login and password issues are handled by the company whose product you use. Contact their support — Streammeo’s help center cannot reset passwords for their app or website.",
        ],
      },
      {
        title: "Is my conversation private?",
        paragraphs: [
          "Messages you send to a company’s support team are visible to that company’s authorized agents. They use Streammeo to store and manage those conversations securely. Read the company’s privacy policy for how they handle your data.",
        ],
      },
      {
        title: "My portal or survey link expired",
        paragraphs: [
          "Links are secure and may stop working after a period of time. Email the support team again or start a new chat on their website — mention your previous ticket number if you have it.",
        ],
      },
      {
        title: "Are you a support agent?",
        paragraphs: [
          "If you work for a company that uses Streammeo to support customers, see Team documentation for setup guides, the agent console, and embedding chat on your site.",
        ],
      },
    ],
  },
];

export function getHelpGuide(slug: string): DocGuide | undefined {
  return HELP_GUIDES.find((guide) => guide.slug === slug);
}
