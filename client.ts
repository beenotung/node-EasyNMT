import { array, float, nullable, object, optional, string } from 'cast.ts'
import { defaultConfig } from './config'

let parser = object({
  target_lang: string({ sampleValue: 'en' }),
  source_lang: nullable(string({ sampleValue: 'de' })),
  detected_langs: optional(array(string({ sampleValue: 'de' }))),
  translated: array(string({ sampleValue: 'Hello world' })),
  translation_time: float({ sampleValue: 77.64211463928223 }),
})

export type TranslateOptions = {
  /** @default 'localhost' */
  host?: string
  /** @default 24080 */
  port?: number
  /** @example 'Hello World!' */
  text: string
  /** @example 'zh' */
  target_lang: string
  /** @description auto detect if not specified */
  source_lang?: string
  /** @default false */
  debug?: boolean
}

/**
 * @description set HTTP request to the translate service running in the docker container
 * */
export async function translate(options: TranslateOptions): Promise<string> {
  let host = options.host || 'localhost'
  let port = options.port || defaultConfig.port

  let params = new URLSearchParams({
    target_lang: options.target_lang,
    text: options.text,
  })
  if (options.source_lang) {
    params.set('source_lang', options.source_lang)
  }

  let url = `http://${host}:${port}/translate?${params}`

  let res = await fetch(url)
  let json = await res.json()

  if (options.debug) {
    console.error('translate:', { options, result: json })
  }

  let result = parser.parse(json)
  return result.translated[0]
}

let async_queue = Promise.resolve()

// source_lang -> target_lang -> in_text -> out_text
let source_target_text_cache = new Map<
  string,
  Map<string, Map<string, string>>
>()

export type PatchedTranslateOptions = TranslateOptions & {
  /**
   * @description to avoid ajax timeout when doing lots on translate concurrently
   * @default true
   * */
  async_queue?: boolean
  /**
   * @description to keep in-memory cache
   * @default true
   * */
  cached?: boolean
  /**
   * @description to avoid repeating (wrong) result.
   * e.g. without wrapping: Transparent -> 透明透明
   * @default true
   */
  wrap_text?: boolean
  /**
   * @description trim the output if the input is already trimmed
   * @default true
   */
  smart_trim?: boolean
}

/**
 * @description apply combination of fixes to workaround common errors
 */
export async function patchedTranslate(
  options: PatchedTranslateOptions,
): Promise<string> {
  if (!options.text.trim()) {
    return options.text
  }
  return cachedTranslate(options)
}

async function cachedTranslate(
  options: PatchedTranslateOptions,
): Promise<string> {
  if (options.cached == false) {
    return trimmedTranslate(options)
  }

  let source_lang = options.source_lang || '?'

  let target_text_cache = source_target_text_cache.get(source_lang)
  if (!target_text_cache) {
    target_text_cache = new Map()
    source_target_text_cache.set(source_lang, target_text_cache)
  }

  let text_cache = target_text_cache.get(options.target_lang)
  if (!text_cache) {
    text_cache = new Map()
    target_text_cache.set(options.target_lang, text_cache)
  }

  let out = text_cache.get(options.text)
  if (!out) {
    out = await trimmedTranslate(options)
    text_cache.set(options.text, out)
  }

  return out
}

async function trimmedTranslate(
  options: PatchedTranslateOptions,
): Promise<string> {
  if (options.smart_trim == false) {
    return wrappedTranslate(options)
  }
  let in_text = options.text
  let out_text = await wrappedTranslate(options)
  if (in_text == in_text.trim()) {
    out_text = out_text.trim()
  }
  return out_text
}

async function wrappedTranslate(
  options: PatchedTranslateOptions,
): Promise<string> {
  let need_wrap = options.source_lang != 'zh'

  if (options.wrap_text == false || !need_wrap) {
    return queuedTranslate(options)
  }

  let in_text = options.text
  let wrapped_in_text = in_text

  // switch case
  if (
    in_text.length >= 2 &&
    isUpperCase(in_text[0]) &&
    isLowerCase(in_text[1])
  ) {
    wrapped_in_text = in_text[0].toLocaleLowerCase() + in_text.slice(1)
  }

  // wrap with sentence ending char
  let is_wrapped = in_text.endsWith(':') || in_text.endsWith('：')
  if (!is_wrapped) {
    wrapped_in_text += ':'
  }

  options.text = wrapped_in_text

  let out_text = await queuedTranslate(options)

  // unwrap ending char
  if (!is_wrapped && (out_text.endsWith(':') || out_text.endsWith('：'))) {
    out_text = out_text.slice(0, -1)
  }

  return out_text
}

function isLowerCase(char: string) {
  return char && char == char.toLocaleLowerCase()
}

function isUpperCase(char: string) {
  return char && char == char.toLocaleUpperCase()
}

function queuedTranslate(options: PatchedTranslateOptions): Promise<string> {
  if (options.async_queue == false) {
    return translate(options)
  }
  return new Promise<string>((resolve, reject) => {
    async_queue = async_queue.then(() =>
      translate(options).then(resolve).catch(reject),
    )
  })
}

/**
 * @description release the memory used by patchedTranslate()
 */
export function clearCache() {
  for (let target_text_cache of source_target_text_cache.values()) {
    for (let text_cache of target_text_cache.values()) {
      text_cache.clear()
    }
    target_text_cache.clear()
  }
  source_target_text_cache.clear()
}

/**
 * @description optionally step to preload the translate model before the actual usage.
 */
export async function preloadModel(options: {
  target_lang: string
  source_lang: string
  /**
   * @description to log in console or not
   * @default false
   *
   */
  debug?: boolean
}): Promise<void> {
  if (options.debug) {
    console.error('preloading model:', {
      target_lang: options.target_lang,
      source_lang: options.source_lang,
    })
  }
  await translate({
    text: 'preload model',
    target_lang: options.target_lang,
    source_lang: options.source_lang,
    debug: options.debug,
  })
  if (options.debug) {
    console.error('preloaded model:', {
      target_lang: options.target_lang,
      source_lang: options.source_lang,
    })
  }
}
