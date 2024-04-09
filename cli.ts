import debug from 'debug'
import { autoStartServer, startServer, stopServer } from './server'
import { preloadModel } from './client'
import { defaultConfig } from './config'

let config = {
  debug: false,
  port: defaultConfig.port,
  image: defaultConfig.image,
}

for (let i = 2; i < process.argv.length; i++) {
  let arg = process.argv[i]
  switch (arg) {
    case '--port': {
      i++
      let port = +process.argv[i]
      if (!port) {
        console.error('Error: Invalid port')
        process.exit(1)
      }
      config.port = port
      break
    }
    case '--debug': {
      config.debug = true
      break
    }
    case '--image': {
      i++
      let image = process.argv[i]
      if (!image) {
        console.error('Error: missing docker image name')
        process.exit(1)
      }
      config.image = image
      break
    }
    case '--version':
    case '-v': {
      let pkg = require('./package.json')
      console.log(pkg.name + ' v' + pkg.version)
      process.exit(0)
    }
    case '--help':
    case '-h': {
      let cmd = 'easynmt-server'
      console.log(
        `
Usage: ${cmd} [options]

Options:
  --port <port>   | Set the port number (default: 24080)
  --image <image> | Set the Docker image name (default: 'easynmt/api:2.0-cpu')
  --debug         | Enable debug mode
  -v, --version   | Display the version number
  -h, --help      | Show this help message

Examples:
${cmd}
${cmd} --image 'easynmt/api:2.0.2-cuda11.3' --port 8100 --debug
`.trim(),
      )
      process.exit(0)
    }
  }
}

let log = debug('app-cli')
log.enabled = config.debug

async function main() {
  if (config.debug) {
    log('clean up existing server')
    stopServer(config)

    log('starting server')
    let server = startServer(config)
    await server.ready
    log('server ready')
  } else {
    await autoStartServer(config)
  }

  log('preloading zh -> english model')
  await preloadModel({
    source_lang: 'zh',
    target_lang: 'en',
    debug: config.debug,
  })
  log('preloaded zh -> english model')

  console.log('ready.')
}
main().catch(e => console.error(e))
