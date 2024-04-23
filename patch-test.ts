import { patchedTranslate, translate } from './client'

async function test(in_text: string, expected: string) {
  console.log({ in_text })
  let out_text = await translate({
    source_lang: 'en',
    target_lang: 'zh',
    text: in_text,
  })
  console.log({ out_text })
  let patched_out_text = await patchedTranslate({
    source_lang: 'en',
    target_lang: 'zh',
    text: in_text,
  })
  console.log({ patched_out_text })
  console.log({ match: patched_out_text === expected })
  console.log()
}

async function loadTest() {
  let res = await Promise.all(
    new Array(300).fill(0).map(() =>
      patchedTranslate({
        source_lang: 'en',
        target_lang: 'zh',
        text: 'Transparent',
      }),
    ),
  )
  console.log(res)
}

async function main() {
  await test('Transparent', '透明')
  await test('Contact', '联系人')

  if (!'test') {
    loadTest()
  }
}
main().catch(e => console.error(e))
