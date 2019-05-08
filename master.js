var fork = require('child_process').fork;
var cpus = require('os').cpus();

var server = require('net').createServer();
server.listen(1337);

var workers = {};

// 限量
var limit = 10;
var during = 60000;
var restart = [];
var isTooFrequently = function () {
  var time = Date.now();
  var length = restart.push(time);
  if( length > limit) {
    restart = restart.slice(limit * -1);
  }
  return restart.length >= limit && restart[restart.length - 1] - restart[0] < during;
}

var createWorker = function(){
  var worker = fork(__dirname+'/worker.js');
  if(isTooFrequently()){
    process.emit('giveup', limit, during);
    return;
  }
  worker.on('message',function(message){
    if(message.act === 'suicide'){
      createWorker();
    }
  })
  worker.on('exit', function(){
    console.log('Worker ' + worker.pid + ' exited.');
    delete workers[worker.pid];
  })
  worker.send('server', server);
  workers[worker.pid] = worker;
  console.log('Create worker pid: ' + worker.pid);
}

for (var i = 0; i < cpus.length; i++) {
  createWorker();
}

process.on('exit',function(){
  for(var pid in workers){
    workers[pid].kill();
  }
})