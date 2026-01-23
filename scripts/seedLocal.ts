import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { POPULATED_DATA } from "./seedData";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const run = async () => {
  const targetPath = path.resolve(__dirname, "..", "master_data_backup.json");
  const payload = {
    ...POPULATED_DATA,
    exportDate: new Date().toISOString(),
    version: "0.4"
  };

  await writeFile(targetPath, JSON.stringify(payload, null, 2), "utf8");
  console.log(`Seed data skrevet til ${targetPath}`);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
