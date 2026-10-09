#!/bin/sh
set -eu

usage() {
    echo "Usage: sh backup.sh [--dry-run] SOURCE_DIR DESTINATION_DIR" >&2
    exit 2
}

dry_run=0
if [ "${1-}" = "--dry-run" ]; then
    dry_run=1
    shift
fi
[ "$#" -eq 2 ] || usage
source_dir=$1
destination_dir=$2

[ -d "$source_dir" ] || { echo "Error: source is not a directory: $source_dir" >&2; exit 1; }
[ -d "$destination_dir" ] || { echo "Error: destination must already exist: $destination_dir" >&2; exit 1; }

source_abs=$(CDPATH= cd -- "$source_dir" && pwd -P)
destination_abs=$(CDPATH= cd -- "$destination_dir" && pwd -P)
case "$destination_abs/" in
    "$source_abs/"*) echo "Error: destination must not be inside the source directory." >&2; exit 1 ;;
esac

timestamp=$(date '+%Y%m%d-%H%M%S')
base_name=$(basename "$source_abs")
archive="$destination_abs/$base_name-$timestamp.tar.gz"
[ ! -e "$archive" ] || { echo "Error: archive already exists: $archive" >&2; exit 1; }

if [ "$dry_run" -eq 1 ]; then
    printf 'Dry run: would archive "%s" to "%s"\n' "$source_abs" "$archive"
    exit 0
fi

parent_dir=$(dirname "$source_abs")
(cd "$parent_dir" && tar -czf "$archive" "$base_name")
printf 'Backup created: %s\n' "$archive"
