import type { Database } from "better-sqlite3";
import type { UserDTO } from "../entities";
import { toUserDTO } from "../mappers";

function normEmail(e: string): string {
  return e.toLowerCase().trim();
}

export class UsersRepo {
  constructor(private readonly db: Database) {}

  async findById(id: string): Promise<UserDTO | null> {
    const row = this.db
      .prepare(
        `SELECT id, email, password, created_at AS createdAt FROM users WHERE id = ?`,
      )
      .get(id) as Record<string, unknown> | undefined;
    return row ? toUserDTO(row) : null;
  }

  async findByEmail(email: string): Promise<UserDTO | null> {
    const row = this.db
      .prepare(
        `SELECT id, email, password, created_at AS createdAt FROM users WHERE email = ?`,
      )
      .get(normEmail(email)) as Record<string, unknown> | undefined;
    return row ? toUserDTO(row) : null;
  }

  async createIfAbsent(user: Readonly<{ id: string; email: string; password: string; createdAt: string }>): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO users (id, email, password, created_at) VALUES (@id, @email, @password, @createdAt)`,
      )
      .run({
        id: user.id,
        email: normEmail(user.email),
        password: user.password,
        createdAt: user.createdAt,
      });
  }

  async deleteByEmail(email: string): Promise<void> {
    this.db.prepare(`DELETE FROM users WHERE email = ?`).run(normEmail(email));
  }
}
