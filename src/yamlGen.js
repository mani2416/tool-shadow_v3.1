const yaml = require('js-yaml');
const fs = require('fs');
let makeConfigTemplate = (fullPathgml) => { 
    let res = new Object();
    res.general = {stop_time: '30 s'};
    res.experimental = new Object();
    res.experimental.use_legacy_working_dir = true;
    res.host_defaults = new Object();
    res.host_defaults.pcap_directory = '.';
    res.network = new Object();
    res.network.graph = { type: 'gml', file: {path: fullPathgml}};
    res.hosts = new Object();
    return res;
}
let makeHost = (res, name, ip, network_node_id, path, env, args, start_time) => {
   /* let newHost = new Object();
    newHost[name] = new Object();
    newHost[name].ip_addr = ip;
    newHost[name].network_node_id = network_node_id;
    newHost[name].path = path;
    newHost[name].env = env;
    newHost[name].args = args;
    newHost[name].start_time = start_time;*/
    let processes = []
    processes.push({'path': path, 'environment': env, 'args': args,'start_time':start_time})
    res.hosts[name]={'ip_addr': ip , 'network_node_id': network_node_id, 
    'processes': processes};
    return res;
}
let out = (file, doc) => {
    fs.writeFile(file, yaml.dump(doc), (err) => {
    if (err) {
        console.log(err);
    }
    });
}

module.exports = {makeHost, out, makeConfigTemplate};
