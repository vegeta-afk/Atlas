const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// ========== CRITICAL: Add these lines ==========
// Body parsing middleware MUST come before routes
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
// ===============================================

// CORS middleware
app.use(
  cors({
    origin: "http://localhost:5173", // Your React app URL
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  })
);

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  console.log("Request body:", req.body); // Add this to see what's being received
  next();
});

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("✅ MongoDB Connected Successfully");
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });

// Import routes
const authRoutes = require("./routes/authRoutes");
const enquiryRoutes = require("./routes/enquiryRoutes");
const admissionRoutes = require("./routes/admissionRoutes");
const courseRoutes = require("./routes/courseRoutes");
const setupRoutes = require("./routes/setupRoutes");
const facultyRoutes = require("./routes/facultyRoutes");
const studentRoutes = require("./routes/studentRoutes");
const attendanceRoutes = require('./routes/attendance.routes');
const questionRoutes = require('./routes/questionRoutes');
const testRouter = require('./routes/testRoutes');
const batchTransferRoutes = require('./routes/batchTransferRoutes');
const reportRoutes = require("./routes/reportRoutes");
const examReportRoutes = require("./routes/examReportRoutes");
const courseConversionRoutes = require("./routes/courseConversionRoutes");
const courseExtensionRoutes = require("./routes/courseExtensionRoutes");
const callLogRoutes = require("./routes/callLogRoutes");


// Use routes
app.use("/api/auth", authRoutes);
app.use("/api/enquiries", enquiryRoutes);
app.use("/api/admissions", admissionRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/setup", setupRoutes);
app.use("/api/faculty", facultyRoutes);
app.use("/api/students", studentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/exam/questions', questionRoutes);
app.use('/api/exam/tests', testRouter);
app.use('/api/batch-transfers', batchTransferRoutes);
app.use("/api/reports/exams", examReportRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/course-conversion", courseConversionRoutes);
app.use("/api/course-extension", courseExtensionRoutes);
app.use("/api/call-logs", callLogRoutes);
app.use("/api/call-logs", require("./routes/callLogRoutes"));
app.use('/api/tests', testRouter);


// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

// Test endpoint to verify body parsing works
app.post("/api/test-body", (req, res) => {
  console.log("Test endpoint body:", req.body);
  res.json({
    success: true,
    message: "Body parsing test",
    received: req.body,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    requestedUrl: req.originalUrl,
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server error:", err.stack);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});


// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🧪 Body test: POST http://localhost:${PORT}/api/test-body`);
  console.log(`🔐 Auth API: http://localhost:${PORT}/api/auth`);
});

console.log("\n" + "=".repeat(50));
console.log("📋 ALL REGISTERED ROUTES");
console.log("=".repeat(50));

function listRoutes(stack, basePath = '') {
  stack.forEach(layer => {
    if (layer.route) {
      // This is a route
      const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
      console.log(`${methods} ${basePath}${layer.route.path}`);
    } else if (layer.name === 'router' && layer.handle.stack) {
      // This is a router - recursively list its routes
      const routerPath = layer.regexp.source
        .replace('\\/?(?=\\/|$)', '')
        .replace(/^\^\\/, '')
        .replace(/\\\//g, '/');
      listRoutes(layer.handle.stack, basePath + routerPath);
    }
  });
}

listRoutes(app._router.stack);
console.log("=".repeat(50));

