// index.mjs
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import candidateRoutes from "./apps/candidate/routers/candidate.route.js";
import { errorHandler, notFoundHandler } from "../src/middleware/error.middleware.js";
import authRoutes from "./apps/auth/routers/auth.route.js";
import examRoutes from "./apps/exam/routers/exam.route.js";
dotenv.config();

class Server {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3300;
    this.connectDB();
    this.middlewares();
    this.routes();
    this.errorHandling();
  }

  async connectDB() {
    try {
      await mongoose.connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log("MongoDB connected");
    } catch (err) {
      console.error("MongoDB connection error:", err);
      process.exit(1);
    }
  }

  middlewares() {
    this.app.use(cors());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
  }

  routes() {
    this.app.use("/api/candidates", candidateRoutes);
    this.app.use("/api/auth", authRoutes);
    this.app.use("/api/exam", examRoutes);
    
    // Health check route
    this.app.get("/health", (req, res) => {
      res.status(200).json({ 
        success: true, 
        message: "Server is running", 
        timestamp: new Date().toISOString() 
      });
    });
  }

  errorHandling() {
    this.app.use(notFoundHandler);
    this.app.use(errorHandler);
  }

  listen() {
    this.app.listen(this.port, () => {
      console.log(`Server running on port ${this.port}`);
    });
  }
}

const server = new Server();
server.listen();