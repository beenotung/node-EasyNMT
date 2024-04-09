# node-EasyNMT

multi-language translate using UKPLab/EasyNMT

Remark: For the server side, you need to have docker installed and available in the `PATH`. Also, your current user should have the privilege to run docker cli.

## Usage (browser)

```html
<script src="https://cdn.jsdelivr.net/npm/node-easynmt@1/bundle.js"></script>
<script>
  console.log(easyNMT)
  /*
  {
    // for direct usage
    compress,
    decompress,

    // for custom wrapper
    decode,
    addValue,

    // to remove undefined object fields
    trimUndefined,
    trimUndefinedRecursively,
  }
  */
</script>
```

## Usage (nodejs)

### Installation

```bash
npm i node-easynmt
```

run server:

```typescript
import { autoStartServer } from 'node-easynmt/server'

// start a docker container if not already running
autoStartServer({ port: 24080 })
  .then(() => console.log('ready.'))
  .catch(err => console.error(err))
```

call from client:

```typescript
import { translate } from 'node-easynmt/client'

let zh = '世界你好'
let en = await translate({
  text: zh,
  source_lang: 'zh',
  target_lang: 'en',
})
console.log(`sample: ${zh} -> ${en}`)
```

### Typescript Signature

```typescript
export function translate(options: {
  text: string
  target_lang: string
  /** @description auto detect if not specified */
  source_lang?: string
  debug?: boolean
}): Promise<string>
```

## Usage (cli)

run server:

```bash
docker run -p 24080:80 easynmt/api:2.0-cpu
```

send request:

```bash
curl "http://localhost:24080/translate?target_lang=en&text=Hallo%20Welt"
```

json response:

```json
{
  "target_lang": "en",
  "source_lang": null,
  "detected_langs": ["de"],
  "translated": ["Hello world"],
  "translation_time": 77.64211463928223
}
```

## License

This project is licensed with [BSD-2-Clause](./LICENSE)

This is free, libre, and open-source software. It comes down to four essential freedoms [[ref]](https://seirdy.one/2021/01/27/whatsapp-and-the-domestication-of-users.html#fnref:2):

- The freedom to run the program as you wish, for any purpose
- The freedom to study how the program works, and change it so it does your computing as you wish
- The freedom to redistribute copies so you can help others
- The freedom to distribute copies of your modified versions to others
