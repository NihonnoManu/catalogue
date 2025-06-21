import dotenv from 'dotenv';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";


// Load environment variables from .env file
dotenv.config();


console.log(process.env) // remove this after you've confirmed it is working


