import bcrypt from "bcryptjs";
import type { MemberRole } from "../src/types.js";
import {
  createMembership,
  createTicketComment,
  createTicketEvent,
  createTicketRecord,
  createUser,
  createWorkspace,
  getUserByEmail,
  getWorkspaceBySlug,
  listAllTickets,
  updateWorkspace,
} from "../src/index.js";
import { newId, nowIso, putItem } from "../src/store.js";
import { workspacePk } from "../src/tickets.js";

const DEMO_PASSWORD = "password123";

const SEED_USERS: Array<{ email: string; name: string; role: MemberRole }> = [
  { email: "admin@streammeo.com", name: "Demo Admin", role: "admin" },
  { email: "manager@streammeo.com", name: "Demo Manager", role: "manager" },
  { email: "agent@streammeo.com", name: "Demo Agent", role: "agent" },
];

async function main(): Promise<void> {
  const existing = await getUserByEmail("admin@streammeo.com");
  if (existing) {
    console.log("Seed already applied (admin@streammeo.com exists).");
    return;
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const users = await Promise.all(
    SEED_USERS.map((u) =>
      createUser({
        email: u.email,
        password: passwordHash,
        name: u.name,
      }),
    ),
  );

  const userByEmail = new Map(users.map((u, i) => [SEED_USERS[i]!.email, u]));
  const admin = userByEmail.get("admin@streammeo.com")!;
  const agent = userByEmail.get("agent@streammeo.com")!;

  const workspace = await createWorkspace({
    name: "Acme Support",
    slug: "acme-support",
    plan: "growth",
    ticketsLimit: 5000,
    aiRepliesLimit: 500,
  });

  for (const seedUser of SEED_USERS) {
    const user = userByEmail.get(seedUser.email)!;
    await createMembership({
      workspaceId: workspace.id,
      userId: user.id,
      role: seedUser.role,
    });
  }

  const inboxId = newId();
  const slaStandardId = newId();
  const slaUrgentId = newId();
  const createdAt = nowIso();

  await putItem({
    pk: workspacePk(workspace.id),
    sk: `INBOX#${inboxId}`,
    entityType: "inbox",
    id: inboxId,
    workspaceId: workspace.id,
    name: "Support",
    email: "support@acme.com",
    channel: "email",
    isDefault: true,
    autoResponderEnabled: true,
    autoResponderMessage:
      "Thanks for reaching out. We've received your message and will respond shortly.",
    businessHoursStart: null,
    businessHoursEnd: null,
    routingRules: [],
    createdAt,
    gsi1pk: "INBOX_EMAIL#support@acme.com",
    gsi1sk: `WORKSPACE#${workspace.id}#${inboxId}`,
  });

  await putItem({
    pk: workspacePk(workspace.id),
    sk: `SLA#${slaStandardId}`,
    entityType: "sla_policy",
    id: slaStandardId,
    workspaceId: workspace.id,
    name: "Standard",
    firstResponseMinutes: 240,
    resolutionMinutes: 1440,
    priority: null,
    isDefault: true,
  });

  await putItem({
    pk: workspacePk(workspace.id),
    sk: `SLA#${slaUrgentId}`,
    entityType: "sla_policy",
    id: slaUrgentId,
    workspaceId: workspace.id,
    name: "Urgent",
    firstResponseMinutes: 60,
    resolutionMinutes: 480,
    priority: "urgent",
    isDefault: false,
  });

  for (const tag of [
    { name: "billing", color: "#FACC15" },
    { name: "bug", color: "#F87171" },
    { name: "feature-request", color: "#4ADE80" },
  ]) {
    const id = newId();
    await putItem({
      pk: workspacePk(workspace.id),
      sk: `TAG#${id}`,
      entityType: "tag",
      id,
      workspaceId: workspace.id,
      ...tag,
    });
  }

  const cannedId = newId();
  await putItem({
    pk: workspacePk(workspace.id),
    sk: `CANNED#${cannedId}`,
    entityType: "canned_response",
    id: cannedId,
    workspaceId: workspace.id,
    title: "Acknowledge receipt",
    body: "Hi {{customer_name}},\n\nThanks for contacting us. We're looking into your request and will update you soon.\n\nBest,\n{{agent_name}}",
  });

  const tickets = [
    {
      subject: "Cannot reset password",
      status: "open" as const,
      priority: "high" as const,
      requesterEmail: "customer1@example.com",
      requesterName: "Jane Doe",
      body: "I tried resetting my password three times but never received the email.",
      assigneeId: agent.id,
    },
    {
      subject: "Invoice missing line item",
      status: "new" as const,
      priority: "normal" as const,
      requesterEmail: "billing@corp.io",
      requesterName: "Alex Kim",
      body: "Our March invoice is missing the enterprise add-on we purchased last week.",
      assigneeId: null,
    },
    {
      subject: "Feature request: dark mode",
      status: "pending" as const,
      priority: "low" as const,
      requesterEmail: "dev@startup.co",
      requesterName: "Sam Patel",
      body: "Would love a dark mode option in the agent dashboard.",
      assigneeId: agent.id,
    },
  ];

  for (const t of tickets) {
    const ticket = await createTicketRecord({
      workspaceId: workspace.id,
      inboxId,
      slaPolicyId: slaStandardId,
      subject: t.subject,
      requesterEmail: t.requesterEmail,
      requesterName: t.requesterName,
      priority: t.priority,
      status: t.status,
      assigneeId: t.assigneeId,
    });
    await createTicketComment({
      ticketId: ticket.id,
      body: t.body,
      visibility: "public",
      isEmail: true,
    });
    await createTicketEvent({
      ticketId: ticket.id,
      actorId: admin.id,
      eventType: "ticket.created",
      payload: { channel: "email" },
    });
  }

  const ws = await getWorkspaceBySlug("acme-support");
  if (ws) {
    const count = (await listAllTickets(ws.id)).length;
    await updateWorkspace(ws.id, { ticketsUsed: count, lastTicketNumber: 1003 });
  }

  console.log("Seed complete — Acme Support workspace\n");
  console.log(`Password for all accounts: ${DEMO_PASSWORD}\n`);
  for (const seedUser of SEED_USERS) {
    console.log(`  ${seedUser.role.padEnd(7)}  ${seedUser.email.padEnd(24)}  ${seedUser.name}`);
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
