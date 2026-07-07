import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for Google Sheets proxy (bypasses browser CORS / sandbox policies)
  app.get("/api/sheets-data", async (req, res) => {
    try {
      const { spreadsheetId, sheetName } = req.query;
      if (!spreadsheetId || !sheetName) {
        return res.status(400).json({ error: "Missing spreadsheetId or sheetName" });
      }

      const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName as string)}`;
      
      console.log(`[Proxy] Fetching Google Sheets data from: ${url}`);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Google Sheets responded with status ${response.status}`);
      }
      
      const text = await response.text();
      res.setHeader("Content-Type", "text/plain");
      return res.send(text);
    } catch (error: any) {
      console.error("[Proxy Error] Failed to fetch sheets-data:", error);
      return res.status(500).json({ error: error.message || "Failed to fetch sheet data" });
    }
  });

  // API Route for Google Apps Script Web App saving/handling transactions
  app.post("/api/save-transaction", async (req, res) => {
    try {
      const { webAppUrl, transaction, action, idTransaksi } = req.body;
      if (!webAppUrl) {
        return res.status(400).json({ error: "Missing webAppUrl" });
      }

      const reqAction = action || "saveTransaction";
      console.log(`[Proxy] Sending action ${reqAction} to Web App: ${webAppUrl}`);

      const payload: any = {
        action: reqAction
      };

      if (transaction) {
        payload.transaction = transaction;
      }
      if (idTransaksi) {
        payload.idTransaksi = idTransaksi;
      }

      const response = await fetch(webAppUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const text = await response.text();
      return res.send(text);
    } catch (error: any) {
      console.error("[Proxy Error] Failed to process sheet transaction action:", error);
      return res.status(500).json({ error: error.message || "Failed to process sheet transaction action" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
