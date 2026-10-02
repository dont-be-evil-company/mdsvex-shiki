import type { Action } from "svelte/action";

/**
 * Svelte action to enable copy button functionality for mdsvex-shiki code blocks.
 * Apply this action to a container element that contains the code blocks.
 *
 * @example
 * ```svelte
 * <div use:copyAction>
 *   {@html content}
 * </div>
 * ```
 */
export const copyAction: Action<HTMLElement> = (node) => {
  const handleClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    const button = target.closest("button.copy");

    if (button) {
      const codeText = button.getAttribute("data-code");
      if (codeText) {
        navigator.clipboard
          .writeText(codeText)
          .then(() => {
            button.classList.add("copied");
            setTimeout(() => {
              button.classList.remove("copied");
            }, 2000);
          })
          .catch((err) => {
            console.error("Failed to copy code:", err);
          });
      } else {
        const codeBlock = button.closest(".mdsvex-shiki")?.querySelector("code");
        if (codeBlock) {
          navigator.clipboard
            .writeText(codeBlock.textContent || "")
            .then(() => {
              button.classList.add("copied");
              setTimeout(() => {
                button.classList.remove("copied");
              }, 2000);
            })
            .catch((err) => {
              console.error("Failed to copy code:", err);
            });
        }
      }
    }
  };

  node.addEventListener("click", handleClick);

  return {
    destroy() {
      node.removeEventListener("click", handleClick);
    },
  };
};
