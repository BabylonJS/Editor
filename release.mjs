import { join } from "node:path";
import { promisify } from "node:util";
import { readFileSync, writeFileSync } from "node:fs";
import { exec, spawnSync } from "node:child_process";

/**
 * Releases the packages of the editor published together on npm:
 * - `node release.mjs <version>` sets the version of the packages (e.g. `node release.mjs 5.5.4-alpha.3`).
 * - `node release.mjs publish` lints, builds and tests the repository, then publishes the packages at their current version.
 */

const execAsync = promisify(exec);

const root = import.meta.dirname;

/**
 * Folders of the released packages, in the order they are published (the editor depends on the tools and the CLI).
 */
const packageFolders = ["tools", "tools-lite", "cli", "editor"];

/**
 * Commands that must all succeed before publishing anything.
 */
const checkCommands = ["yarn lint", "yarn build-all-concurrently", "yarn test"];

/**
 * Semantic version without build metadata (see https://semver.org), e.g. 5.5.4 or 5.5.4-alpha.3.
 */
const versionRegex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-(0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(\.(0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*)?$/;

const argument = process.argv[2];

if (process.argv.length !== 3 || argument === "--help" || argument === "-h") {
	console.log("Usage:");
	console.log("  node release.mjs <version>   Sets the version of the packages " + packageFolders.join(", ") + " (e.g. node release.mjs 5.5.4-alpha.3).");
	console.log("  node release.mjs publish     Runs " + checkCommands.join(" && ") + " then publishes the packages at their current version.");
	process.exit(argument === "--help" || argument === "-h" ? 0 : 1);
}

if (argument === "publish") {
	await publish();
} else {
	setVersion(argument);
}

/**
 * Sets the given version in the package.json file of every released package. Only the "version" line of the files changes.
 * @param {string} version defines the version to set (a leading "v" is ignored).
 */
function setVersion(version) {
	const newVersion = version.replace(/^v/, "");
	if (!versionRegex.test(newVersion)) {
		fail(`"${version}" is not a valid version. Expected something like 5.5.4 or 5.5.4-alpha.3.`);
	}

	// Update every file in memory first so a failure doesn't leave the packages with different versions.
	const packages = packageFolders.map((folder) => {
		const pkg = readPackage(folder);
		const content = pkg.content.replace(/^([ \t]*"version"\s*:\s*")[^"]*(")/m, (_, start, end) => `${start}${newVersion}${end}`);

		if (JSON.parse(content).version !== newVersion) {
			fail(`Failed to find the "version" field of ${folder}/package.json.`);
		}

		return { ...pkg, content };
	});

	packages.forEach((pkg) => {
		writeFileSync(pkg.path, pkg.content, "utf-8");
		console.log(`${pkg.folder}/package.json: ${pkg.json.version} -> ${newVersion}`);
	});

	console.log(`\nRun "node release.mjs publish" to publish them.`);
}

/**
 * Publishes every released package at its current version, once lint, build and tests passed. Nothing is published if the version
 * is already published for one of the packages.
 */
async function publish() {
	const packages = packageFolders.map((folder) => readPackage(folder));

	const version = packages[0].json.version;
	if (packages.some((pkg) => pkg.json.version !== version)) {
		const versions = packages.map((pkg) => `${pkg.folder}: ${pkg.json.version}`).join(", ");
		fail(`The packages don't have the same version (${versions}). Set it first using "node release.mjs <version>".`);
	}

	console.log(`Checking that version ${version} isn't published yet...`);

	let published = [];
	try {
		const checks = await Promise.all(packages.map((pkg) => isPublished(pkg.json.name, version)));
		published = packages.filter((_, index) => checks[index]);
	} catch (e) {
		fail(e.message);
	}

	if (published.length) {
		const names = published.map((pkg) => pkg.json.name).join(", ");
		fail(`Version ${version} is already published (${names}). Change the version first using "node release.mjs <version>".`);
	}

	for (const command of checkCommands) {
		if (!run(command, root)) {
			fail(`"${command}" failed. Nothing was published.`);
		}
	}

	for (let i = 0; i < packages.length; ++i) {
		const pkg = packages[i];

		// Giving the current version makes yarn publish it as is: no version prompt, no version commit or tag.
		if (!run(`yarn publish --new-version ${version}`, join(root, pkg.folder))) {
			const done = packages.slice(0, i).map((p) => p.json.name);
			const remaining = packages.slice(i).map((p) => p.json.name);

			fail(`Failed to publish ${pkg.json.name}@${version}.\nPublished: ${done.join(", ") || "none"}.\nNot published: ${remaining.join(", ")}.`);
		}
	}

	console.log(`\nPublished version ${version} of ${packages.map((pkg) => pkg.json.name).join(", ")}.`);
}

/**
 * Returns whether or not the given version of the given package is already published on the npm registry. Versions that were
 * published then unpublished count as published, since npm refuses to publish them again.
 * @param {string} name defines the name of the package.
 * @param {string} version defines the version to check.
 * @returns {Promise<boolean>}
 */
async function isPublished(name, version) {
	try {
		const { stdout } = await execAsync(`npm view ${name} versions time --json`, { maxBuffer: 64 * 1024 * 1024 });
		const { versions, time } = JSON.parse(stdout);

		return [].concat(versions ?? []).includes(version) || Object.hasOwn(time ?? {}, version);
	} catch (e) {
		let error = null;
		try {
			error = JSON.parse(e.stdout).error;
		} catch {
			// Not a npm error.
		}

		// The package was never published.
		if (error?.code === "E404") {
			return false;
		}

		throw new Error(`Failed to check the published versions of ${name}: ${error?.summary ?? e.message}`);
	}
}

/**
 * Reads the package.json file of the given package folder.
 * @param {string} folder defines the folder of the package, relative to the root of the repository.
 */
function readPackage(folder) {
	const path = join(root, folder, "package.json");
	const content = readFileSync(path, "utf-8");

	return { folder, path, content, json: JSON.parse(content) };
}

/**
 * Runs the given command in the given folder, sharing the terminal so prompts (npm login, one-time password) can be answered.
 * Returns whether or not the command succeeded.
 * @param {string} command defines the command to run.
 * @param {string} cwd defines the folder where to run the command.
 */
function run(command, cwd) {
	console.log(`\n> ${command}${cwd === root ? "" : ` (in ${cwd.substring(root.length + 1)})`}`);

	return spawnSync(command, { cwd, shell: true, stdio: "inherit" }).status === 0;
}

/**
 * Logs the given error message and exits the process with an error code.
 * @param {string} message defines the message to log.
 */
function fail(message) {
	console.error(`\nError: ${message}`);
	process.exit(1);
}
