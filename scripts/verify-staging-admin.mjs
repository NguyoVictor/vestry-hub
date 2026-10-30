
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const project = "xwbajophstetbnnemsyq";
const expectedUserId = "4cb0c021-06c8-4b0c-ba52-ff2128a24344";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8")
    .split("\n")
    .map(line => line.trim())
    .filter(line => line && !line.startsWith("#") && line.includes("="))
    .map(line => {
      const index = line.indexOf("=");
      return [
        line.slice(0, index),
        line.slice(index + 1).replace(/^["']|["']$/g, "")
      ];
    })
);

const url = env.VITE_SUPABASE_URL;
const key =
  env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error("Missing staging Supabase configuration");
}

if (new URL(url).hostname !== `${project}.supabase.co`) {
  throw new Error("Refusing non-staging Supabase project");
}

const state = JSON.parse(
  fs.readFileSync("playwright/.auth/staging-admin.json", "utf8")
);

const storage = state.origins
  .find(origin => origin.origin === "http://127.0.0.1:4173")
  ?.localStorage ?? [];

const storedSession = storage.find(
  entry => entry.name === `sb-${project}-auth-token`
);

if (!storedSession) {
  throw new Error("Administrator Supabase Auth session not found");
}

const session = JSON.parse(storedSession.value);
const token = session.access_token;

if (!token) {
  throw new Error("Administrator access token is missing");
}

const supabase = createClient(url, key, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

const { data, error } = await supabase.auth.getUser(token);

if (error) {
  console.error("Backend verification failed:", error.message);
  process.exit(1);
}

const correctUser = data.user?.id === expectedUserId;

console.table({
  backendAuthenticated: Boolean(data.user),
  correctAdministrator: correctUser
});

if (!correctUser) {
  process.exit(1);
}
