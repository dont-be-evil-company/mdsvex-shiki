import { expect, test } from "bun:test";
import { getMdsvexShikiHighlighter } from "./index";
import { escapeSvelte } from "./utils";

const bt = "`";

const sample = [
  "gcloud auth print-access-token \\",
  "  --flag",
  "curl \\\\",
  'echo "a\\tb"',
  "path C:\\Users\\name",
  'json "{\\"a\\":1}"',
  "space\\ here",
].join("\n");

test("escapeSvelte escapes every backslash", () => {
  const input = ["{", "}", bt, "\\", "\\t", "\\n", "\\r", "\\u", "\\x"].join(
    " ",
  );
  expect(escapeSvelte(input)).toBe(
    [
      "&#123;",
      "&#125;",
      "&#96;",
      "&#92;",
      "&#92;t",
      "&#92;n",
      "&#92;r",
      "&#92;u",
      "&#92;x",
    ].join(" "),
  );
});

test("optimise template literal keeps backslashes", async () => {
  const hl = await getMdsvexShikiHighlighter({
    displayLang: false,
    displayPath: false,
  });
  const wrapped = hl(sample, "bash", undefined, undefined, true);
  expect(wrapped.startsWith("{@html " + bt)).toBe(true);
  expect(wrapped.endsWith(bt + "}")).toBe(true);

  const inner = wrapped.slice("{@html ".length + 1, -2);
  const html = new Function("return " + bt + inner + bt)() as string;
  const decoded = decodeHtml(html.replace(/<[^>]+>/g, ""));

  expect(decoded).toContain("print-access-token \\");
  expect(decoded).toContain("curl \\\\");
  expect(decoded).toContain('echo "a\\tb"');
  expect(decoded).toContain("C:\\Users\\name");
  expect(decoded).toContain('json "{\\"a\\":1}"');
  expect(decoded).toContain("space\\ here");

  const dataCode = html.match(/data-code="([^"]*)"/)?.[1];
  expect(dataCode).toBeDefined();
  expect(decodeHtml(dataCode ?? "")).toBe(sample);
});

function decodeHtml(value: string): string {
  return value
    .replaceAll("&#92;", "\\")
    .replaceAll("&#123;", "{")
    .replaceAll("&#125;", "}")
    .replaceAll("&#96;", "`")
    .replaceAll("&#x22;", '"')
    .replaceAll("&quot;", '"')
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}
