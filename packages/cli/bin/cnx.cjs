#!/usr/bin/env node
// Code Nexus: thin shim over the CLI loader. Keeps the binary name
// "cnx" on PATH, forwards to the normal cached launcher.
process.env.OPENCODE_BIN_COMMAND = "cnx";
require("./opencode.cjs")