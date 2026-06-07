import bcrypt from "bcryptjs";
import { prisma } from "../src/index.js";

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash("password123", 10);

  const user = await prisma.user.upsert({
    where: { email: "demo@streammeo.com" },
    update: {},
    create: {
      email: "demo@streammeo.com",
      password: passwordHash,
      name: "Demo Agent",
    },
  });

  const workspace = await prisma.workspace.upsert({
    where: { slug: "acme-support" },
    update: {},
    create: {
      name: "Acme Support",
      slug: "acme-support",
      plan: "growth",
      ticketsLimit: 5000,
      aiRepliesLimit: 500,
      members: {
        create: {
          userId: user.id,
          role: "admin",
        },
      },
      inboxes: {
        create: {
          name: "Support",
          email: "support@acme.com",
          isDefault: true,
          autoResponderEnabled: true,
          autoResponderMessage:
            "Thanks for reaching out. We've received your message and will respond shortly.",
        },
      },
      slaPolicies: {
        create: [
          {
            name: "Standard",
            firstResponseMinutes: 240,
            resolutionMinutes: 1440,
            isDefault: true,
          },
          {
            name: "Urgent",
            firstResponseMinutes: 60,
            resolutionMinutes: 480,
            priority: "urgent",
          },
        ],
      },
      tags: {
        create: [
          { name: "billing", color: "#FACC15" },
          { name: "bug", color: "#F87171" },
          { name: "feature-request", color: "#4ADE80" },
        ],
      },
      cannedResponses: {
        create: [
          {
            title: "Acknowledge receipt",
            body: "Hi {{customer_name}},\n\nThanks for contacting us. We're looking into your request and will update you soon.\n\nBest,\n{{agent_name}}",
          },
        ],
      },
    },
    include: { inboxes: true, slaPolicies: true, tags: true },
  });

  const defaultInbox = workspace.inboxes[0];
  const defaultSla = workspace.slaPolicies.find((p) => p.isDefault) ?? workspace.slaPolicies[0];

  const existingCount = await prisma.ticket.count({ where: { workspaceId: workspace.id } });
  if (existingCount === 0) {
    const tickets = [
      {
        number: 1001,
        subject: "Cannot reset password",
        status: "open" as const,
        priority: "high" as const,
        requesterEmail: "customer1@example.com",
        requesterName: "Jane Doe",
        body: "I tried resetting my password three times but never received the email.",
      },
      {
        number: 1002,
        subject: "Invoice missing line item",
        status: "new" as const,
        priority: "normal" as const,
        requesterEmail: "billing@corp.io",
        requesterName: "Alex Kim",
        body: "Our March invoice is missing the enterprise add-on we purchased last week.",
      },
      {
        number: 1003,
        subject: "Feature request: dark mode",
        status: "pending" as const,
        priority: "low" as const,
        requesterEmail: "dev@startup.co",
        requesterName: "Sam Patel",
        body: "Would love a dark mode option in the agent dashboard.",
      },
    ];

    for (const t of tickets) {
      await prisma.ticket.create({
        data: {
          workspaceId: workspace.id,
          inboxId: defaultInbox?.id,
          slaPolicyId: defaultSla?.id,
          number: t.number,
          subject: t.subject,
          status: t.status,
          priority: t.priority,
          requesterEmail: t.requesterEmail,
          requesterName: t.requesterName,
          assigneeId: t.status !== "new" ? user.id : null,
          comments: {
            create: {
              body: t.body,
              visibility: "public",
              isEmail: true,
            },
          },
          events: {
            create: {
              eventType: "ticket.created",
              actorId: user.id,
              payload: { channel: "email" },
            },
          },
        },
      });
    }

    await prisma.workspace.update({
      where: { id: workspace.id },
      data: { ticketsUsed: tickets.length },
    });
  }

  console.log("Seed complete:");
  console.log("  Email:    demo@streammeo.com");
  console.log("  Password: password123");
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
