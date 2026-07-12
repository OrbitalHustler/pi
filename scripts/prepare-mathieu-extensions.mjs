#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const checkOnly = process.argv.includes("--check");
if (process.argv.length > (checkOnly ? 3 : 2)) {
	throw new Error("Usage: prepare-mathieu-extensions.mjs [--check]");
}

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const curatorPath = resolve(repoRoot, "node_modules/pi-web-access/curator-page.ts");
const codingAgentRequire = createRequire(resolve(repoRoot, "packages/coding-agent/package.json"));
const markedRoot = dirname(codingAgentRequire.resolve("marked/package.json"));
const markedPath = resolve(markedRoot, "lib/marked.umd.js");
const expectedCuratorHash = "ba2f190acc088e4ccb5337870e4dde43172945bba1d3c4cc25204935f701d71d";
const expectedHardenedCuratorHash = "48e24c5a6899c99288d10cdcba14eb922bbf3ec8d6c6f63b7fea8159c7926c20";
const expectedMarkedHash = "2dc4769dfde29f51c7aca1a539c6407c789c8ea644cf8b7d01ded28a9c1d800b";

function sha256(value) {
	return createHash("sha256").update(value).digest("hex");
}

const remoteAssets = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/marked@15/marked.min.js"><\\/script>`;
const remoteImages = `    var images = container.querySelectorAll("img[src]");
    images.forEach(function(img) {
      var safe = sanitizeHref(img.getAttribute("src") || "");
      if (safe === "#") {
        img.remove();
      } else {
        img.setAttribute("src", safe);
      }
    });`;
const blockedImages = `    container.querySelectorAll("img").forEach(function(img) {
      img.remove();
    });`;

const markedBundle = readFileSync(markedPath, "utf8");
const markedHash = sha256(markedBundle);
if (markedHash !== expectedMarkedHash) {
	throw new Error(`Refusing to embed unreviewed marked browser bundle (sha256 ${markedHash})`);
}
const localAssets = `<script src="data:text/javascript;base64,${Buffer.from(markedBundle).toString("base64")}"><\\/script>`;
const current = readFileSync(curatorPath, "utf8");
const currentHash = sha256(current);

let hardened;
if (currentHash === expectedCuratorHash) {
	if (!current.includes(remoteAssets) || !current.includes(remoteImages)) {
		throw new Error("pi-web-access curator source has the expected hash but not the reviewed patch anchors");
	}
	hardened = current.replace(remoteAssets, localAssets).replace(remoteImages, blockedImages);
	if (sha256(hardened) !== expectedHardenedCuratorHash) {
		throw new Error("Generated pi-web-access hardening output does not match the reviewed hash");
	}
	} else if (currentHash === expectedHardenedCuratorHash) {
		hardened = current;
} else {
	throw new Error(
		`Refusing to patch unreviewed pi-web-access curator source (sha256 ${currentHash}); audit the new artifact first`,
	);
}

const isHardened = hardened.includes(localAssets) && hardened.includes(blockedImages) && !hardened.includes("cdn.jsdelivr.net");
if (!isHardened) {
	throw new Error("Reviewed pi-web-access hardening markers are missing");
}

if (!checkOnly && current !== hardened) {
	writeFileSync(curatorPath, hardened);
}

console.log(current === hardened ? "Hardened pi-web-access is verified." : checkOnly ? "pi-web-access hardening patch is applicable." : "Hardened pi-web-access.");
