# Safe Backup Utility

A POSIX-shell script that creates timestamped compressed archives. It validates the source and destination, refuses to overwrite an existing archive, and supports a dry-run mode.

## Requirements
- POSIX-compatible `sh`
- `tar`

## Usage
```sh
sh backup.sh --dry-run ./important-data ./backups
sh backup.sh ./important-data ./backups
```

The destination directory must already exist. The script creates a new archive in it and never deletes older backups.

## Skills demonstrated
Portable shell scripting, argument validation, quoting, exit codes, safe file handling, and command-line documentation.

## Safety
Try `--dry-run` first. This is a starter utility, not a full backup system: it does not encrypt archives, verify restore integrity, or copy backups off-site.
