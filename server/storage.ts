import { User, InsertUser, AccessCode, InsertAccessCode, users, accessCodes, scanLogs, InsertScanLog, ScanLog } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import session from "express-session";
import createMemoryStore from "memorystore";
import { desc } from "drizzle-orm";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAccessCode(code: string): Promise<AccessCode | undefined>;
  createAccessCode(code: InsertAccessCode): Promise<AccessCode>;
  clearAccessCodes(): Promise<void>;
  createScanLog(log: InsertScanLog): Promise<ScanLog>;
  getScanLogs(): Promise<ScanLog[]>;
  getScanLogsForCode(code: string): Promise<ScanLog[]>; // Add this line
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });

    // Create default users if they don't exist
    this.initializeDefaultUsers();
  }

  private async initializeDefaultUsers() {
    const securityUser = await this.getUserByUsername("Security");
    const authorizerUser = await this.getUserByUsername("Authorizer");
    const controllerUser = await this.getUserByUsername("Access Controller");

    if (!securityUser) {
      await this.createUser({
        username: "Security",
        password: "Sicurezza123",
        role: "security",
      });
    }

    if (!authorizerUser) {
      await this.createUser({
        username: "Authorizer",
        password: "Autorizzatore123",
        role: "authorizer",
      });
    }

    if (!controllerUser) {
      await this.createUser({
        username: "Access Controller",
        password: "Controllore123",
        role: "controller",
      });
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getAccessCode(code: string): Promise<AccessCode | undefined> {
    // Normalize the code before querying
    const normalizedCode = code.trim().toUpperCase();
    console.log("Looking for normalized code:", normalizedCode);

    const [accessCode] = await db
      .select()
      .from(accessCodes)
      .where(eq(accessCodes.code, normalizedCode))
      .orderBy(desc(accessCodes.uploadedAt))
      .limit(1);

    console.log("Found access code:", accessCode);
    return accessCode;
  }

  async createAccessCode(code: InsertAccessCode): Promise<AccessCode> {
    // Normalize the code before saving
    const normalizedCode = {
      ...code,
      code: code.code.trim().toUpperCase(),
      personName: code.personName.trim()
    };

    console.log("Creating normalized access code:", normalizedCode);

    const [accessCode] = await db
      .insert(accessCodes)
      .values(normalizedCode)
      .returning();
    return accessCode;
  }

  async clearAccessCodes(): Promise<void> {
    // Instead of clearing, we rely on the timestamp to get the most recent codes
    // This maintains the history of all uploads
  }

  async createScanLog(log: InsertScanLog): Promise<ScanLog> {
    // Normalize the code before saving the log
    const normalizedLog = {
      ...log,
      code: log.code.trim().toUpperCase()
    };

    const [scanLog] = await db
      .insert(scanLogs)
      .values(normalizedLog)
      .returning();
    return scanLog;
  }

  async getScanLogs(): Promise<ScanLog[]> {
    return await db
      .select()
      .from(scanLogs)
      .orderBy(desc(scanLogs.scannedAt));
  }

  async getScanLogsForCode(code: string): Promise<ScanLog[]> {
    const normalizedCode = code.trim().toUpperCase();
    return await db
      .select()
      .from(scanLogs)
      .where(eq(scanLogs.code, normalizedCode))
      .orderBy(desc(scanLogs.scannedAt));
  }
}

export const storage = new DatabaseStorage();