import {
  createWorkspaceForUser as createWorkspaceForUserDb,
  type Workspace,
} from "@streammeo/db";

export async function createWorkspaceForUser(input: {
  userId: string;
  workspaceName: string;
}): Promise<Workspace> {
  return createWorkspaceForUserDb(input);
}
