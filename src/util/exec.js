const { spawn, exec } = require('child_process')
function promisified_spawn(cmd, args, workingDir, log) {
  log.info(
    `launching ${cmd} with args: ${args} with working Directory: ${workingDir}`,
  )
  return new Promise((resolve, reject) => {
    const process = spawn(cmd, args, { cwd: workingDir })
    process.on('exit', function (code) {
      if (code) {
        log.error('child process terminated with code: ' + code)
        reject(code)
      }
      log.info('child process terminated with code: ' + code)
      resolve(code)
    })
    process.on('close', function (code) {
      resolve(code)
    })
    process.stdout.on('data', function (data) {
      log.info('childprocess: ' + data.toString())
    })
    process.stderr.on('data', function (data) {
      log.error('childprocess: ' + data.toString())
    })
  })
}

module.exports = { promisified_spawn }
