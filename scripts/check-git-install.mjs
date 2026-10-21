import { execFile } from "node:child_process";
import { cp, mkdtemp, readdir, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);
const root = fileURLToPath(new URL("../", import.meta.url));
const EXCLUDED = new Set(["node_modules", "dist", ".turbo", ".npmrc", ".yarnrc", ".yarnrc.yml"]);
const requested = process.argv.slice(2);
const plugins =
  requested.length > 0
    ? requested
    : (await readdir(join(root, "plugins"), { withFileTypes: true }))
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name);

const workDir = await mkdtemp(join(tmpdir(), "bb-git-install-"));
let failed = false;
try {
  for (const id of plugins) {
    const source = join(root, "plugins", id);
    const target = join(workDir, id);
    await cp(source, target, {
      recursive: true,
      filter: (path) => !relative(source, path).split(/[\\/]/u).some((part) => EXCLUDED.has(part)),
    });
    try {
      await run(
        "npm",
        ["install", "--prefix", target, "--ignore-scripts", "--omit=dev", "--omit=optional", "--no-audit", "--no-fund"],
        { maxBuffer: 64 * 1024 * 1024 },
      );
      const env = { ...process.env, BB_DATA_DIR: join(workDir, "bb-data") };
      delete env.BB_CLI;
      await run("bb", ["plugin", "build", target], { env, maxBuffer: 64 * 1024 * 1024 });
      const manifest = JSON.parse(await readFile(join(target, "package.json"), "utf8"));
      const artifacts = manifest.bb?.app === undefined ? ["server.js"] : ["server.js", "app.js", "app.css"];
      for (const artifact of artifacts) await stat(join(target, "dist", artifact));
      console.log(`✓ ${id}: production-only install and bb plugin build produced dist/${artifacts.join(", dist/")}`);
    } catch (error) {
      failed = true;
      console.error(`✗ ${id}: ${error.message}\n${error.stdout ?? ""}${error.stderr ?? ""}`);
    }
  }
} finally {
  await rm(workDir, { recursive: true, force: true });
}
process.exit(failed ? 1 : 0);
