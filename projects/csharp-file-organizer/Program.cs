using System;
using System.IO;
using System.Linq;

if (args.Length is < 1 or > 2 || (args.Length == 2 && args[1] != "--apply"))
{
    Console.Error.WriteLine("Usage: dotnet run -- <directory> [--apply]");
    return 2;
}

var targetDirectory = Path.GetFullPath(args[0]);
var applyChanges = args.Length == 2 && args[1] == "--apply";

if (!Directory.Exists(targetDirectory))
{
    Console.Error.WriteLine($"Error: directory does not exist: {targetDirectory}");
    return 1;
}

try
{
    var files = Directory.EnumerateFiles(targetDirectory)
        .Select(path => new FileInfo(path))
        .Where(file => !string.IsNullOrWhiteSpace(file.Extension))
        .OrderBy(file => file.Name, StringComparer.OrdinalIgnoreCase)
        .ToArray();

    if (files.Length == 0)
    {
        Console.WriteLine("No files with extensions were found.");
        return 0;
    }

    Console.WriteLine(applyChanges ? "Applying file organization:" : "Preview only — no files will be changed:");
    foreach (var file in files)
    {
        var folderName = file.Extension.TrimStart('.').ToLowerInvariant();
        var destinationDirectory = Path.Combine(targetDirectory, folderName);
        var destinationPath = Path.Combine(destinationDirectory, file.Name);

        if (File.Exists(destinationPath) || Directory.Exists(destinationPath))
        {
            Console.WriteLine($"SKIP (destination exists): {file.Name}");
            continue;
        }

        Console.WriteLine($"{file.Name} -> {folderName}/{file.Name}");
        if (!applyChanges)
            continue;

        Directory.CreateDirectory(destinationDirectory);
        File.Move(file.FullName, destinationPath);
    }

    if (!applyChanges)
        Console.WriteLine("\nRun again with --apply to perform these moves.");
}
catch (UnauthorizedAccessException ex)
{
    Console.Error.WriteLine($"Permission error: {ex.Message}");
    return 1;
}
catch (IOException ex)
{
    Console.Error.WriteLine($"File operation failed: {ex.Message}");
    return 1;
}

return 0;
