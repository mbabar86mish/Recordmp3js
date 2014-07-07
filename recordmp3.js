(function(window){

  var WORKER_PATH = 'js/recorderWorker.js';

  var Recorder = function(stream){
    var context, audioInput, recorder, volume;
    var recording = false, currCallback;

    // http://typedarray.org/from-microphone-to-wav-with-getusermedia-and-web-audio/
    context = new AudioContext;
    volume = context.createGain();
    audioInput = context.createMediaStreamSource(stream);
    __log('Media stream created.' );
    __log("input sample rate " +context.sampleRate);

    audioInput.connect(volume);
    __log('Input connected to audio context destination.');

    recorder = (context.createScriptProcessor ||
                 context.createJavaScriptNode).call(context, 4096, 2, 2);

    var worker = new Worker(WORKER_PATH);
    worker.postMessage({
      command: 'init',
      sampleRate: context.sampleRate
    });

    recorder.onaudioprocess = function(e){
      if (!recording) return;
      worker.postMessage({
        command: 'record',
        buffer: e.inputBuffer.getChannelData(0)
      });
    }

    this.record = function(){
      recording = true;
    }

    this.stop = function(){
      recording = false;
    }

    this.exportMP3 = function(cb){
      currCallback = cb;
      if (!currCallback) throw new Error('Callback not set');
      worker.postMessage({ command: 'exportMP3' });
    }

    worker.onmessage = function(e){
      var blob = e.data;
      var mp3Name = encodeURIComponent('audio_recording_' + new Date().getTime() + '.mp3');
      uploadAudio(blob, mp3Name);
      currCallback(blob, mp3Name);
    }

    function uploadAudio(mp3Data, mp3Name){
      var reader = new FileReader();
      reader.onload = function(event){
        var fd = new FormData();
        fd.append('fname', mp3Name);
        fd.append('data', event.target.result);
        var xhr = new XMLHttpRequest();
        xhr.open('POST', 'upload.php', true);
        xhr.onreadystatechange = function() {
            if (xhr.readyState == 4) {
                __log("MP3 Uploaded.");
            }
        };
        xhr.send(fd);
      };
      reader.readAsDataURL(mp3Data);
    }

    volume.connect(recorder);
    recorder.connect(context.destination);
  };

  window.Recorder = Recorder;

})(window);
