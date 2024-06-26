const fetch = require('node-fetch')
const https = require('https')
// Temporary fix for CloudPing SSL issue
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
})

// cloudping daily averages api endpoint

const apiUrl = 'https://api-demo.cloudping.co/averages'

/*
async function getLatencies(log) {
  let latencies = new Object()

  log.info('getting latencies from cloudping ...')
  try {
    const response = await fetch(apiUrl, { method: 'GET', agent: httpsAgent })
    if (response.ok) {
      log.info('got ok response from cloudping!')
      const json = await response.json()
      for (let i = 0; i < json.length; i++) {
        let currentRegion = json[i].region
        latencies[currentRegion] = new Object()
        for (let j = 0; j < json[i].averages.length; j++) {
          let destinationRegion = json[i].averages[j].regionTo
          let RTT = parseFloat(json[i].averages[j].average).toFixed(3)
          latencies[currentRegion][destinationRegion] = new Object()
          latencies[currentRegion][destinationRegion] = Math.floor(
            (RTT * 1000) / 2,
          )
        }
      }
      return latencies
    } else {
      throw Error('could not retrieve latencies from cloudping')
    }
  } catch (e) {
    throw Error('could not retrieve latencies from cloudping')
  }
}
*/

const fs = require('fs')

// cloudping daily averages api endpoint

// Marker MN
// I guess this should be moved to .env file ;-)
const mapPath = '/home/bft/promo/tool/src/util/aws21.json'

function getLatencies(log) {
    let latencies = new Object()

    log.info('getting latencies from local AWS21 map')

    const json = JSON.parse(fs.readFileSync(mapPath, 'utf8'))
    for (let i = 0; i < json.length; i++) {
        let currentRegion = json[i].region
        latencies[currentRegion] = new Object()
        for (let j = 0; j < json[i].averages.length; j++) {
            let destinationRegion = json[i].averages[j].regionTo
            let RTT = parseFloat(json[i].averages[j].average).toFixed(3)
            latencies[currentRegion][destinationRegion] = new Object()
            latencies[currentRegion][destinationRegion] = Math.floor(
                (RTT * 1000) / 2,
            )
        }
    }
    return latencies
}

module.exports = { getLatencies }
