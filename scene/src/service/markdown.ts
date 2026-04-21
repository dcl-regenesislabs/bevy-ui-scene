import { store } from '../state/store'
import { pushPopupAction } from '../state/hud/actions'
import { HUD_POPUP_TYPE } from '../state/hud/state'

const LINK_COLOR = '#00B1FE'
const LINK_TYPE_URL = 'url'

function wrapAsLink(label: string, url: string): string {
  return `<color=${LINK_COLOR}><link=${LINK_TYPE_URL}::${url}>${label}</link></color>`
}

/**
 * Convert a minimal markdown string to a React ECS `uiText` value.
 *
 * bevy-explorer only supports these inline tags inside text:
 *   `<b> <i> <s> <u> <mark=#hex> <color=#hex> <link=label>`
 * (everything else from Unity rich text — `<size>`, `<align>`, `<sprite>`,
 * `<voffset>`, `<sup>`, etc. — is ignored.)
 *
 * Mapping implemented:
 *  - `**bold**`           → `<b>bold</b>`
 *  - `*italic*`           → `<i>italic</i>`
 *  - `~~strike~~`         → `<s>strike</s>`
 *  - `[label](url)`       → `<color=…><link=url::url>label</link></color>`
 *  - raw `https?://…`     → auto-linkified with the URL itself as the label
 *
 * Headers (`# …`), quotes (`> …`), lists (`- …`), inline code (`` `…` ``) and
 * images (`![…](…)`) have no bevy equivalent and are left as plain text.
 *
 * Markdown links and raw URLs are matched in a single pass so a URL inside
 * `[…](…)` is consumed by the markdown rule and never re-wrapped by the raw
 * URL rule. Newlines are preserved.
 *
 * Use together with {@link handleMarkdownLinkClick} as the `onMouseDown` of the
 * `Label` that renders the value, so link taps open the URL popup.
 */
export function markdownToUiTextValue(md: string): string {
  if (md == null || md.length === 0) return ''
  // 1) Links: markdown link OR raw URL in a single pass.
  let out = md.replace(
    /\[([^\]]+)\]\(([^)\s]+)\)|(https?:\/\/[^\s"',)\]]+)/g,
    (_match, label: string, url: string, rawUrl: string) => {
      if (rawUrl != null) return wrapAsLink(rawUrl, rawUrl)
      return wrapAsLink(label, url)
    }
  )
  // 2) Bold (run before italic so `**` doesn't get partially consumed).
  out = out.replace(
    /\*\*([^*]+)\*\*/g,
    (_match, text: string) => `<b>${text}</b>`
  )
  // 3) Italic. After bold runs there are no more `**` pairs, so any single
  //    `*…*` is italic.
  out = out.replace(
    /\*([^*\s][^*]*?)\*/g,
    (_match, text: string) => `<i>${text}</i>`
  )
  // 4) Strikethrough.
  out = out.replace(
    /~~([^~]+)~~/g,
    (_match, text: string) => `<s>${text}</s>`
  )
  return out
}

/**
 * `onMouseDown` handler for a `Label` rendering markdown-converted text.
 * Detects link taps via `event.hit.meshName` and dispatches the URL popup.
 */
export function handleMarkdownLinkClick(event: unknown): void {
  const meshName = (event as { hit?: { meshName?: string } } | undefined)?.hit
    ?.meshName
  if (meshName == null) return
  const sep = meshName.indexOf('::')
  if (sep === -1) return
  const type = meshName.slice(0, sep)
  const value = meshName.slice(sep + 2)
  if (type === LINK_TYPE_URL && value.length > 0) {
    store.dispatch(
      pushPopupAction({
        type: HUD_POPUP_TYPE.URL,
        data: value
      })
    )
  }
}
