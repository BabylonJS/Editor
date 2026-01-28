import dotEnv from "dotenv";
import { Command } from "commander";

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
	.action((projectDir: string) => {
		pack(projectDir, {
			optimize: true,
		});
	});

program
	.command("s3")
	.description("Packs and deploys the project located in the specified directory into a S3 bucket. Current directory is used by default.")
	.argument("[projectDir]", "The root directory of the project to package and deploy into a S3 bucket.", process.cwd())
	.action((projectDir: string) => {
		s3(projectDir, {
			optimize: true,
		});
	});

program.parse();
