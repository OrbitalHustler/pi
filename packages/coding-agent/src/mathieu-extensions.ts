import { createRequire } from "node:module";
import { dirname } from "node:path";

const require = createRequire(import.meta.url);

export const MATHIEU_EXTENSION_PATHS = [dirname(require.resolve("@hypabolic/pi-hypa/package.json"))];
