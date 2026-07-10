import { createList, createTask, createIdea, db } from './db';

// e2e seeding hook; dev server only, never in production builds
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__tudu = { createList, createTask, createIdea, db };
}
export {};
