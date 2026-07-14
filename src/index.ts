import {
  transformerMetaHighlight,
  transformerMetaWordHighlight,
  transformerNotationDiff,
  transformerNotationErrorLevel,
  transformerNotationHighlight,
  transformerNotationWordHighlight,
} from "@shikijs/transformers";
import { mdsvexWrapItUpTransformer } from "./transformers";
import {
  type BundledLanguage,
  bundledLanguages,
  type BundledTheme,
  type CodeToHastOptions,
  createHighlighter,
  type Highlighter,
} from "shiki";
import { escapeSvelte } from "./utils";

export { escapeSvelte };

export type MdsvexHighlighter = (
  code: string,
  lang: string | null | undefined,
  metastring: string | null | undefined,
  filename?: string,
  optimise?: boolean,
) => string;

export type HighlighterOptions = {
  displayPath?: boolean;
  displayLang?: boolean;
  disableCopyButton?: boolean;
  shikiOptions?: Partial<CodeToHastOptions<BundledLanguage, BundledTheme>> & {
    themes?:
      | BundledTheme[]
      | { light: BundledTheme; dark: BundledTheme }
      | BundledTheme;
    langs?: BundledLanguage[] | "all";
  };
};

export const defaultShikiOptions: Partial<
  CodeToHastOptions<BundledLanguage, BundledTheme>
> = {
  cssVariablePrefix: "--shiki-",
  transformers: [
    transformerMetaHighlight(),
    transformerMetaWordHighlight(),
    transformerNotationDiff(),
    transformerNotationHighlight(),
    transformerNotationWordHighlight(),
    transformerNotationErrorLevel(),
  ],
};

const defaultThemes = {
  dark: "catppuccin-mocha",
  light: "catppuccin-mocha",
} as const;

let highlighterInstance: Highlighter | null = null;
let highlighterPromise: Promise<Highlighter> | null = null;

const getHighlighterInstance = async (
  themes:
    | BundledTheme[]
    | { light: BundledTheme; dark: BundledTheme }
    | BundledTheme,
  langs: BundledLanguage[] | "all" = "all",
): Promise<Highlighter> => {
  if (highlighterInstance) {
    return highlighterInstance;
  }

  if (highlighterPromise) {
    return highlighterPromise;
  }

  const langsArray: BundledLanguage[] =
    langs === "all"
      ? (Object.keys(bundledLanguages) as BundledLanguage[])
      : langs;

  let themesArray: BundledTheme[];
  if (Array.isArray(themes)) {
    themesArray = themes;
  } else if (
    typeof themes === "object" &&
    "light" in themes &&
    "dark" in themes
  ) {
    themesArray = [themes.light, themes.dark];
  } else {
    themesArray = [themes];
  }

  const highlighterOptions: Parameters<typeof createHighlighter>[0] = {
    themes: themesArray,
    langs: langsArray,
  };

  highlighterPromise = createHighlighter(highlighterOptions);

  highlighterInstance = await highlighterPromise;
  return highlighterInstance;
};

export const getMdsvexShikiHighlighter = async (
  config: HighlighterOptions,
): Promise<MdsvexHighlighter> => {
  const themes = config.shikiOptions?.themes || defaultThemes;
  const langs = config.shikiOptions?.langs || "all";

  const shikiOptions: Partial<
    CodeToHastOptions<BundledLanguage, BundledTheme>
  > = {
    ...defaultShikiOptions,
    ...config.shikiOptions,
  };

  delete (shikiOptions as any).themes;
  delete (shikiOptions as any).langs;

  const highlighter = await getHighlighterInstance(themes, langs);

  return (
    code: string,
    lang: string | null | undefined,
    meta: string | null | undefined,
    _filename?: string,
    optimise?: boolean,
  ): string => {
    lang = lang ?? "text";
    meta = meta ?? undefined;

    const transformers = [
      ...(defaultShikiOptions.transformers || []),
      ...(shikiOptions.transformers || []),
    ];

    if (!transformers.find((t) => t.name === "transformerMdsvexWrapItUp")) {
      transformers.push(mdsvexWrapItUpTransformer(lang, code, meta, config));
    }

    const html = highlighter.codeToHtml(code, {
      ...shikiOptions,
      lang,
      transformers,
      themes:
        typeof themes === "object" && !Array.isArray(themes)
          ? themes
          : undefined,
    } as CodeToHastOptions<BundledLanguage, BundledTheme>);

    const escaped = escapeSvelte(html);
    // mdsvex default `optimise: true` injects `{@html \`...\`}`; omitting the
    // 5th arg (manual `{@html hl(...)}` in a component) must stay raw HTML.
    return optimise === true ? `{@html \`${escaped}\`}` : escaped;
  };
};

/**
 * Highlight `code` for a single `{@html ...}` in a Svelte component (not through mdsvex).
 * Returns HTML already passed through {@link escapeSvelte}; does not wrap in `{@html \`...\`}`.
 *
 * Pass `HighlighterOptions` to create/use the highlighter, or pass an existing
 * {@link MdsvexHighlighter} from {@link getMdsvexShikiHighlighter} to avoid awaiting config on every call.
 *
 * @example
 * ```svelte
 * <script>
 *   import { highlightForSvelte } from '@dont-be-evil-company/mdsvex-shiki';
 *   let html = $state('');
 *   $effect(() => {
 *     void highlightForSvelte({ shikiOptions: { langs: ['typescript'] } }, 'const x = 1', 'ts').then(
 *       (h) => { html = h; },
 *     );
 *   });
 * </script>
 * <div>{@html html}</div>
 * ```
 */
export async function highlightForSvelte(
  configOrHighlighter: HighlighterOptions | MdsvexHighlighter,
  code: string,
  lang?: string | null,
  meta?: string | null,
): Promise<string> {
  const hl =
    typeof configOrHighlighter === "function"
      ? configOrHighlighter
      : await getMdsvexShikiHighlighter(configOrHighlighter);
  return hl(code, lang, meta, undefined, false);
}
