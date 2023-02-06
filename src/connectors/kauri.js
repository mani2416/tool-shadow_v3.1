const fs = require('fs').promises
const path = require('path')
const ipUtil = require('../util/ip-util')
const { promisified_spawn } = require('../util/exec')
const util = require('util')
const exec = util.promisify(require('node:child_process').exec)
const { isNullOrEmpty } = require('../util/helpers')
const processName = 'hotstuff-app'
const ipsFile = 'ips.txt'
function _parse(replicaSettings, clientSettings) {
  //TODO
}

function getProcessName() {
  return processName
}

async function writeHosts(ips, log) {
  let replicaString = ''
  for (let i = 0; i < ips.length; i++) {
    if (!ips[i].isClient) replicaString += ips[i].ip + ' 1\n'
  }
  await fs.writeFile(path.join(process.env.KAURI_DIR, ipsFile), replicaString)
  log.info('Wrote clients file!')
}

async function genArtifacts(replicaSettings, log) {
  log.info('Generating artifacts...')
  log.debug(`Launching Kauri's gen script...`)
  await promisified_spawn(
    'python3',
    [
      'scripts/gen_conf.py',
      '--ips',
      ipsFile,
      '--crypto',
      'bls',
      '--fanout',
      replicaSettings.fanout,
      '--pipedepth',
      replicaSettings.pipeDepth,
      '--pipelatency',
      replicaSettings.pipeLatency,
      '--block-size',
      replicaSettings.blockSize,
    ],

    process.env.KAURI_DIR,
    log,
  )
  log.info('Finished generating artifacts...')
}
async function passArgs(hosts, replicaSettings, clientSettings, log) {
  let pacemakerString = ' '
  if (replicaSettings.pacemaker && replicaSettings.pacemaker.type == 'rr') {
    pacemakerString += `--pace-maker rr`
    if (replicaSettings.pacemaker.propDelay)
      pacemakerString += ` --prop-delay ${replicaSettings.pacemaker.propDelay}`
    if (replicaSettings.pacemaker.baseTimeout)
      pacemakerString += ` --base-timeout ${replicaSettings.pacemaker.baseTimeout}`
  } else pacemakerString += '--pace-maker dummy'
  pacemakerString += ` --imp-timeout ${
    replicaSettings.pacemaker && replicaSettings.pacemaker.impTimer
      ? replicaSettings.pacemaker.impTimer
      : 1
  }`
  let replicaIndex = 0
  let clientIndex = 0
  let clientHostIndex = 1 // BEWARE: IT STARTS AT 1
  let clientsPerHost = Math.floor(
    clientSettings.clients / clientSettings.numberOfHosts,
  )
  let clientsOnLastHost =
    clientsPerHost + (clientSettings.clients % clientSettings.numberOfHosts) // WATCH OUT CAN BE 0

  log.debug(
    `clients per host: ${clientsPerHost}, last host gets: ${clientsOnLastHost}`,
  )
  for (let i = 0; i < hosts.length; i++) {
    if (hosts[i].isClient) {
      let clientsOnCurrentHost =
        clientHostIndex < clientSettings.numberOfHosts
          ? clientsPerHost
          : clientsOnLastHost
      hosts[i].procs = []
      for (let j = 0; j < clientsOnCurrentHost; j++) {
        hosts[i].procs.push({
          path: process.env.HOTSTUFF_CLIENT_BIN,
          env: '',
          args: `--cid ${clientIndex} --iter -1 --max-async ${clientSettings.outStandingPerClient}`,
          startTime: clientSettings.startTime
            ? clientSettings.startTime
            : '0 s',
        })
        log.debug(
          `client ${clientIndex} added on host: ${clientHostIndex} with path: ${
            hosts[i].procs[hosts[i].procs.length - 1].path
          }, env: ${hosts[i].procs[hosts[i].procs.length - 1].env} and  args:${
            hosts[i].procs[hosts[i].procs.length - 1].args
          }`,
        )
        clientIndex++
      }
      clientHostIndex++
      continue
    }
    let conf = path.join(
      process.env.KAURI_DIR,
      `hotstuff.gen-sec${replicaIndex}.conf`,
    )
    hosts[i].procs = []
    hosts[i].procs.push({
      path: process.env.KAURI_REPLICA_BIN,
      env: '',
      args: `--conf ${conf}` + pacemakerString,
      startTime: 0,
    })
    log.debug(
      `replica ${replicaIndex} added on host: ${replicaIndex} with path: ${
        hosts[i].procs[hosts[i].procs.length - 1].path
      }, env: ${hosts[i].procs[hosts[i].procs.length - 1].env} and  args:${
        hosts[i].procs[hosts[i].procs.length - 1].args
      }`,
    )
    replicaIndex++
  }
  return hosts
}

async function build(replicaSettings, clientSettings, log) {
  log.info('initating Kauri build...')

  await promisified_spawn(
    'cmake',
    [
      '-DCMAKE_BUILD_TYPE=Release',
      '-DBUILD_SHARED=ON',
      '-DHOTSTUFF_PROTO_LOG=ON',
      `-DCMAKE_CXX_FLAGS=-DHOTSTUFF_CMD_RESPSIZE=${replicaSettings.replySize} -DHOTSTUFF_CMD_REQSIZE=${clientSettings.requestSize}`,
    ],
    process.env.KAURI_DIR,
    log,
  )
  await promisified_spawn('make', [], process.env.KAURI_DIR, log)
  log.info('Kauri build terminated successfully!')
}
async function configure(replicaSettings, clientSettings, log) {
  log.info('parsing replica and client objects')
  _parse(replicaSettings, clientSettings)
  log.info('objects parsed!')
  log.debug(
    `generating ${replicaSettings.replicas} ips for replicas and ${clientSettings.numberOfHosts} for clients`,
  )
  const hostIPs = await ipUtil.getIPs({
    [process.env.KAURI_REPLICA_HOST_PREFIX]: replicaSettings.replicas,
    [process.env.KAURI_CLIENT_HOST_PREFIX]: clientSettings.numberOfHosts,
  })
  for (let i = 0; i < hostIPs.length; i++) {
    if (hostIPs[i].name.startsWith(process.env.KAURI_REPLICA_HOST_PREFIX))
      hostIPs[i].isClient = false
    else hostIPs[i].isClient = true
  }
  await writeHosts(hostIPs, log)
  await genArtifacts(replicaSettings, log)
  let hosts = await passArgs(hostIPs, replicaSettings, clientSettings, log)
  return hosts
}
function getExecutionDir() {
  return process.env.KAURI_EXECUTION_DIR
}
function getExperimentsOutputDirectory() {
  return process.env.KAURI_EXPERIMENTS_OUTPUT_DIR
}
module.exports = {
  build,
  configure,
  getStats,
  getProcessName,
  getExecutionDir,
  getExperimentsOutputDirectory,
}