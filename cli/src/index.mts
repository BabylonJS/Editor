import dotEnv from "dotenv";
import { Command, Option } from "commander";

import packageJson from "../package.json" with { type: "json" };

import { s3 } from "./s3/s3.mjs";
import { pack } from "./pack/pack.mjs";

dotEnv.config();

const program = new Command();

program
	.version(packageJson.version)
	.name("Babylon.js Editor CLI")
	.description("Babylon.js Editor CLI is a command line interface to help you package your scenes made using the Babylon.js Editor")
	.option("-h, --help", "display help for command");

program
	.command("pack")
	.description("Packs the project located in the specified directory. Current directory is used by default.")
	.argument("[projectDir]", "The root directory of the project to package", process.cwd())
	.option("--merge-geometries", "Optimize the loading process of geometries by merging them into a single file.", false)
	.option("--merge-decals", "Try to optimize draw calls count by merging decals which share the same material into a single mesh and geometry.", false)
	.action((projectDir: string, options: { mergeGeometries: boolean; mergeDecals: boolean }) => {
		pack(projectDir, {
			...options,
			optimize: true,
		});
	});

program
	.command("s3")
	.description("Packs and deploys the project located in the specified directory into a S3 bucket. Current directory is used by default.")
	.argument("[projectDir]", "The root directory of the project to package and deploy into a S3 bucket.", process.cwd())
	.option("--merge-geometries", "Optimize the loading process of geometries by merging them into a single file.", false)
	.option("--merge-decals", "Try to optimize draw calls count by merging decals which share the same material into a single mesh and geometry.", false)
	.option(
		"--gzip",
		'Compress the scenes, geometries, JSON files and WAV sounds using gzip before uploading them ("Content-Encoding: gzip"): browsers decompress them while downloading. Fast to compress. Files already compressed (KTX2, PNG, JPEG, MP3...) are uploaded as is.'
	)
	.addOption(
		new Option(
			"--brotli",
			'Compress the scenes, geometries, JSON files and WAV sounds using brotli before uploading them ("Content-Encoding: br"): browsers decompress them while downloading. Smaller than with gzip but slower to compress. Files already compressed (KTX2, PNG, JPEG, MP3...) are uploaded as is.'
		).conflicts("gzip")
	)
	.action((projectDir: string, { gzip, brotli, ...options }: { mergeGeometries: boolean; mergeDecals: boolean; gzip?: boolean; brotli?: boolean }) => {
		s3(projectDir, {
			...options,
			optimize: true,
			compression: brotli ? "brotli" : gzip ? "gzip" : undefined,
		});
	});

program.parse();
