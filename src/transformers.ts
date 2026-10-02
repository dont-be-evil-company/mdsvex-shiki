import type { ElementContent, Root, RootContent } from "hast";
import { type ShikiTransformer } from "shiki";
export { copyAction } from "./copy-action";
import { extractText, formatPathSegments, parseMetaString } from "./utils";

interface MdsvexWrapItUpOptions {
  disableCopyButton?: boolean;
  displayPath?: boolean;
  displayLang?: boolean;
}

export const mdsvexWrapItUpTransformer = (
  lang: string,
  codeText: string,
  meta: string | undefined,
  options: MdsvexWrapItUpOptions = {},
): ShikiTransformer => {
  const { disableCopyButton = false, displayPath = true, displayLang = true } = options;
  return {
    name: "transformerMdsvexWrapItUp",
    enforce: "post",
    root: function (root: Root) {
      const len = root.children.length;
      const children: RootContent[] = len > 0 ? (root.children as RootContent[]) : [];

      let textToCopy = codeText;
      if (!textToCopy) {
        children.forEach((child) => {
          if (child.type === "element" && child.tagName === "pre") {
            const codeElement = child.children.find(
              (c): c is ElementContent => c.type === "element" && c.tagName === "code",
            );
            if (codeElement && codeElement.type === "element") {
              textToCopy = extractText(codeElement);
            }
          }
        });
      }

      const headerChildren: ElementContent[] = [];

      const { path } = parseMetaString(meta);

      if (displayPath && path) {
        const segments = formatPathSegments(path);
        const allSegments = path.split(/[/\\]/).filter((s) => s.length > 0);
        const hasCollapsedSegments = allSegments.length > 3;
        const fullPath = allSegments.join("/");

        const pathChildren: ElementContent[] = [];
        segments.forEach((segment, index) => {
          const isDirectory = segment.type === "directory";
          const isCollapsed = segment.value === "..";

          const dirIconPath =
            "M64 480H448c35.3 0 64-28.7 64-64V160c0-35.3-28.7-64-64-64H288c-10.1 0-19.6-4.7-25.6-12.8L243.2 57.6C231.1 41.5 212.1 32 192 32H64C28.7 32 0 60.7 0 96V416c0 35.3 28.7 64 64 64z";

          const fileIconPath =
            "M0 64C0 28.7 28.7 0 64 0H224V128c0 17.7 14.3 32 32 32H384V304H176c-8.8 0-16 7.2-16 16s7.2 16 16 16H384V448c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V64zM384 128H256V0L384 128z";

          const properties: Record<string, string> = {
            class: `path-segment ${isDirectory ? "directory" : "file"} ${
              isCollapsed ? "collapsed" : ""
            }`,
          };

          if (isCollapsed && hasCollapsedSegments) {
            properties.title = fullPath;
          }

          pathChildren.push({
            type: "element",
            tagName: "span",
            properties,
            children: [
              {
                type: "element",
                tagName: "svg",
                properties: {
                  class: "icon",
                  width: "14",
                  height: "14",
                  viewBox: "0 0 512 512",
                  fill: "currentColor",
                  "aria-hidden": "true",
                },
                children: [
                  {
                    type: "element",
                    tagName: "path",
                    properties: {
                      d: isDirectory ? dirIconPath : fileIconPath,
                    },
                    children: [],
                  },
                ],
              },
              {
                type: "text",
                value: segment.value,
              },
            ],
          });

          if (index < segments.length - 1) {
            pathChildren.push({
              type: "element",
              tagName: "span",
              properties: { class: "path-separator" },
              children: [
                {
                  type: "text",
                  value: "/",
                },
              ],
            });
          }
        });

        headerChildren.push({
          type: "element",
          tagName: "span",
          properties: { class: "path" },
          children: pathChildren,
        });
      }

      if (displayLang) {
        headerChildren.push({
          type: "element",
          tagName: "span",
          properties: {
            class: "language",
          },
          children: [
            {
              type: "element",
              tagName: "svg",
              properties: {
                class: "icon",
                width: "16",
                height: "16",
                viewBox: "0 0 576 512",
                fill: "currentColor",
                "aria-hidden": "true",
              },
              children: [
                {
                  type: "element",
                  tagName: "path",
                  properties: {
                    d: "M360.8 1.2c-17-4.9-34.7 5-39.6 22l-128 448c-4.9 17 5 34.7 22 39.6s34.7-5 39.6-22l128-448c4.9-17-5-34.7-22-39.6zm64.6 136.1c-12.5 12.5-12.5 32.8 0 45.3l73.4 73.4-73.4 73.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l96-96c12.5-12.5 12.5-32.8 0-45.3l-96-96c-12.5-12.5-32.8-12.5-45.3 0zm-274.7 0c-12.5-12.5-32.8-12.5-45.3 0l-96 96c-12.5 12.5-12.5 32.8 0 45.3l96 96c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L77.3 256 150.6 182.6c12.5-12.5 12.5-32.8 0-45.3z",
                  },
                  children: [],
                },
              ],
            },
            {
              type: "text",
              value: lang,
            },
          ],
        });
      }

      if (!disableCopyButton) {
        headerChildren.push({
          type: "element",
          tagName: "button",
          properties: {
            class: "copy",
            "data-code": textToCopy,
            type: "button",
            "aria-label": "Copy code",
          },
          children: [
            {
              type: "element",
              tagName: "svg",
              properties: {
                class: "icon copy-icon",
                width: "16",
                height: "16",
                viewBox: "0 0 448 512",
                fill: "currentColor",
                "aria-hidden": "true",
              },
              children: [
                {
                  type: "element",
                  tagName: "path",
                  properties: {
                    d: "M384 336l-192 0c-8.8 0-16-7.2-16-16l0-256c0-8.8 7.2-16 16-16l133.5 0c4.2 0 8.3 1.7 11.3 4.7l58.5 58.5c3 3 4.7 7.1 4.7 11.3L400 320c0 8.8-7.2 16-16 16zM192 384l192 0c35.3 0 64-28.7 64-64l0-197.5c0-17-6.7-33.3-18.7-45.3L370.7 18.7C358.7 6.7 342.5 0 325.5 0L192 0c-35.3 0-64 28.7-64 64l0 256c0 35.3 28.7 64 64 64zM64 128c-35.3 0-64 28.7-64 64L0 448c0 35.3 28.7 64 64 64l192 0c35.3 0 64-28.7 64-64l0-16-48 0 0 16c0 8.8-7.2 16-16 16L64 464c-8.8 0-16-7.2-16-16l0-256c0-8.8 7.2-16 16-16l16 0 0-48-16 0z",
                  },
                  children: [],
                },
              ],
            },
            {
              type: "element",
              tagName: "svg",
              properties: {
                class: "icon check-icon",
                width: "16",
                height: "16",
                viewBox: "0 0 16 16",
                fill: "currentColor",
                "aria-hidden": "true",
              },
              children: [
                {
                  type: "element",
                  tagName: "path",
                  properties: {
                    d: "M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z",
                  },
                  children: [],
                },
              ],
            },
          ],
        });
      }

      const wrapper: Root = {
        type: "root",
        children: [
          {
            type: "element",
            tagName: "div",
            properties: {
              class: "mdsvex-shiki",
              tabindex: "-1",
            },
            children: [
              ...(children as ElementContent[]).flatMap((child) => {
                if (child.type === "element" && child.tagName === "pre") {
                  return [
                    {
                      type: "element",
                      tagName: "div",
                      properties: { class: "header" },
                      children: headerChildren,
                    } as ElementContent,
                    {
                      ...child,
                      children: child.children,
                    } as ElementContent,
                  ];
                }
                return child;
              }),
            ],
          },
        ],
      };
      const wrapperElement = wrapper.children[0];
      if (wrapperElement && wrapperElement.type === "element") {
        children.forEach((child) => {
          if (child.type === "element" && child.tagName === "pre" && child.properties.class) {
            const preClassNames = child.properties.class as string;
            if (preClassNames) {
              this.addClassToHast(wrapperElement, preClassNames);
            }
            const preStyle = child.properties.style;
            if (preStyle) {
              wrapperElement.properties.style = preStyle;
            }
          }
        });
      }

      return wrapper;
    },
  };
};
