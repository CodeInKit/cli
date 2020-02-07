const CLI = require('clui');

function spinnerStart(message) {

  return function spinner(data, unsafe) {
    const Spinner = CLI.Spinner;
    const countdown = new Spinner(message, ['⣾','⣽','⣻','⢿','⡿','⣟','⣯','⣷']);
    countdown.start();
  
    unsafe.countdown = countdown;
  
    return data;
  }
}

function spinnerMessage(newMessage) {
  return function message(data, unsafe) {
    unsafe.countdown.message(newMessage);
    return data;
  }
}

function spinnerStop(data, unsafe) {
  unsafe.countdown.stop();
  return data;
}

module.exports = {
  spinnerStart,
  spinnerMessage,
  spinnerStop
}