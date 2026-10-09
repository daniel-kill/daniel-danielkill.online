#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const readline = require('node:readline');
const path = require('node:path');

const LEVELS = new Set(['TRACE', 'DEBUG', 'INFO', 'WARN', 'WARNING', 'ERROR', 'FATAL']);

function parseLine(line, lineNumber) {
  const match = line.match(/^\s*(\S+)\s+(TRACE|DEBUG|INFO|WARN|WARNING|ERROR|FATAL)\s+(.*?)\s*$/i);
  if (!match) return { lineNumber, message: line.trim(), valid: false };

  return {
    timestamp: match[1],
    level: match[2].toUpperCase(),
    message: match[3],
    lineNumber,
    valid: true,
  };
}

async function analyze(filePath) {
  const counts = Object.fromEntries([...LEVELS].map((level) => [level, 0]));
  const messages = new Map();
  let totalLines = 0;
  let parsedLines = 0;
  let malformedLines = 0;

  const input = readline.createInterface({
    input: fs.createReadStream(filePath, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  for await (const line of input) {
    totalLines += 1;
    if (!line.trim()) continue;

    const entry = parseLine(line, totalLines);
    if (!entry.valid) {
      malformedLines += 1;
      continue;
    }

    parsedLines += 1;
    counts[entry.level] += 1;
    messages.set(entry.message, (messages.get(entry.message) || 0) + 1);
  }

  const frequentMessages = [...messages.entries()]
    .map(([message, count]) => ({ message, count }))
    .sort((a, b) => b.count - a.count || a.message.localeCompare(b.message))
    .slice(0, 10);

  return {
    file: path.resolve(filePath),
    totalLines,
    parsedLines,
    malformedLines,
    counts,
    frequentMessages,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes('--json');
  const filePath = args.find((arg) => !arg.startsWith('--'));

  if (!filePath || args.some((arg) => arg.startsWith('--') && arg !== '--json')) {
    console.error('Usage: node src/log-analyzer.js <log-file> [--json]');
    process.exitCode = 2;
    return;
  }

  try {
    const report = await analyze(filePath);
    if (jsonOutput) {
      console.log(JSON.stringify(report, null, 2));
      return;
    }

    console.log(`Log analysis: ${report.file}`);
    console.log(`Lines: ${report.totalLines} | Parsed: ${report.parsedLines} | Malformed: ${report.malformedLines}`);
    console.log('\nCounts by level:');
    for (const [level, count] of Object.entries(report.counts)) {
      if (count) console.log(`  ${level.padEnd(8)} ${count}`);
    }
    console.log('\nMost frequent messages:');
    for (const item of report.frequentMessages) {
      console.log(`  ${String(item.count).padStart(4)}  ${item.message}`);
    }
  } catch (error) {
    console.error(`Could not analyze log: ${error.message}`);
    process.exitCode = 1;
  }
}

if (require.main === module) main();
module.exports = { analyze, parseLine };
