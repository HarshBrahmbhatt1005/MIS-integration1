import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";

import Application from "./models/Application.js";
import exportToExcel from "./ExportToExcel.js";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

/* ================================
   🔹 Excel Export Route
================================ */
app.get("/api/export/excel", async (req, res) => {
  const { password, ref } = req.query;

  try {
    let expectedPass;

    if (ref && ref !== "All") {
      // Sales name ke hisab se env variable check
      const refKey = ref.toUpperCase().replace(/ /g, "_") + "_PASSWORD";
      expectedPass = process.env[refKey];
    } else {
      // All download ke liye master password
      expectedPass = process.env.DOWNLOAD_PASSWORD;
    }

    if (!password || password !== expectedPass) {
      return res.status(401).json({ error: "Unauthorized: Invalid password" });
    }

    // ✅ Query
    const query = ref && ref !== "All" ? { sales: ref } : {};
    const apps = await Application.find(query);

    // ✅ Export Excel
    const filePath = await exportToExcel(apps, ref || "All");
    res.download(filePath, `applications_${ref || "All"}.xlsx`);
  } catch (err) {
    console.error("❌ Excel Export Error:", err);
    res.status(500).json({ error: "Excel export failed" });
  }
});

/* ================================
   🔹 Create New Application
================================ */
app.post("/api/applications", async (req, res) => {
  try {
    const newApp = new Application(req.body);
    await newApp.save();
    res.status(201).json(newApp);
  } catch (err) {
    console.error("❌ Save Error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ================================
   🔹 Get All Applications
================================ */
app.get("/api/applications", async (req, res) => {
  try {
    const apps = await Application.find();
    res.json(apps);
  } catch (err) {
    console.error("❌ Fetch Error:", err);
    res.status(500).json({ error: "Fetch failed" });
  }
});

/* ================================
   🔹 Update Application by ID
================================ */
app.put("/api/applications/:id", async (req, res) => {
  try {
    const updatedApp = await Application.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedApp) {
      return res.status(404).json({ error: "Application not found" });
    }
    res.json(updatedApp);
  } catch (err) {
    console.error("❌ Update Error:", err);
    res.status(500).json({ error: "Update failed" });
  }
});

/* ================================
   🔹 Approve Application
================================ */
// ✅ Approve API
app.patch("/api/applications/:id/approve", async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;

  if (password !== process.env.APPROVAL_PASSWORD) {
    return res.status(401).json({ error: "Invalid password" });
  }

  try {
    await Application.findByIdAndUpdate(id, { approvalStatus: "Approved by SB" });
    res.json({ message: "Application approved successfully" });
  } catch (err) {
    console.error("Approval error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
/* ================================
   🔹 Reject Application
================================ */
app.patch("/api/applications/:id/reject", async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;

  if (password !== process.env.APPROVAL_PASSWORD) {
    return res.status(401).json({ error: "Invalid password" });
  }

  try {
    await Application.findByIdAndUpdate(id, { approvalStatus: "Rejected by SB" });
    res.json({ message: "Application rejected successfully" });
  } catch (err) {
    console.error("Reject error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================================
   🔹 MongoDB Connection
================================ */
mongoose
  .connect("mongodb://127.0.0.1:27017/employeelogin", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err));

/* ================================
   🔹 Start Server
================================ */
app.listen(5000, () => console.log("🚀 Server running on port 5000"));
