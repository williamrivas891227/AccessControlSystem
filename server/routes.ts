import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import multer from "multer";
import * as XLSX from "xlsx";
import { formatInTimeZone } from "date-fns-tz";
import { desc } from "drizzle-orm";
import { ScanLog } from "@shared/schema";

const upload = multer({ storage: multer.memoryStorage() });

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  app.post("/api/upload", upload.single("file"), async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "authorizer") {
      return res.sendStatus(403);
    }

    if (!req.file) {
      return res.status(400).send("No file uploaded");
    }

    try {
      const workbook = XLSX.read(req.file.buffer);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<{A: string, B: any, C: string}>(sheet, { header: ["A", "B", "C"] });

      console.log("Processing uploaded codes:", data);

      await storage.clearAccessCodes();

      for (const row of data) {
        if (!row.A) continue;

        const code = row.A.toString().trim().toUpperCase();
        const personName = row.C?.toString().trim() || "N/A";
        console.log("Processing code:", code, "Person:", personName);

        if (code && code.length === 8) {
          await storage.createAccessCode({
            code,
            personName,
            uploadedBy: req.user.id,
          });
          console.log("Successfully saved code:", code);
        } else {
          console.log("Invalid code:", code, "Length:", code?.length);
        }
      }

      res.sendStatus(200);
    } catch (error) {
      console.error("Error processing Excel file:", error);
      res.status(400).send("Invalid Excel file");
    }
  });

  app.post("/api/verify", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "security") {
      return res.sendStatus(403);
    }

    const { code } = req.body;
    if (!code || typeof code !== "string") {
      return res.status(400).send("Invalid code");
    }

    const normalizedCode = code.trim().toUpperCase();
    console.log("Verifying normalized code:", normalizedCode);

    const accessCode = await storage.getAccessCode(normalizedCode);
    console.log("Access code found:", accessCode);
    const authorized = !!accessCode;

    const previousLogs = await storage.getScanLogsForCode(normalizedCode);
    const isEntry = (previousLogs.length % 2) === 0;

    // Only return if the code is valid, don't create log yet
    res.json({
      authorized,
      type: isEntry ? 'Entry' : 'Exit',
      code: normalizedCode, // Add this to use in the authorization step
      personName: accessCode?.personName || 'Unknown Person' // Add person name to response
    });
  });

  app.post("/api/authorize", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "security") {
      return res.sendStatus(403);
    }

    const { code, authorized } = req.body;
    if (!code || typeof code !== "string" || typeof authorized !== "boolean") {
      return res.status(400).send("Invalid request");
    }

    const normalizedCode = code.trim().toUpperCase();
    const previousLogs = await storage.getScanLogsForCode(normalizedCode);
    const isEntry = (previousLogs.length % 2) === 0;
    
    // Get the access code to retrieve the person name
    const accessCode = await storage.getAccessCode(normalizedCode);
    const personName = accessCode?.personName || 'Unknown Person';

    // Create scan log with security's decision
    await storage.createScanLog({
      code: normalizedCode,
      scannedBy: req.user.id,
      authorized,
    });

    res.json({
      authorized,
      type: isEntry ? 'Entry' : 'Exit',
      personName: personName // Include person name in the response
    });
  });

  app.get("/api/scanlogs/download", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "controller") {
      return res.sendStatus(403);
    }

    // Get all logs ordered by scan time
    const logs = await storage.getScanLogs();

    // Filter only authorized scans
    const authorizedLogs = logs.filter(log => log.authorized);

    // Group logs by code and sort by timestamp
    const groupedLogs = new Map<string, typeof authorizedLogs>();
    authorizedLogs.forEach(log => {
      const existingLogs = groupedLogs.get(log.code) || [];
      existingLogs.push(log);
      groupedLogs.set(log.code, existingLogs);
    });

    // Process logs to determine entry/exit status
    const processedLogs: Array<{
      'QR Code': string;
      'Person Name': string;
      'Date': string;
      'Time': string;
      'Type': 'Entry' | 'Exit';
      timestamp: Date;
    }> = [];

    // Process each code's logs
    for (const [_, codeLogs] of Array.from(groupedLogs.entries())) {
      // Sort logs for this code by timestamp
      codeLogs.sort((a: ScanLog, b: ScanLog) => a.scannedAt.getTime() - b.scannedAt.getTime());

      // Process each log
      for (const log of codeLogs) {
        const accessCode = await storage.getAccessCode(log.code);
        processedLogs.push({
          'QR Code': log.code,
          'Person Name': accessCode?.personName || 'N/A',
          'Date': formatInTimeZone(log.scannedAt, 'America/Toronto', 'dd/MM/yyyy'),
          'Time': formatInTimeZone(log.scannedAt, 'America/Toronto', 'HH:mm:ss'),
          'Type': processedLogs.filter(pl => pl['QR Code'] === log.code).length % 2 === 0 ? 'Entry' : 'Exit',
          timestamp: log.scannedAt,
        });
      }
    }

    // Sort all processed logs by timestamp in descending order (most recent first)
    processedLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Remove timestamp field before creating Excel file
    const excelLogs = processedLogs.map(({ timestamp, ...rest }) => rest);

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(excelLogs);

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, "Scan Logs");

    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Set headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=scan_logs.xlsx');

    res.send(buffer);
  });

  const httpServer = createServer(app);
  return httpServer;
}