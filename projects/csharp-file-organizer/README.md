# C# File Organizer

A .NET console utility that groups files in a directory into extension-named folders. It defaults to preview-only mode; pass `--apply` to make changes.

## Requirements
- .NET 8 SDK

## Run it
```sh
dotnet run --project FileOrganizer.csproj -- ./example-files
dotnet run --project FileOrganizer.csproj -- ./example-files --apply
```

The program only examines files directly inside the chosen directory. It skips files without extensions and refuses to run against a missing directory.

## Skills demonstrated
C#, .NET CLI, LINQ, path handling, safe defaults, and exception handling.

## Safety
Always review preview output before using `--apply`. Test on a copy of your files first.
