import { extract_lines } from '@beenotung/tslib/string'
import { translate } from './client'
import debug from 'debug'

let log = debug('test')
log.enabled = true

let source_lang = 'en'
let target_lang = 'zh'

let text = `
The future of healthcare is here
For patients:
For providers:
`

async function main() {
  let lines = extract_lines(text)
  let label = 'translate ' + lines.length + ' items'
  console.time(label)
  await Promise.all(
    lines.map(async src => {
      let out = await translate({
        text: src,
        target_lang,
        source_lang,
      })
      log({ src, out })
    }),
  )
  console.timeEnd(label)

  {
    let src = `
Our virtual clinics empower patients to receive care anytime, anywhere, provided by our licensed therapists using XR technology
`
    console.time('translate long text')
    console.log(`${'='.repeat(8)} ${source_lang} ${'='.repeat(8)}`)
    console.log(src)
    console.log(`${'='.repeat(8)} ${target_lang} ${'='.repeat(8)}`)
    let out = await translate({
      text: src,
      source_lang,
      target_lang,
    })
    console.log(out)
    console.log('='.repeat(8 + 4 + 8))
    console.timeEnd('translate long text')
  }
}
main().catch(e => console.error(e))
