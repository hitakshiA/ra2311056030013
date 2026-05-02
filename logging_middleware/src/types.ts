export type Stack = "backend" | "frontend";

export type Level = "debug" | "info" | "warn" | "error" | "fatal";

export type BackendPackage =
  | "cache"
  | "controller"
  | "cron_job"
  | "db"
  | "domain"
  | "handler"
  | "repository"
  | "route"
  | "service";

export type SharedPackage = "auth" | "config" | "middleware" | "utils";

export type LogPackage = BackendPackage | SharedPackage;

export interface LoggerCredentials {
  email: string;
  name: string;
  rollNo: string;
  accessCode: string;
  clientID: string;
  clientSecret: string;
}

export interface LoggerConfig extends LoggerCredentials {
  baseUrl: string;
}

export interface AuthEnvelope {
  token_type: string;
  access_token: string;
  expires_in: number;
}

export interface LogPayload {
  stack: Stack;
  level: Level;
  package: LogPackage;
  message: string;
}
