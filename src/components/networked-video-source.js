/* global AFRAME, NAF, THREE */
var naf = require('../NafIndex');

AFRAME.registerComponent('networked-video-source', {
  schema: {
    positional: { default: true },
    distanceModel: {
      default: "inverse",
      oneOf: ["linear", "inverse", "exponential"]
    },
    maxDistance: { default: 10000 },
    refDistance: { default: 1 },
    rolloffFactor: { default: 1 }
  },

  init: function () {
    console.warn('init networked-video-source | THIS IS UNTESTED')
    this.listener = null;
    this.stream = null;

    this._setMediaStream = this._setMediaStream.bind(this);

    NAF.utils.getNetworkedEntity(this.el).then((networkedEl) => {
      const ownerId = networkedEl.components.networked.data.owner;

      if (ownerId) {
        NAF.connection.adapter.getMediaStream(ownerId)
          .then(stream => this._setMediaStream(stream, ownerId))
          .catch((e) => naf.log.error(`Error getting media stream for ${ownerId}`, e));
      } else {
        console.warn("it's a local entity, not one owned by someone else on the network, so won't attach stream to it")
        // Correctly configured local entity, perhaps do something here for enabling debug audio loopback
      }
    });
  },

  update() {
    this._setPannerProperties();
  },

  streamVideoToScreen(stream, ownerId) {
    console.error("ATTEMPTING STREAM TO SCREEN (both legacy and new style)", ownerId, stream)
    // experimental video support

    this.screen = document.getElementById('webrtc-screen');
    this.screen = document.getElementById(`webrtc-screen-${ownerId}`);
    let screen = this.screen;

    /*

    const leftVideo = document.getElementById('leftVideo');
const rightVideo = document.getElementById('rightVideo');

 console.log(`Remote video videoWidth: ${this.videoWidth}px,  videoHeight: ${this.videoHeight}px`);
};

rightVideo.onresize = () => {
  console.log(`Remote video size changed to ${rightVideo.videoWidth}x${rightVideo.videoHeight}`);

  */

    screen.onloadedmetadata = () => {
      console.log(`Remote video videoWidth: ${screen.videoWidth}px,  videoHeight: ${screen.videoHeight}px`);
    };

    screen.onresize = () => {
      console.log(`Remote video size changed to ${screen.videoWidth}x${screen.videoHeight}`);
      // We can use the first onresize callback as an indication that
      // video has started playing out.
    };

    if (screen.srcObject !== stream) {
      screen.srcObject = stream;
      console.log('attempting to set stream as screen src', stream);
    }
  },

  _setMediaStream(newStream, ownerId) {
    console.warn("SET MEDIA STREAM")
    if(!this.sound) {
      this.setupSound();
    }
    if (!this.videoEl) {
      this.setupVideo(ownerId);
    }
    // EXPERIMENTAL VIDEO SUPPORT
    console.error("ATTEMPTING VIDEO STREAM")
    this.streamVideoToScreen(newStream, ownerId)

    if(newStream != this.stream) {
      if(this.stream) {
        this.sound.disconnect();
      }
      if(newStream) {
        // Chrome seems to require a MediaStream be attached to an AudioElement before AudioNodes work correctly
        // We don't want to do this in other browsers, particularly in Safari, which actually plays the audio despite
        // setting the volume to 0.
        if (/chrome/i.test(navigator.userAgent)) {
          this.audioEl = new Audio();
          this.audioEl.setAttribute("autoplay", "autoplay");
          this.audioEl.setAttribute("playsinline", "playsinline");
          this.audioEl.srcObject = newStream;
          this.audioEl.volume = 0; // we don't actually want to hear audio from this element
        }

        const soundSource = this.sound.context.createMediaStreamSource(newStream); 
        this.sound.setNodeSource(soundSource);
        this.el.emit('sound-source-set', { soundSource });

        // should video stream go here...?
      }
      this.stream = newStream;
    }
  },

  _setPannerProperties() {
    if (this.sound && this.data.positional) {
      this.sound.setDistanceModel(this.data.distanceModel);
      this.sound.setMaxDistance(this.data.maxDistance);
      this.sound.setRefDistance(this.data.refDistance);
      this.sound.setRolloffFactor(this.data.rolloffFactor);
    }
  },

  remove: function() {
    if (!this.sound) return;

    this.el.removeObject3D(this.attrName);
    if (this.stream) {
      this.sound.disconnect();
    }
  },

  setupVideo: function(ownerId) {
    var video = document.createElement("video");
    video.setAttribute("id", `webrtc-screen-${ownerId}`);
  },

  setupSound: function() {
    console.warn("setting up sound")
    var el = this.el;
    var sceneEl = el.sceneEl;

    if (this.sound) {
      el.removeObject3D(this.attrName);
    }

    if (!sceneEl.audioListener) {
      sceneEl.audioListener = new THREE.AudioListener();
      sceneEl.camera && sceneEl.camera.add(sceneEl.audioListener);
      sceneEl.addEventListener('camera-set-active', function(evt) {
        evt.detail.cameraEl.getObject3D('camera').add(sceneEl.audioListener);
      });
    }
    this.listener = sceneEl.audioListener;

    this.sound = this.data.positional
      ? new THREE.PositionalAudio(this.listener)
      : new THREE.Audio(this.listener);
    el.setObject3D(this.attrName, this.sound);
    this._setPannerProperties();
  }
});
