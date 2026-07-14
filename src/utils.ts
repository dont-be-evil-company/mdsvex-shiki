import type { ElementContent, RootContent } from "hast";

/**
 * Escape characters that break Svelte compilation when highlighted HTML is
 * embedded in a `.svelte` / `.svx` file. Safe as raw markup and inside
 * `{@html \`...\`}` when `highlight.optimise` is true.
 *
 * Every backslash becomes `&#92;`. A template literal would otherwise treat
 * `\` as an escape (`\n`, `\"`, `\ `) or as a line continuation and drop it.
 */
export function escapeSvelte(str: string): string {
  return str
    .replace(/[{}`]/g, (c) => {
      const map: Record<string, string> = {
        "{": "&#123;",
        "}": "&#125;",
        "`": "&#96;",
      };
      return map[c] ?? c;
    })
    .replace(/\\/g, "&#92;");
}

// Helper function to extract text content from HAST nodes
export function extractText(node: RootContent | ElementContent): string {
  if (node.type === "text") {
    return node.value;
  }
  if (node.type === "element" && node.children) {
    return node.children.map((child) => extractText(child)).join("");
  }
  return "";
}

/**
 * Parses the code block meta string to extract the path.
 * Accepts path=<value> with or without quotes.
 * @param metaString The meta string from the code block
 * @returns Object with path (if present)
 */
export function parseMetaString(metaString?: string): {
  path: string | undefined;
} {
  if (!metaString) {
    return {
      path: undefined,
    };
  }

  // Match path="...value..." or path=value (stops at whitespace)
  const pathMatch = metaString.match(/(?:^|\s)path=(?:"([^"]+)"|([^\s]+))/);
  const pathValue = pathMatch?.[1] ?? pathMatch?.[2];

  return {
    path: pathValue,
  };
}

/**
 * Formats a path with directory and file icons.
 * If there are too many segments (>3), shows ".." with a tooltip.
 * @param path The file path to format
 * @returns Array of path segment objects with type and value
 */
export function formatPathSegments(path: string): Array<{
  type: "directory" | "file";
  value: string;
}> {
  // Normalize path separators (handle both / and \)
  const normalizedPath = path.replace(/\\/g, "/");
  const segments = normalizedPath.split("/").filter((s) => s.length > 0);

  if (segments.length === 0) {
    return [];
  }

  if (segments.length === 1) {
    // Single segment means it's just a file
    return [{ type: "file", value: segments[0] ?? "" }];
  }

  // Multiple segments: directories + file
  const result: Array<{ type: "directory" | "file"; value: string }> = [];
  const directories = segments.slice(0, -1);
  const file = segments[segments.length - 1];

  // If too many segments, collapse middle ones
  if (directories.length > 2) {
    result.push({ type: "directory", value: directories[0] ?? "" });
    result.push({ type: "directory", value: ".." });
    result.push({
      type: "directory",
      value: directories[directories.length - 1] ?? "",
    });
  } else {
    directories.forEach((dir) => {
      result.push({ type: "directory", value: dir ?? "" });
    });
  }

  result.push({ type: "file", value: file ?? "" });

  return result;
}
