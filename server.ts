import { exec, execSync } from 'child_process'
import { defaultConfig } from './config'

export type ServerOptions = {
  /** @default 24080 */
  port?: number
  /** @default 'easynmt/api:2.0-cpu' */
  image?: string
  /** @default false */
  debug?: boolean
}

function expandOptions(options?: ServerOptions): Required<ServerOptions> {
  let port = options?.port || defaultConfig.port
  let image = options?.image || defaultConfig.image
  let debug = options?.debug || false
  return {
    port,
    image,
    debug,
  }
}

/** @description scan existing (running) docker container */
export function scanServer(options?: ServerOptions): string[] {
  let { port, image, debug } = expandOptions(options)
  let ids = execSync('docker ps')
    .toString()
    .split('\n')
    .filter(line => line.includes(`:${port}->`) || line.includes(` ${image} `))
    .map(line => line.trim().split(' ')[0])
  return ids
}

/** @description stop the docker container */
export function stopServer(options?: ServerOptions) {
  let { port, image, debug } = expandOptions(options)
  let ids = execSync('docker ps')
    .toString()
    .split('\n')
    .filter(line => line.includes(`:${port}->`) || line.includes(` ${image} `))
    .map(line => line.trim().split(' ')[0])
  if (ids.length > 0) {
    if (debug) {
      console.error('stop docker containers:', ids)
    }
    execSync(`docker stop ${ids.join(' ')}`)
  }
}

/** @description start a docker container */
export function startServer(options?: ServerOptions) {
  let { port, image, debug } = expandOptions(options)
  let childProcess = exec(`docker run -p ${port}:80 ${image}`)
  function log(message: string) {
    if (debug) {
      process.stderr.write(message)
    }
  }
  let ready = new Promise<void>((resolve, reject) => {
    let onData = (data: string) => {
      if (debug) {
        log(data)
      }
      if (data.toLowerCase().includes('error')) {
        reject(new Error(data))
      } else if (data.includes('Application startup complete')) {
        resolve()
      } else {
        return
      }
      if (!debug) {
        childProcess.stdout!.off('data', onData)
        childProcess.stderr!.off('data', onData)
      }
    }
    childProcess.stdout!.on('data', onData)
    childProcess.stderr!.on('data', onData)
  })
  return { childProcess, ready }
}

/** @description start a docker container if not already running */
export async function autoStartServer(options?: ServerOptions) {
  let ids = scanServer(options)
  if (ids.length == 0) {
    let server = startServer()
    await server.ready
  }
}
