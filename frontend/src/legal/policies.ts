import {
  LEGAL_ADDRESS_LINES,
  LEGAL_COMPANY_NAME,
  LEGAL_CONTACT_EMAIL,
  LEGAL_CONTACT_PHONE,
  LEGAL_ENTITY,
  LEGAL_REGISTER,
  LEGAL_RESPONSIBLE_PERSON,
  LEGAL_SUPPORT_EMAIL,
  LEGAL_VAT_ID,
  LEGAL_WEBSITE,
} from "./constants";
import type { LegalPolicy } from "./types";

const contact = `Questions about these policies? Email ${LEGAL_CONTACT_EMAIL}.`;

export const LEGAL_POLICIES: LegalPolicy[] = [
  {
    slug: "privacy",
    title: "Privacy Policy",
    summary: "How Streammeo collects, uses, and protects data when you use the dashboard and embeddable live chat widget.",
    sections: [
      {
        title: "Overview",
        paragraphs: [
          `${LEGAL_ENTITY} ("we", "us", "our") provides AI customer service and ticketing software, including an agent dashboard and an embeddable live chat widget ("Service"). This Privacy Policy explains what information we collect, how we use it, and the choices available to you.`,
          "This policy applies to merchants who create a workspace with us and to end customers who interact with the widget or submit support requests. Merchants are responsible for informing their customers about data processing as required by applicable law.",
        ],
      },
      {
        title: "Information we collect",
        paragraphs: [
          "Account information: when you register, we collect your email address, password hash, and workspace details such as store or brand name, agent configuration, and FAQ content you provide.",
          "Support and chat data: when a customer uses the live chat widget or submits a ticket, we store message content, ticket metadata, session duration, and related analytics for the merchant workspace.",
          "Technical data: we collect standard log data such as IP address, browser type, device information, and timestamps to operate, secure, and debug the Service.",
          "Authentication data: when you sign in, we store your email address and account credentials as described in our account registration flow.",
        ],
      },
      {
        title: "How we use information",
        paragraphs: [
          "We use collected information to provide and improve the Service, including managing tickets and conversations, storing support history for merchant review, enforcing usage limits, preventing abuse, and responding to support requests.",
          "Merchants configure system prompts, FAQs, and integrations; responses generated for visitors are based on that merchant content plus our AI and optional tools (such as FAQ search, order lookup, or web search when enabled).",
          "We do not sell personal information. We do not use customer support conversations to train public AI models.",
        ],
      },
      {
        title: "Third-party processors",
        paragraphs: [
          "We rely on subprocessors to deliver the Service, including providers for speech recognition and synthesis, large language model inference, optional web search, cloud hosting, and database storage. Data is shared with these providers only as needed to perform the Service.",
          "Merchants who connect third-party integrations (for example, e-commerce platforms) authorize us to call those services using credentials they supply. Data handled through integrations is subject to those third parties' policies as well.",
        ],
      },
      {
        title: "Data retention",
        paragraphs: [
          "We retain account and workspace data while your account is active. Session transcripts and related records are retained so merchants can review support history unless deleted through product features or upon account closure.",
          "We may retain limited records as required for security, fraud prevention, legal compliance, or dispute resolution.",
        ],
      },
      {
        title: "Security",
        paragraphs: [
          "We use industry-standard measures such as encrypted transport (HTTPS/TLS), access controls, and hashed credentials. No method of transmission or storage is completely secure; please protect your account credentials and workspace API keys.",
        ],
      },
      {
        title: "Your rights and choices",
        paragraphs: [
          "Merchants may access, update, or delete workspace configuration and FAQ content through the dashboard. You may request account deletion or data export by contacting us.",
          "Depending on your jurisdiction, you may have additional rights such as access, correction, deletion, restriction, portability, or objection. We will respond to verified requests in accordance with applicable law.",
          "Visitors who interact with the widget should contact the merchant whose site they visited for questions about that merchant's privacy practices.",
        ],
      },
      {
        title: "Cookies and local storage",
        paragraphs: [
          "The dashboard uses browser storage (including local storage) to keep you signed in. The widget does not require visitor login; it connects using the merchant's workspace API key embedded in the page.",
        ],
      },
      {
        title: "International transfers",
        paragraphs: [
          "Your information may be processed in countries other than where you reside. Where required, we implement appropriate safeguards for cross-border transfers.",
        ],
      },
      {
        title: "Children",
        paragraphs: [
          "The Service is not directed to children under 13 (or the minimum age required in your jurisdiction). We do not knowingly collect personal information from children.",
        ],
      },
      {
        title: "Changes",
        paragraphs: [
          "We may update this Privacy Policy from time to time. Material changes will be posted on this page with an updated effective date. Continued use of the Service after changes take effect constitutes acceptance.",
          contact,
        ],
      },
    ],
  },
  {
    slug: "terms",
    title: "Terms & Conditions",
    summary: "The agreement between you and Streammeo for using the dashboard, API, and live chat widget.",
    sections: [
      {
        title: "Agreement",
        paragraphs: [
          `These Terms & Conditions ("Terms") govern access to and use of the ${LEGAL_ENTITY} platform, dashboard, APIs, and embeddable widget (collectively, the "Service"). By creating an account, embedding the widget, or otherwise using the Service, you agree to these Terms and our Privacy Policy.`,
          "If you use the Service on behalf of a company, you represent that you have authority to bind that company.",
        ],
      },
      {
        title: "The Service",
        paragraphs: [
          "Streammeo provides AI-powered voice customer support tools. Features may include real-time voice capture, transcription, AI-generated responses, FAQ search, optional integrations, session history, and usage analytics.",
          "We may modify, suspend, or discontinue features with reasonable notice when practicable. The Service relies on third-party AI and infrastructure providers; availability may be affected by factors outside our control.",
        ],
      },
      {
        title: "Accounts and API keys",
        paragraphs: [
          "You must provide accurate registration information and keep credentials secure. You are responsible for all activity under your account and for safeguarding workspace API keys used to embed the widget.",
          "Do not share API keys publicly or embed them in client-side code beyond the intended widget script configuration. Rotate keys promptly if compromise is suspected.",
        ],
      },
      {
        title: "Merchant responsibilities",
        paragraphs: [
          "You are solely responsible for the content you configure (FAQs, prompts, integration data) and for ensuring your use of the widget complies with applicable laws, including consumer protection, telecommunications, recording consent, and data protection requirements in the regions where your visitors are located.",
          "You must provide appropriate notice and obtain any required consent before recording or processing visitor voice on your website.",
        ],
      },
      {
        title: "Acceptable use",
        paragraphs: [
          "Your use of the Service must comply with our Acceptable Use Policy. We may suspend or terminate accounts that violate these Terms or pose security, legal, or operational risk.",
        ],
      },
      {
        title: "Intellectual property",
        paragraphs: [
          "We retain all rights in the Service, software, branding, and documentation. Subject to these Terms, we grant you a limited, non-exclusive, non-transferable license to use the dashboard and embed the widget on websites you operate.",
          "You retain ownership of your workspace content. You grant us a license to host, process, and display that content as needed to provide the Service.",
        ],
      },
      {
        title: "AI-generated output",
        paragraphs: [
          "Responses produced by the Service are generated automatically and may be inaccurate or incomplete. You are responsible for reviewing agent behavior, maintaining accurate FAQs, and providing human escalation paths where appropriate. See our Disclaimer for additional limitations.",
        ],
      },
      {
        title: "Fees and usage",
        paragraphs: [
          "Some features may be offered free of charge during early access. We may introduce paid plans, usage limits, or metering in the future. If fees apply, we will describe pricing and billing terms before charging you.",
          "Paid subscriptions, cancellations, and refunds are governed by our Refund & Return Policy in addition to these Terms.",
        ],
      },
      {
        title: "Disclaimer of warranties",
        paragraphs: [
          'THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.',
        ],
      },
      {
        title: "Limitation of liability",
        paragraphs: [
          "TO THE MAXIMUM EXTENT PERMITTED BY LAW, STREAMMEO AND ITS SUPPLIERS WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUE, DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE SERVICE.",
          "OUR TOTAL LIABILITY FOR ANY CLAIM RELATING TO THE SERVICE IS LIMITED TO THE GREATER OF (A) AMOUNTS YOU PAID US IN THE TWELVE MONTHS BEFORE THE CLAIM OR (B) ONE HUNDRED U.S. DOLLARS (USD $100).",
        ],
      },
      {
        title: "Indemnification",
        paragraphs: [
          "You will defend and indemnify Streammeo against claims arising from your content, your websites, your violation of these Terms, or your violation of applicable law.",
        ],
      },
      {
        title: "Termination",
        paragraphs: [
          "You may stop using the Service at any time. We may suspend or terminate access for breach, risk, non-payment (if applicable), or discontinuation of the Service. Provisions that by nature should survive termination will survive.",
        ],
      },
      {
        title: "Governing law",
        paragraphs: [
          "These Terms are governed by the laws of India, without regard to conflict-of-law principles, except where mandatory consumer protection laws in your jurisdiction provide otherwise.",
          contact,
        ],
      },
    ],
  },
  {
    slug: "disclaimer",
    title: "Disclaimer",
    summary: "Important limitations on AI-generated support replies and third-party information.",
    sections: [
      {
        title: "General",
        paragraphs: [
          "The information and responses provided through the Streammeo Service are for general customer support purposes only. They do not constitute professional, legal, financial, medical, or other specialized advice.",
        ],
      },
      {
        title: "AI-generated responses",
        paragraphs: [
          "Voice agents use automated speech recognition, large language models, and text-to-speech synthesis. Output may contain errors, omissions, or outdated information even when sourced from merchant FAQs or connected tools.",
          "Merchants should treat AI responses as first-line support assistance, not authoritative statements of policy, pricing, availability, or legal obligation.",
        ],
      },
      {
        title: "Merchant content",
        paragraphs: [
          "Streammeo does not verify the accuracy of FAQs, prompts, or integration data supplied by merchants. Merchants are responsible for keeping that content current and compliant with their own policies.",
        ],
      },
      {
        title: "Third-party services",
        paragraphs: [
          "The Service may query third-party APIs (such as e-commerce platforms or web search providers). We do not control and are not responsible for third-party content, uptime, or data accuracy.",
        ],
      },
      {
        title: "No guarantee of outcomes",
        paragraphs: [
          "We do not guarantee specific business results such as reduced ticket volume, increased sales, or improved customer satisfaction. Performance depends on merchant configuration, website traffic, and external factors.",
        ],
      },
      {
        title: "Use at your own risk",
        paragraphs: [
          "Your use of the Service and reliance on AI-generated output is at your own risk. Where decisions have significant consequences, provide clear paths for human review or escalation.",
          contact,
        ],
      },
    ],
  },
  {
    slug: "eula",
    title: "End User License Agreement (EULA)",
    summary: "License terms for the Streammeo dashboard software and embeddable widget.",
    sections: [
      {
        title: "License grant",
        paragraphs: [
          "Subject to your compliance with these Terms and this EULA, Streammeo grants you a limited, revocable, non-exclusive, non-transferable, non-sublicensable license to (a) access and use the dashboard for managing your workspace and (b) embed and distribute the widget script on websites you own or control for the purpose of providing voice support to your customers.",
        ],
      },
      {
        title: "Restrictions",
        paragraphs: [
          "You may not copy, modify, or create derivative works of the software except as expressly permitted.",
          "You may not reverse engineer, decompile, or attempt to extract source code from the widget or backend except where such restriction is prohibited by law.",
          "You may not remove proprietary notices, resell the software as a standalone product, or use the Service to build a competing voice-agent platform.",
          "You may not circumvent usage limits, security controls, or authentication mechanisms.",
        ],
      },
      {
        title: "Widget distribution",
        paragraphs: [
          "The widget is delivered as a JavaScript bundle intended to be loaded from your CDN or ours via a script tag. You may not alter the widget in a way that misrepresents its origin or disables required security checks.",
          "Each workspace API key is licensed for use with the associated merchant account only.",
        ],
      },
      {
        title: "Updates",
        paragraphs: [
          "We may update the widget and dashboard automatically or require you to deploy new versions. Updates may add, modify, or remove features. Continued use after an update constitutes acceptance of the updated software.",
        ],
      },
      {
        title: "Open source components",
        paragraphs: [
          "The Service may include open-source components governed by their respective licenses. Nothing in this EULA limits your rights under those licenses.",
        ],
      },
      {
        title: "Termination of license",
        paragraphs: [
          "This license terminates automatically if you breach these terms. Upon termination, you must stop using the dashboard, remove embedded widget scripts, and destroy copies of the software in your possession.",
        ],
      },
      {
        title: "Ownership",
        paragraphs: [
          "Streammeo and its licensors retain all right, title, and interest in the software. No rights are granted except as expressly stated in this EULA.",
          contact,
        ],
      },
    ],
  },
  {
    slug: "acceptable-use",
    title: "Acceptable Use Policy",
    summary: "Rules for fair, lawful, and safe use of Streammeo.",
    sections: [
      {
        title: "Purpose",
        paragraphs: [
          'This Acceptable Use Policy ("AUP") describes prohibited and restricted uses of the Streammeo Service. It supplements our Terms & Conditions.',
        ],
      },
      {
        title: "Lawful use",
        paragraphs: [
          "You must comply with all applicable laws and regulations, including privacy, telecommunications, consumer protection, export control, and intellectual property laws.",
        ],
      },
      {
        title: "Prohibited content and conduct",
        paragraphs: [
          "Do not use the Service to harass, threaten, defame, or discriminate against others.",
          "Do not transmit unlawful, fraudulent, deceptive, or harmful content through voice sessions or configured agent responses.",
          "Do not use the Service to collect sensitive personal data you are not authorized to process (such as payment card numbers spoken aloud, government ID numbers, or health information) unless you have implemented appropriate legal basis, notice, and safeguards.",
          "Do not impersonate Streammeo, other merchants, or any person or entity.",
        ],
      },
      {
        title: "Technical abuse",
        paragraphs: [
          "Do not probe, scan, or test the vulnerability of our systems without written authorization.",
          "Do not interfere with or disrupt the Service, including via excessive automated requests, denial-of-service attacks, or attempts to bypass rate limits or usage caps.",
          "Do not share, publish, or expose workspace API keys except as required for legitimate widget embedding on your properties.",
        ],
      },
      {
        title: "Spam and misuse",
        paragraphs: [
          "Do not use the Service to send unsolicited marketing at scale, generate artificial traffic, or operate the widget in a way that degrades shared infrastructure for other customers.",
        ],
      },
      {
        title: "Enforcement",
        paragraphs: [
          "We may investigate suspected violations, remove content, throttle usage, suspend workspaces, or terminate accounts without prior notice when necessary to protect the Service, users, or the public.",
          "We may report illegal activity to authorities where required or appropriate.",
          contact,
        ],
      },
    ],
  },
  {
    slug: "accessibility",
    title: "Accessibility Statement",
    summary: "Our commitment to accessible design for the Streammeo dashboard and live chat widget.",
    sections: [
      {
        title: "Commitment",
        paragraphs: [
          "Streammeo aims to make customer support more accessible by offering voice interaction on merchant websites and a usable dashboard for support teams. We are committed to improving accessibility over time.",
        ],
      },
      {
        title: "Standards",
        paragraphs: [
          "We strive to conform with widely recognized accessibility guidelines, including the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA where practicable for the dashboard web application.",
          "Because the widget is voice-first, it complements—but does not replace—text-based support channels. Merchants should offer alternative contact methods for users who cannot or prefer not to use voice.",
        ],
      },
      {
        title: "Dashboard measures",
        paragraphs: [
          "The merchant dashboard uses semantic HTML, visible focus indicators, sufficient color contrast in our design system, and keyboard-navigable controls for core workflows such as sign-in, settings, and session review.",
          "We continue to audit pages for screen-reader compatibility, form labeling, and responsive layouts on common device sizes.",
        ],
      },
      {
        title: "Widget considerations",
        paragraphs: [
          "The embeddable widget uses Shadow DOM to reduce conflicts with host-site styles. The mic control should be reachable via keyboard where supported by the host page context.",
          "Voice interaction may not be suitable for all users or environments. Merchants should provide clear labeling near the widget and maintain non-voice support options.",
        ],
      },
      {
        title: "Known limitations",
        paragraphs: [
          "Real-time voice processing depends on browser microphone permissions, network quality, and third-party speech services. Transcripts may contain recognition errors.",
          "Some advanced dashboard visualizations or playground tools may not yet meet every accessibility criterion. We prioritize fixes based on impact.",
        ],
      },
      {
        title: "Feedback",
        paragraphs: [
          `If you encounter accessibility barriers in the dashboard or widget, contact us at ${LEGAL_CONTACT_EMAIL}. Please include the page URL, assistive technology used (if any), and a description of the issue so we can investigate and improve.`,
          "We aim to acknowledge accessibility feedback within five business days.",
        ],
      },
    ],
  },
  {
    slug: "refund",
    title: "Refund & Return Policy",
    summary: "How cancellations, refunds, and billing disputes work for Streammeo subscriptions and usage-based plans.",
    sections: [
      {
        title: "Scope",
        paragraphs: [
          `${LEGAL_ENTITY} provides digital software only: a merchant dashboard, APIs, and an embeddable voice widget. There are no physical goods to ship or return.`,
          "This policy applies when paid plans or metered billing are offered. During free early access, no charges apply and this policy becomes relevant once you purchase a paid subscription or prepaid usage.",
        ],
      },
      {
        title: "Billing cycles",
        paragraphs: [
          "Paid plans may be billed monthly or annually, or charged based on usage (for example, voice minutes). Pricing, plan limits, and billing intervals will be shown at checkout and in your workspace billing settings before payment is collected.",
          "Subscriptions renew automatically at the end of each billing period unless you cancel before the renewal date. You are responsible for keeping payment details current.",
        ],
      },
      {
        title: "Cancellations",
        paragraphs: [
          "You may cancel a subscription at any time from the dashboard billing settings or by emailing us at " +
            LEGAL_SUPPORT_EMAIL +
            ". Cancellation stops future renewals; it does not delete your account unless you separately request closure.",
          "When you cancel, access to paid features typically continues until the end of the current billing period. We do not provide partial-period credits for unused time unless required by law or explicitly stated at purchase.",
        ],
      },
      {
        title: "Refund eligibility",
        paragraphs: [
          "Because the Service is delivered digitally and begins immediately after purchase, fees are generally non-refundable once a billing period has started or usage has been consumed, except where mandatory consumer law applies.",
          "If you are a consumer in the European Union, European Economic Area, or United Kingdom, you may have a statutory right to withdraw from certain distance contracts within 14 days of purchase. If you request immediate access to the Service during that period, you acknowledge that delivery begins at once and statutory withdrawal rights may be limited once the Service has been fully performed with your consent.",
          "We may offer discretionary refunds for duplicate charges, verified billing errors, prolonged outages caused solely by us, or other exceptional circumstances at our sole discretion.",
        ],
      },
      {
        title: "How to request a refund",
        paragraphs: [
          `Email ${LEGAL_SUPPORT_EMAIL} within 14 days of the charge (or within any longer period required by law). Include your workspace email, invoice or transaction reference, purchase date, and reason for the request.`,
          "We aim to respond within five business days. Approved refunds are returned to the original payment method. Processing times depend on your bank or payment provider and may take 5–10 business days after approval.",
        ],
      },
      {
        title: "Usage-based and prepaid credits",
        paragraphs: [
          "If your plan includes prepaid minutes or credits, unused balances do not roll over unless explicitly stated in the plan description. Expired or consumed usage is not refundable.",
          "If we change plan pricing or limits, we will provide notice where required. Changes apply to subsequent billing periods unless otherwise agreed.",
        ],
      },
      {
        title: "Chargebacks and disputes",
        paragraphs: [
          "Please contact us before initiating a chargeback so we can investigate. Unjustified chargebacks may result in suspension of the workspace while the dispute is resolved.",
        ],
      },
      {
        title: "Account closure",
        paragraphs: [
          "Closing your account does not automatically entitle you to a refund for the current billing period. Data export and deletion requests are handled according to our Privacy Policy.",
          contact,
        ],
      },
    ],
  },
  {
    slug: "impressum",
    title: "Impressum",
    summary: "Legal disclosure for website operators in Germany, Austria, and other jurisdictions that require provider identification.",
    sections: [
      {
        title: "Information according to § 5 DDG (Germany)",
        paragraphs: [
          LEGAL_COMPANY_NAME,
          ...LEGAL_ADDRESS_LINES,
          LEGAL_WEBSITE,
        ],
      },
      {
        title: "Contact",
        paragraphs: [
          `Email: ${LEGAL_CONTACT_EMAIL}`,
          `Support: ${LEGAL_SUPPORT_EMAIL}`,
          `Phone: ${LEGAL_CONTACT_PHONE}`,
        ],
      },
      {
        title: "Represented by",
        paragraphs: [LEGAL_RESPONSIBLE_PERSON],
      },
      {
        title: "Register entry",
        paragraphs: [LEGAL_REGISTER],
      },
      {
        title: "VAT identification number",
        paragraphs: [LEGAL_VAT_ID],
      },
      {
        title: "Responsible for content (§ 18 Abs. 2 MStV)",
        paragraphs: [
          LEGAL_RESPONSIBLE_PERSON,
          ...LEGAL_ADDRESS_LINES,
        ],
      },
      {
        title: "Dispute resolution",
        paragraphs: [
          "The European Commission provides an online dispute resolution platform at https://ec.europa.eu/consumers/odr/. We are not obliged or willing to participate in dispute resolution proceedings before a consumer arbitration board unless required by applicable law.",
          "For service issues, contact us first at " + LEGAL_SUPPORT_EMAIL + " so we can resolve your concern directly.",
        ],
      },
      {
        title: "Liability for content and links",
        paragraphs: [
          "We create the content on our pages with care but cannot guarantee completeness or accuracy. Obligations to remove or block use of information under general law remain unaffected.",
          "Our site may contain links to external websites. We have no influence over their content and assume no liability for external content. The respective provider is responsible for linked pages.",
        ],
      },
    ],
  },
];

export function getLegalPolicy(slug: string): LegalPolicy | undefined {
  return LEGAL_POLICIES.find((p) => p.slug === slug);
}
