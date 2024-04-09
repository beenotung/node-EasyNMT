import { array, float, nullable, object, optional, string } from 'cast.ts'
import { defaultConfig } from './config'

let parser = object({
  target_lang: string({ sampleValue: 'en' }),
  source_lang: nullable(string({ sampleValue: 'de' })),
  detected_langs: optional(array(string({ sampleValue: 'de' }))),
  translated: array(string({ sampleValue: 'Hello world' })),
  translation_time: float({ sampleValue: 77.64211463928223 }),
})

/** @description set HTTP request to the translate service running in the docker container */
export async function translate(options: {
  /** @default 'localhost' */
  host?: string
  /** @default 24080 */
  port?: number
  text: string
  target_lang: string
  /** @description auto detect if not specified */
  source_lang?: string
  debug?: boolean
}): Promise<string> {
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

export async function preloadModel(options: {
  target_lang: string
  source_lang: string
  debug?: boolean
}) {
  if (options.debug) {
    console.error('preload model:', {
      target_lang: options.target_lang,
      source_lang: options.source_lang,
    })
  }
  await translate({
    text: 'preload model',
    target_lang: options.target_lang,
    source_lang: options.source_lang,
  })
}
