// Sends a Python file to Olov's open Blender through the MCP server, and prints what Blender printed.
// A long generator is easier to keep in a file than to pass through a session's tool (HANDOVER.md, "Notes for
// sessions that drive Blender"). The server is started exactly as .mcp.json declares it, with its telemetry
// off and its safe mode on: this script takes its command and its environment from that file, and from
// nowhere else.
//
//   node scripts/bake/send-to-blender.mjs art/blender/candy.py
//   node scripts/bake/send-to-blender.mjs scripts/bake/export.py "OUT = r'C:/.../art/baked/boot/candy.glb'"
//
// Every argument after the file is put before it as a first line: that is how a script is given a value,
// since safe mode lets it read nothing itself. Needs uv, and Blender open with its add-on's server started.
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const [file, ...first] = process.argv.slice(2);
if (!file) {
  console.error('usage: node scripts/bake/send-to-blender.mjs <file.py> ["NAME = value" ...]');
  process.exit(2);
}
const declared = JSON.parse(readFileSync(fileURLToPath(new URL('../../.mcp.json', import.meta.url)), 'utf8')).mcpServers.blender;
if (declared.env?.DISABLE_TELEMETRY !== 'true' || declared.env?.BLENDER_MCP_SAFE_MODE !== '1') {
  console.error('send-to-blender: .mcp.json must declare the blender server with DISABLE_TELEMETRY=true and BLENDER_MCP_SAFE_MODE=1.');
  process.exit(2);
}
const code = [...first, readFileSync(file, 'utf8')].join('\n');

const server = spawn([declared.command, ...declared.args].join(' '), { shell: true, env: { ...process.env, ...declared.env }, stdio: ['pipe', 'pipe', 'pipe'] });
let buffer = '';
let log = '';
const waiting = new Map();
server.stdout.on('data', (chunk) => {
  buffer += chunk.toString('utf8');
  let at;
  while ((at = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, at).trim();
    buffer = buffer.slice(at + 1);
    if (!line.startsWith('{')) continue;
    const message = JSON.parse(line);
    if (message.id !== undefined && waiting.has(message.id)) {
      waiting.get(message.id)(message);
      waiting.delete(message.id);
    }
  }
});
server.stderr.on('data', (chunk) => { log += chunk.toString('utf8'); });
let next = 1;
/** One JSON-RPC message to the server. A request waits for its answer; a notification has none. */
const send = (method, params, answered = true) => new Promise((resolve) => {
  const message = { jsonrpc: '2.0', method, params };
  if (answered) {
    message.id = next++;
    waiting.set(message.id, resolve);
  }
  server.stdin.write(`${JSON.stringify(message)}\n`);
  if (!answered) resolve(undefined);
});
const stop = (status) => {
  server.stdin.end();
  server.kill();
  process.exit(status);
};
const timer = setTimeout(() => {
  console.error('send-to-blender: no answer in ten minutes. Is Blender open, with its MCP server started?');
  console.error(log.slice(-2000));
  stop(2);
}, 600000);

await send('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'send-to-blender', version: '1' } });
await send('notifications/initialized', {}, false);
const reply = await send('tools/call', { name: 'execute_blender_code', arguments: { code, user_prompt: '' } });
clearTimeout(timer);
const text = (reply.result?.content ?? []).map((part) => part.text ?? '').join('\n');
console.log(text || JSON.stringify(reply.error ?? reply, null, 2));
stop(reply.error || reply.result?.isError || /^(Rejected by safe mode|Error)/.test(text) ? 1 : 0);
