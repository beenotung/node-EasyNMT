import { extract_lines } from '@beenotung/tslib/string'
import { translate } from './client'
import debug from 'debug'

let log = debug('test')
log.enabled = true

let text = `
護眼素
靈芝孢子
迷你打印機
防水背囊
復古手袋
海鹽瓜子
森林友好環保紙巾
高鈣低脂植物奶
機電署認證萬能插蘇拖把
4K LED 34寸電視
麥樂雞
電池爐
Level 3 醫用口罩
打印機代用墨盒
港式奶茶紙包飲品
電腦學高級文憑課程
會員積分程式推廣
鹽焗開心果
`

async function main() {
  let names = extract_lines(text)
  let label = 'translate ' + names.length + ' items'
  console.time(label)
  await Promise.all(
    names.map(async src => {
      let en = await translate({
        text: src,
        target_lang: 'en',
        source_lang: 'zh',
      })
      log({ src, en })
    }),
  )
  console.timeEnd(label)

  {
    let src = `🤔ESG關中小企同初創微企事嗎？
.
先講一個故事先，話說某大龍頭手機製造商，因要推高股價，所以不得不搞好佢嘅ESG評級（ESG評級會直接影響股價的），而其中一個好影響ESG評級嘅因素就係供應鏈（Supply Chain）嘅上游供應商所提供嘅部件有冇跟足ESG嘅玩法，以該手機製造商為例，佢地嘅螺絲就需要同上游嘅供應商攞貨。但係如果果間上游廠商僱用童工或者狂chur員工開工唔比員工休息，又或者粒螺絲用咗啲唔環保嘅物料嚟製作，又或者間上游廠嘅董事局中嘅男女比例係清一色男性，咁都係違反咗ESG，如果該手機製造商用哩間上游廠所生產嘅部件，佢嘅ESG評級就會被拉低，股價亦會隨之而下滑！
.
咁，即係同中小企同初創微企有咩關係？
.
咁當然有關吧，試諗吓，如果你嘅公司唔符合ESG標準，咁其他要同你攞貨嘅廠商仲會唔會揀你？你話如果你賣得平啲，咁假如另一間廠商同你價錢差唔多但ESG做得好過你，咁下游廠商會揀你定佢？`
    console.time('translate long text')
    console.log('='.repeat(8) + ' zh ' + '='.repeat(8))
    console.log(src)
    console.log('='.repeat(8) + ' en ' + '='.repeat(8))
    let en = await translate({
      text: src,
      source_lang: 'zh',
      target_lang: 'en',
    })
    console.log(en)
    console.log('='.repeat(8 + 4 + 8))
    console.timeEnd('translate long text')
  }
}
main().catch(e => console.error(e))
