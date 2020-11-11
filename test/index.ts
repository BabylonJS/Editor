import "../src/renderer/module";

import { XMLHttpRequest } from "xhr2";
global["XMLHttpRequest"] = XMLHttpRequest;

import "cannon";
import "babylonjs-materials";
import "babylonjs-loaders";

import "./unit-tests";
import "./workspace";
import "./project";
