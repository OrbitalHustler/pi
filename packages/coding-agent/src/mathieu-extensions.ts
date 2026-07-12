import { createRequire } from "node:module";
import { dirname } from "node:path";
import type { PathMetadata } from "./core/package-manager.ts";

const require = createRequire(import.meta.url);
const hypaPackageRoot = dirname(require.resolve("@hypabolic/pi-hypa/package.json"));
const webAccessPackageRoot = dirname(require.resolve("pi-web-access/package.json"));

export const MATHIEU_EXTENSION_PATHS = [hypaPackageRoot, webAccessPackageRoot];
export const MATHIEU_EXTENSION_METADATA = new Map<string, PathMetadata>([
	[
		hypaPackageRoot,
		{
			source: "npm:@hypabolic/pi-hypa",
			scope: "temporary",
			origin: "package",
			baseDir: hypaPackageRoot,
		},
	],
	[
		webAccessPackageRoot,
		{
			source: "npm:pi-web-access",
			scope: "temporary",
			origin: "package",
			baseDir: webAccessPackageRoot,
		},
	],
]);
