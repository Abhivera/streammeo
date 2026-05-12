import type { Collection, Db } from "mongodb";
import type { UserDTO } from "../entities";
import { toUserDTO } from "../mappers";

type UserDoc = Readonly<{
  _id: string;
  email: string;
  password: string;
  createdAt: string;
  firebaseUid?: string;
}>;

function normEmail(e: string): string {
  return e.toLowerCase().trim();
}

export class UsersRepo {
  private readonly coll: Collection<UserDoc>;

  constructor(db: Db) {
    this.coll = db.collection<UserDoc>("users");
  }

  async findById(id: string): Promise<UserDTO | null> {
    const doc = await this.coll.findOne({ _id: id });
    return doc
      ? toUserDTO({
          id: doc._id,
          email: doc.email,
          password: doc.password,
          createdAt: doc.createdAt,
          ...(doc.firebaseUid ? { firebaseUid: doc.firebaseUid } : {}),
        })
      : null;
  }

  async findByEmail(email: string): Promise<UserDTO | null> {
    const doc = await this.coll.findOne({ email: normEmail(email) });
    return doc
      ? toUserDTO({
          id: doc._id,
          email: doc.email,
          password: doc.password,
          createdAt: doc.createdAt,
          ...(doc.firebaseUid ? { firebaseUid: doc.firebaseUid } : {}),
        })
      : null;
  }

  async findByFirebaseUid(firebaseUid: string): Promise<UserDTO | null> {
    const doc = await this.coll.findOne({ firebaseUid });
    return doc
      ? toUserDTO({
          id: doc._id,
          email: doc.email,
          password: doc.password,
          createdAt: doc.createdAt,
          firebaseUid: doc.firebaseUid,
        })
      : null;
  }

  async createIfAbsent(
    user: Readonly<{
      id: string;
      email: string;
      password: string;
      createdAt: string;
      firebaseUid?: string;
    }>,
  ): Promise<void> {
    await this.coll.insertOne({
      _id: user.id,
      email: normEmail(user.email),
      password: user.password,
      createdAt: user.createdAt,
      ...(user.firebaseUid ? { firebaseUid: user.firebaseUid } : {}),
    });
  }

  async setFirebaseUid(userId: string, firebaseUid: string): Promise<void> {
    await this.coll.updateOne({ _id: userId }, { $set: { firebaseUid } });
  }

  async deleteByEmail(email: string): Promise<void> {
    await this.coll.deleteMany({ email: normEmail(email) });
  }
}
