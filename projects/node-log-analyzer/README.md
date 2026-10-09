# Node.js Log Analyzer

A dependency-free command-line tool that summarizes a simple timestamped application log. It counts log levels, reports the most frequent messages, and returns a non-zero exit code for invalid input.

## Requirements
- Node.js 18 or later

## Run it
```sh
node src/log-analyzer.js samples/application.log
node src/log-analyzer.js samples/application.log --json
```

Accepted sample format:

```text
2026-01-10T10:00:00Z INFO Service started
2026-01-10T10:01:00Z WARN Retry scheduled
2026-01-10T10:02:00Z ERROR Request failed
```

## Skills demonstrated
Node.js built-in modules, CLI argument parsing, streaming/file input, defensive parsing, aggregation, and JSON output.

## Limitations
The parser intentionally supports a simple timestamp + level + message format. Adapt the parser for JSON logs or other formats before using it with real systems.
