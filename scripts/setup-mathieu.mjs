import { spawnSync } from "node:child_process";
import { readdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const generatedCatalogPaths = [
	"packages/ai/src/image-models.generated.ts",
	"packages/ai/src/models.generated.ts",
	"packages/ai/src/providers",
];
const providerDirectory = "packages/ai/src/providers";
const originalProviderCatalogs = new Set(readdirSync(providerDirectory).filter((name) => name.endsWith(".models.ts")));

function run(command, args, options = {}) {
	const result = spawnSync(command, args, {
		cwd: process.cwd(),
		encoding: "utf8",
		stdio: "inherit",
		...options,
	});
	if (result.error) throw result.error;
	if (result.status !== 0) {
		throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status}`);
	}
}

const status = spawnSync("git", ["status", "--porcelain"], {
	cwd: process.cwd(),
	encoding: "utf8",
});
if (status.error) throw status.error;
if (status.status !== 0) throw new Error("Could not inspect the Git worktree");
if (status.stdout.trim()) {
	throw new Error("setup:mathieu requires a clean Git worktree");
}

run(npmCommand, ["ci", "--ignore-scripts"]);
try {
	run(npmCommand, ["run", "build"]);
} finally {
	run("git", ["restore", "--", ...generatedCatalogPaths]);
	for (const name of readdirSync(providerDirectory)) {
		if (name.endsWith(".models.ts") && !originalProviderCatalogs.has(name)) {
			unlinkSync(join(providerDirectory, name));
		}
	}
}
run(npmCommand, ["link", "--ignore-scripts", "--workspace=packages/coding-agent"]);
