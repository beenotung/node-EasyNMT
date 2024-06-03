import { ChildProcess, exec, execSync } from 'child_process'
import { defaultConfig } from './config'

export type ServerOptions = {
  /** @default 24080 */
  port?: number
  /** @default 'easynmt/api:2.0-cpu' */
  image?: string
  /** @default false */
  debug?: boolean
  /** @default 'docker-easynmt'' */
  container?: string
}

function expandOptions(options?: ServerOptions): Required<ServerOptions> {
  let port = options?.port || defaultConfig.port
  let image = options?.image || defaultConfig.image
  let debug = options?.debug || false
  let container = options?.container || defaultConfig.container
  return {
    port,
    image,
    debug,
    container,
  }
}

function parse_docker_ps_line(line: string) {
  // e.g. "CONTAINER ID   IMAGE                 COMMAND       CREATED             STATUS          PORTS                                     NAMES"
  if (line.startsWith('CONTAINER ID') && line.endsWith('NAMES')) {
    return
  }
  // e.g. "06ef13feb536   easynmt/api:2.0-cpu   "/start.sh"              9 minutes ago   Exited (137) 4 seconds ago              docker-easynmt2"
  // e.g. "06ef13feb536   easynmt/api:2.0-cpu   "/start.sh"              8 minutes ago   Up 44 seconds                 0.0.0.0:24080->80/tcp, :::24080->80/tcp   docker-easynmt2"
  let parts = line.split(' ').filter(part => part.length > 0)
  let id = parts[0]
  let image = parts[1]
  let name = parts[parts.length - 1]

  if (!id || !image || !name) return

  let running = !parts.includes('Exited') && parts.includes('Up')

  function parsePortFromLine() {
    return parts
      .map(part => {
        // e.g. "0.0.0.0:24080->80/tcp,"
        // e.g. ":::24080->80/tcp"
        let parts = part.split('->')
        if (parts.length != 2) return
        let port = parts[0].split(':').pop()
        if (!port) return
        return +port
      })
      .find(port => Number.isInteger(port))
  }
  function parsePortFromInspect() {
    // e.g. "map[80/tcp:[{ 24080}]]"
    let text = execSync(
      `docker inspect ${name} --format '{{ .HostConfig.PortBindings }}'`,
    ).toString()
    let matches = text.match(/{ *\d+}/g)
    if (!matches) return
    return matches
      .map(part => {
        // e.g. "{ 24080}"
        let match = part.match(/\d+/)
        if (!match) return
        return +match[0]
      })
      .find(port => Number.isInteger(port))
  }
  let port = running ? parsePortFromLine() : parsePortFromInspect()

  return { id, image, name, port, running }
}

/** @description scan existing (running) docker container */
export function scanServer(options?: ServerOptions): string[] {
  let { port, image, debug } = expandOptions(options)
  let ids = execSync('docker ps')
    .toString()
    .split('\n')
    .map(line => parse_docker_ps_line(line))
    .filter(
      container =>
        container && (container.port == port || container.image == image),
    )
    .map(container => container!.id)
  return ids
}

/** @description stop the docker container */
export function stopServer(options?: ServerOptions) {
  let { port, image, container: containerName, debug } = expandOptions(options)
  let ids = execSync('docker ps -a')
    .toString()
    .split('\n')
    .map(line => parse_docker_ps_line(line))
    .filter(
      container =>
        container &&
        (container.image == image ||
          container.name == containerName ||
          container.port == port),
    )
    .map(container => container!.id)
  if (ids.length > 0) {
    if (debug) {
      console.error('stop docker containers:', ids)
    }
    execSync(`docker stop ${ids.join(' ')}`)
  }
}

function resumeContainer(options: { name: string; debug: boolean }) {
  let { name, debug } = options
  execSync(`docker start ${name}`)
  let childProcess: ChildProcess = null as any
  let ready = new Promise<void>((resolve, reject) => {
    childProcess = exec(`docker logs --follow ${name}`)
    let timer: ReturnType<typeof setTimeout> | null = null
    let onData = (data: string) => {
      if (debug) {
        process.stderr.write(data)
      }
      if (timer) {
        clearTimeout(timer)
      }
      timer = setTimeout(() => {
        if (data.toLowerCase().replaceAll('errorlog', '').includes('error')) {
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
      }, 1000)
    }
    childProcess.stdout!.on('data', onData)
    childProcess.stderr!.on('data', onData)
  })
  return { childProcess, ready }
}

function startContainer(options: {
  image: string
  name: string
  port: number
  debug: boolean
}) {
  let { image, name, port, debug } = options
  let childProcess: ChildProcess = null as any
  let ready = new Promise<void>((resolve, reject) => {
    childProcess = exec(`docker run --name ${name} -p ${port}:80 ${image}`)
    let onData = (data: string) => {
      if (debug) {
        process.stderr.write(data)
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

function scanContainer(options: { image: string; name: string; port: number }) {
  let { image, name, port } = options
  let lines = execSync('docker ps -a').toString().split('\n')
  for (let line of lines) {
    let container = parse_docker_ps_line(line)
    if (!container) continue
    if (container.port == port && container.name != name && container.running) {
      throw new Error(
        `port ${port} is used by another container "${container.name}"`,
      )
    }
    if (
      container.port == port &&
      container.image != image &&
      container.running
    ) {
      throw new Error(
        `port ${port} is used by another image "${container.name}"`,
      )
    }
    if (container.name == name && container.image != image) {
      throw new Error(
        `container name "${name}" is used by another image "${container.image}"`,
      )
    }
    if (container.name == name && container.port != port) {
      throw new Error(
        `container "${name}" is using another port "${container.port}"`,
      )
    }
    if (container.image == image && container.port == port) {
      return container
    }
  }
}

/** @description start a docker container */
export function startServer(options?: ServerOptions): {
  childProcess?: ChildProcess
  ready: Promise<void>
} {
  let { port, image, debug, container: name } = expandOptions(options)
  let container = scanContainer({ image, name, port })
  if (container && container.running) {
    console.log('[DEV] container already running?', container)
    return { ready: Promise.resolve() }
  }
  if (container && !container.running) {
    console.log('[DEV] container to be resume:', container)
    return resumeContainer({ name, debug })
  }
  console.log('[DEV] start container...')
  return startContainer({ image, name, port, debug })
}

/** @description start a docker container if not already running */
export async function autoStartServer(options?: ServerOptions) {
  let ids = scanServer(options)
  if (ids.length == 0) {
    let server = startServer()
    await server.ready
  }
}
