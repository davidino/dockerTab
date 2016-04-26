var path = require('path')
var fs = require('fs')

var menubar = require('menubar')
var ms = require('ms')
var Mongroup = require('mongroup')
var mkdir = require('mkdirp').sync
var debug = require('debug')('monu')
var shell = require('shell')
var dialog = require('dialog');

var Docker = require('dockerode');
var docker = {}

function mylog(context, object) {
  var content = "\n----------------------" + context + "----------------------\n"
                + JSON.stringify(object) +
                "\n-------------------END " + context + " END-----------------\n";

  fs.writeFileSync('/tmp/test.txt', content, 'utf8');
}


// try to fix the $PATH on OS X
require('fix-path')()

// use current user env (https://github.com/sindresorhus/shell-path/issues/7)
// try {
//   process.env = require('user-env')()
// } catch (e) {}

var Server = require('electron-rpc/server')
var app = new Server()

var opts = {dir: __dirname, icon: path.join(__dirname, 'images', 'Icon.png')}
var menu = menubar(opts)
var conf;

menu.on('ready', function ready () {
  conf = loadConfig();
  docker = new Docker({ host: conf.host, port: conf.port});
  var canQuit = false
})

menu.app.on('will-quit', function tryQuit (e) {
  if (canQuit) return true
  menu.window = undefined
  e.preventDefault()
})

menu.on('show', function () {
  app.configure(menu.window.webContents)
  app.send('show')
})

app.on('terminate', function (ev) {
  canQuit = true
  menu.app.terminate()
})

app.on('open-dir', function (ev) {
  shell.showItemInFolder(path.join(conf.exec.cwd, 'config.json'))
})

app.on('open-logs-dir', function (req) {
  shell.showItemInFolder(path.join(conf.logs, req.body.name + '.log'))
})

app.on('get-all', function (req, next) {
  docker.listContainers({ all: true},function (err, containers) {
    mylog('get-all', containers);
    next(null, containers);
  });
})

app.on('get-one', function (req, next) {
  docker.getContainer(req.body.name).inspect(function (err, data) {
    next(null, data);
  });
})

app.on('stop-one', function (req, next) {
  mylog('stop-one', req);
  docker.getContainer(req.body.name).stop(next);
})

app.on('remove-one', function (req, next) {
  mylog('remove-one request', req);
  docker.getContainer(req.body.name).remove(function(err, data) {
    if (err) mylog('error while remove-one', err)
    mylog('remove-one data', data);
    next();
  });
})

app.on('remove-all-zombie', function(req, next) {
  var options = {
    all: true,
    status: ["exited"]
  };

  docker.listContainers(options, function(err, containers){
    containers.forEach(function (containerInfo) {
      docker.getContainer(containerInfo.Id).remove(function(err, data){
        if(err) mylog('error while remove zombies');
        mylog('remove zombies', data);
        next();
      });
    });
  });
})

process.on('uncaughtException', function (err) {
  dialog.showErrorBox('Uncaught Exception: ' + err.message, err.stack || '')
  menu.app.quit()
})

function loadConfig () {
  var dir = path.join(menu.app.getPath('userData'), 'data')
  var configFile = dir + '/config.json'
  var conf, data

  try {
    data = fs.readFileSync(configFile)
  } catch (e) {
    if (e.code === 'ENOENT') {
      mkdir(dir)
      fs.writeFileSync(configFile, fs.readFileSync(__dirname + '/config.json'))
      return loadConfig()
    } else {
      throw e
    }
  }

  try {
    conf = JSON.parse(data.toString())
  } catch (e) {
    var code = dialog.showMessageBox({
      message: 'Invalid configuration file\nCould not parse JSON',
      detail: e.stack,
      buttons: ['Reload Config', 'Exit app']
    })
    if (code === 0) {
      return loadConfig()
    } else {
      menu.app.quit()
      return
    }
  }

  conf.exec = {cwd: dir}
  // conf.mon = path.join(__dirname, 'mon')
  return conf
}
