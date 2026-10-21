import { readFile } from "node:fs/promises";

const tag = process.argv[2] ?? process.env.GITHUB_REF_NAME ?? "";
const match =
  /^([a-z0-9][a-z0-9-]*)\/v(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?)$/u.exec(
    tag,
  );
if (match === null) {
  console.error(`tag ${JSON.stringify(tag)} is not <plugin-id>/v<semver>`);
  process.exit(1);
}
const [, id, version] = match;
const manifestPath = `plugins/${id}/package.json`;
let manifest;
try {
  manifest = JSON.parse(
    await readFile(new URL(`../${manifestPath}`, import.meta.url), "utf8"),
  );
} catch (error) {
  console.error(`tag ${tag}: cannot read ${manifestPath}: ${error.message}`);
  process.exit(1);
}
const packageId = String(manifest.name).split("/").pop().replace(/^bb-plugin-/u, "");
if (packageId !== id) {
  console.error(`tag ${tag} names plugin "${id}", but ${manifestPath} is plugin "${packageId}"`);
  process.exit(1);
}
if (manifest.version !== version) {
  console.error(`tag ${tag} is version ${version}, but ${manifestPath} is version ${manifest.version}`);
  process.exit(1);
}
console.log(`tag ${tag} matches ${manifestPath} version ${manifest.version}`);
