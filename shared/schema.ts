import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull(),
});

export const accessCodes = pgTable("access_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull(),
  personName: text("person_name").notNull(), // Aggiunto campo per il nome
  uploadedBy: integer("uploaded_by").notNull(),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
});

export const scanLogs = pgTable("scan_logs", {
  id: serial("id").primaryKey(),
  code: text("code").notNull(),
  scannedBy: integer("scanned_by").notNull(),
  scannedAt: timestamp("scanned_at").notNull().defaultNow(),
  authorized: boolean("authorized").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  role: true,
});

export const insertAccessCodeSchema = createInsertSchema(accessCodes).pick({
  code: true,
  personName: true, // Aggiunto al schema
  uploadedBy: true,
});

export const insertScanLogSchema = createInsertSchema(scanLogs).pick({
  code: true,
  scannedBy: true,
  authorized: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type AccessCode = typeof accessCodes.$inferSelect;
export type InsertAccessCode = z.infer<typeof insertAccessCodeSchema>;
export type ScanLog = typeof scanLogs.$inferSelect;
export type InsertScanLog = z.infer<typeof insertScanLogSchema>;