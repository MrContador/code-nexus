#!/usr/bin/env node
// Code Nexus: thin shim over the opencode CLI loader. Keeps the binary name
// "code-nexus2" on PATH, forwards to the normal cached launcher.
process.env.OPENCODE_BIN_COMMAND = "code-nexus2";
require("./opencode.cjs")