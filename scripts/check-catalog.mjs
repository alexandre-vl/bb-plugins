import { access, readdir, readFile, writeFile } from "node:fs/promises";

const write = process.argv.includes("--write");
const root = new URL("../", import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));
const REPOSITORY = "https://github.com/alexandre-vl/bb-plugins.git";
const OVERVIEW_MAX_CHARS = 4000;

const catalog = await readJson("marketplace.json");
const collection = await readJson(".bb/plugins.json");
const directories = (await readdir(new URL("plugins/", root), { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
const problems = [];

if (catalog.schemaVersion !== 2) problems.push("marketplace.json: schemaVersion must be 2");
if (!/^[a-z0-9][a-z0-9-]{0,63}$/u.test(catalog.name)) {
  problems.push(`marketplace.json: name ${JSON.stringify(catalog.name)} is not a valid marketplace name`);
}
const listed = catalog.plugins.map((entry) => entry.id).sort();
const indexed = collection.plugins.map((entry) => entry.name).sort();
if (JSON.stringify(listed) !== JSON.stringify(directories)) {
  problems.push(`marketplace.json lists ${listed.join(", ")}; plugins/ holds ${directories.join(", ")}`);
}
if (JSON.stringify(indexed) !== JSON.stringify(directories)) {
  problems.push(`.bb/plugins.json lists ${indexed.join(", ")}; plugins/ holds ${directories.join(", ")}`);
}
for (const entry of collection.plugins) {
  if (entry.source !== `./plugins/${entry.name}`) {
    problems.push(`.bb/plugins.json: ${entry.name} must point at ./plugins/${entry.name}`);
  }
}

for (const entry of catalog.plugins) {
  const where = `marketplace.json: ${entry.id}`;
  const manifest = await readJson(`plugins/${entry.id}/package.json`).catch(() => null);
  if (manifest === null) {
    problems.push(`${where}: plugins/${entry.id}/package.json is missing`);
    continue;
  }
  const packageId = String(manifest.name).split("/").pop().replace(/^bb-plugin-/u, "");
  if (packageId !== entry.id) {
    problems.push(`${where}: package ${manifest.name} is plugin "${packageId}"`);
  }
  const git = entry.source?.git;
  if (git?.url !== REPOSITORY) problems.push(`${where}: source.git.url must be ${REPOSITORY}`);
  if (git?.subdir !== `plugins/${entry.id}`) problems.push(`${where}: source.git.subdir must be plugins/${entry.id}`);
  if (git?.tagPrefix !== `${entry.id}/`) problems.push(`${where}: source.git.tagPrefix must be ${entry.id}/`);
  const major = Number(String(manifest.version).split(".")[0]);
  if (typeof git?.range !== "string" || !git.range.startsWith(`^${major}.`)) {
    problems.push(`${where}: source.git.range ${JSON.stringify(git?.range)} does not track major ${major} of version ${manifest.version}`);
  }
  const icon = entry.icon?.url;
  if (typeof icon === "string" && icon.startsWith("./")) {
    await access(new URL(icon, root)).catch(() => problems.push(`${where}: icon ${icon} does not exist`));
  }
  const overview = (
    await readFile(new URL(`plugins/${entry.id}/PLUGIN_OVERVIEW.md`, root), "utf8").catch(() => "")
  ).replace(/\n+$/u, "");
  if (overview.length > 0) {
    if ([...overview].length > OVERVIEW_MAX_CHARS) {
      problems.push(`${where}: PLUGIN_OVERVIEW.md has ${[...overview].length} characters; bb skips an overview over ${OVERVIEW_MAX_CHARS}`);
    }
    if (write) entry.overview = overview;
    else if (entry.overview !== overview) {
      problems.push(`${where}: overview differs from plugins/${entry.id}/PLUGIN_OVERVIEW.md; run node scripts/check-catalog.mjs --write`);
    }
  }
}

if (write) {
  await writeFile(new URL("marketplace.json", root), `${JSON.stringify(catalog, null, 2)}\n`);
}
if (problems.length > 0) {
  for (const problem of problems) console.error(`✗ ${problem}`);
  process.exit(1);
}
console.log(`catalog ok: ${listed.join(", ")}`);
