/* global NAF, io */

console.error("USING CUSTOM EXPERIMENTAL NETWORKED AFRAME WEBRTC ADAPTER *1")
console.error("USING CUSTOM EXPERIMENTAL NETWORKED AFRAME WEBRTC ADAPTER")
console.error("USING CUSTOM EXPERIMENTAL NETWORKED AFRAME WEBRTC ADAPTER")
console.error("USING CUSTOM EXPERIMENTAL NETWORKED AFRAME WEBRTC ADAPTER")
console.log("try window.getRTCpeers, window.rtcAdapterInstance")


class WebRtcPeer {
    constructor(localId, remoteId, sendSignalFunc) {
      this.localId = localId;
      this.remoteId = remoteId;
      this.sendSignalFunc = sendSignalFunc;
      this.open = false;
      this.channelLabel = "networked-aframe-channel";
  
      this.pc = this.createPeerConnection();
      this.channel = null;
    }
  
    setDatachannelListeners(openListener, closedListener, messageListener, trackListener) {
      this.openListener = openListener;
      this.closedListener = closedListener;
      this.messageListener = messageListener;
      this.trackListener = trackListener;
    }

  
    offer(options) {
      console.log("will offer", options)
      const self = this;
      // reliable: false - UDP
      this.setupChannel(
        this.pc.createDataChannel(this.channelLabel, { reliable: false })
      );
  
      // If there are errors with Safari implement this:
      // https://github.com/OpenVidu/openvidu/blob/master/openvidu-browser/src/OpenViduInternal/WebRtcPeer/WebRtcPeer.ts#L154
      
      console.warn(`options.sendAudio ${options.sendAudio} options.sendVideo ${options.sendVideo}`)
      if (!this.haveAddedOwnStreamTracks && (options.sendAudio || options.sendVideo)) {
        options.localAVStream.getTracks().forEach(
          track => {
            console.warn("ADDING LOCAL TRACK FOR OFFER", track, self.pc, "an error here happens when we try to add our own track multiple times it seems...")

            this.haveAddedOwnStreamTracks = true;
            return self.pc.addTrack(track, options.localAVStream)
          }
        );
      }
  
      this.pc.createOffer(
        sdp => {
          self.handleSessionDescription(sdp);
        },
        error => {
          NAF.log.error("WebRtcPeer.offer: " + error);
        },
        {
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        }
      );
    }
  
    handleSignal(signal) {
      // ignores signal if it isn't for me
      if (this.localId !== signal.to || this.remoteId !== signal.from) return;
  
      switch (signal.type) {
        case "offer":
          this.handleOffer(signal);
          break;
  
        case "answer":
          this.handleAnswer(signal);
          break;
  
        case "candidate":
          this.handleCandidate(signal);
          break;
  
        default:
          NAF.log.error(
            "WebRtcPeer.handleSignal: Unknown signal type " + signal.type
          );
          break;
      }
    }
  
    send(type, data) {
      if (this.channel === null || this.channel.readyState !== "open") {
        return;
      }
  
      this.channel.send(JSON.stringify({ type: type, data: data }));
    }
  
    getStatus() {
      if (this.channel === null) return WebRtcPeer.NOT_CONNECTED;
  
      switch (this.channel.readyState) {
        case "open":
          return WebRtcPeer.IS_CONNECTED;
  
        case "connecting":
          return WebRtcPeer.CONNECTING;
  
        case "closing":
        case "closed":
        default:
          return WebRtcPeer.NOT_CONNECTED;
      }
    }
  
    /*
     * Privates
     */
  
    createPeerConnection() {
      const self = this;
      const RTCPeerConnection =
        window.RTCPeerConnection ||
        window.webkitRTCPeerConnection ||
        window.mozRTCPeerConnection ||
        window.msRTCPeerConnection;
  
      if (RTCPeerConnection === undefined) {
        throw new Error(
          "WebRtcPeer.createPeerConnection: This browser does not seem to support WebRTC."
        );
      }
  
      const pc = new RTCPeerConnection({ iceServers: WebRtcPeer.ICE_SERVERS });
  
      pc.onicecandidate = function(event) {
        if (event.candidate) {
          self.sendSignalFunc({
            from: self.localId,
            to: self.remoteId,
            type: "candidate",
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            candidate: event.candidate.candidate
          });
        }
      };
  
      // Note: seems like channel.onclose hander is unreliable on some platforms,
      //       so also tries to detect disconnection here.
      pc.oniceconnectionstatechange = function(event) {
        console.error("PEER CONNECTION STATE CHANGE", pc.remoteId)
        console.warn("if we're trying to stream the video before this is 'completed', it is very likely the cause of video problems.")
        console.log('@', NAF.connection.getServerTime())
        console.log(event.target.remoteId, event.target.iceConnectionState, pc.iceConnectionState)
        console.log(pc === event.target)
        // see https://rollout.io/blog/webrtc-issues-and-how-to-debug-them/
        
        if (self.open && pc.iceConnectionState === "disconnected") {
          self.open = false;
          self.closedListener(self.remoteId);
        }
      };
  
      pc.ontrack = (e) => {
        self.trackListener(self.remoteId, e.streams[0]);
      }
  
      return pc;
    }
  
    setupChannel(channel) {
      const self = this;
  
      this.channel = channel;
  
      // received data from a remote peer
      this.channel.onmessage = function(event) {
        const data = JSON.parse(event.data);
        self.messageListener(self.remoteId, data.type, data.data);
      };
  
      // connected with a remote peer
      this.channel.onopen = function(_event) {
        self.open = true;
        self.openListener(self.remoteId);
      };
  
      // disconnected with a remote peer
      this.channel.onclose = function(_event) {
        if (!self.open) return;
        self.open = false;
        self.closedListener(self.remoteId);
      };
  
      // error occurred with a remote peer
      this.channel.onerror = function(error) {
        NAF.log.error("WebRtcPeer.channel.onerror: " + error);
      };
    }
  
    handleOffer(message) {
      const self = this;
  
      this.pc.ondatachannel = function(event) {
        self.setupChannel(event.channel);
      };
  
      this.setRemoteDescription(message);
  
      this.pc.createAnswer(
        function(sdp) {
          self.handleSessionDescription(sdp);
        },
        function(error) {
          NAF.log.error("WebRtcPeer.handleOffer: " + error);
        }
      );
    }
  
    handleAnswer(message) {
      this.setRemoteDescription(message);
    }
  
    handleCandidate(message) {
      const RTCIceCandidate =
        window.RTCIceCandidate ||
        window.webkitRTCIceCandidate ||
        window.mozRTCIceCandidate;
  
      this.pc.addIceCandidate(
        new RTCIceCandidate(message),
        function() {},
        function(error) {
          NAF.log.error("WebRtcPeer.handleCandidate: " + error);
        }
      );
    }
  
    handleSessionDescription(sdp) {
      this.pc.setLocalDescription(
        sdp,
        function() {},
        function(error) {
          NAF.log.error("WebRtcPeer.handleSessionDescription: " + error);
        }
      );
  
      this.sendSignalFunc({
        from: this.localId,
        to: this.remoteId,
        type: sdp.type,
        sdp: sdp.sdp
      });
    }
  
    setRemoteDescription(message) {
      const RTCSessionDescription =
        window.RTCSessionDescription ||
        window.webkitRTCSessionDescription ||
        window.mozRTCSessionDescription ||
        window.msRTCSessionDescription;
  
      this.pc.setRemoteDescription(
        new RTCSessionDescription(message),
        function() {},
        function(error) {
          NAF.log.error("WebRtcPeer.setRemoteDescription: " + error);
        }
      );
    }
  
    close() {
      if (this.pc) {
        this.pc.close();
      }
    }
  }
  
  WebRtcPeer.IS_CONNECTED = "IS_CONNECTED";
  WebRtcPeer.CONNECTING = "CONNECTING";
  WebRtcPeer.NOT_CONNECTED = "NOT_CONNECTED";
  
  WebRtcPeer.ICE_SERVERS = [
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" }
  ];
  
  /**
   * Native WebRTC Adapter (native-webrtc)
   * For use with uws-server.js
   * networked-scene: serverURL needs to be ws://localhost:8080 when running locally
   */
  class WebrtcAdapter {
    constructor() {
      if (io === undefined)
        console.warn('It looks like socket.io has not been loaded before WebrtcAdapter. Please do that.')
  
      this.app = "default";
      this.room = "default";
      this.occupantListener = null;
      this.myRoomJoinTime = null;
      this.myId = null;
  
      this.peers = {}; // id -> WebRtcPeer
      this.occupants = {}; // id -> joinTimestamp
      
      this.avStreams = {};
      
      this.pendingStreamRequest = {};
      
      this.serverTimeRequests = 0;
      this.timeOffsets = [];
      this.avgTimeOffset = 0;
      
      window.getRTCpeers = function() { return this.peers }
      window.rtcAdapterInstance = this;
      console.log("webrtc init window.webrtcinstance", window.rtcAdapterInstance)
    }
  
    setServerUrl(wsUrl) {
      this.wsUrl = wsUrl;
    }
  
    setApp(appName) {
      this.app = appName;
    }
  
    setRoom(roomName) {
      this.room = roomName;
    }
  
    setWebRtcOptions(options) {
      if (options.datachannel === false) {
        NAF.log.error(
          "WebrtcAdapter.setWebRtcOptions: datachannel must be true."
        );
      }
      if (options.audio === true) {
        this.sendAudio = true;
      }
      if (options.video === true) {
        this.sendVideo = true;
        NAF.log.warn("WebrtcAdapter does not support video yet... officially. ;)");
      }
    }
  
    setServerConnectListeners(successListener, failureListener) {
      this.connectSuccess = successListener;
      this.connectFailure = failureListener;
    }
  
    setRoomOccupantListener(occupantListener) {
      this.occupantListener = occupantListener;
    }
  
    setDataChannelListeners(openListener, closedListener, messageListener) {
      this.openListener = openListener;
      this.closedListener = closedListener;
      this.messageListener = messageListener;
    }
  
    connect() {
      const self = this;
  
      this.updateTimeOffset()
      .then(() => {
        if (!self.wsUrl || self.wsUrl === "/") {
          if (location.protocol === "https:") {
            self.wsUrl = "wss://" + location.host;
          } else {
            self.wsUrl = "ws://" + location.host;
          }
        }
    
        NAF.log.write("Attempting to connect to socket.io");
        const socket = self.socket = io(self.wsUrl);
    
        socket.on("connect", () => {
          NAF.log.write("User connected", socket.id);
          self.myId = socket.id;
          self.joinRoom();
        });
    
        socket.on("connectSuccess", (data) => {
          const { joinedTime } = data;
          NAF.connection.joinedTime = joinedTime; // useful to expose this to clients to make their own decisions, like spawning based on entry order
    
          self.myRoomJoinTime = joinedTime;
          NAF.log.write("Successfully joined room", self.room, "at server time", joinedTime);
    
          console.warn(`self.sendAudio ${self.sendAudio} self.sendVideo ${self.sendVideo}`)
          if (self.sendAudio || self.sendVideo) {
            const mediaConstraints = {
              audio: self.sendAudio,
              video: self.sendVideo
            };
            navigator.mediaDevices.getUserMedia(mediaConstraints)
            .then(localStream => {
              console.log("got local stream, storing", localStream)
              self.storeAVStream(self.myId, localStream);
              self.connectSuccess(self.myId);
              console.log("adding local track to stream on socket connectsuccess, this is likely the failure", self)
              setTimeout(() => {
                console.error("ADDING DELAYED TRACKS - DEBUG ATTEMPT")
                localStream.getTracks().forEach(
                  track => {
                    Object.keys(self.peers).forEach(peerId => { 
                      console.log("problem is likely here... addTrack to", peerId, self.peers[peerId].pc.iceConnectionState, track, localStream)
                      self.peers[peerId].pc.addTrack(track, localStream) 
                    })
                  }
                )
              }, 5000)
            })
            .catch(e => {
              NAF.log.error(e);
              console.error("Microphone (or cam?) is probably disabled due to lack of permissions");
              self.sendAudio = false;
              self.sendVideo = false;
              self.connectSuccess(self.myId);
            });
          }
          else {
            console.warn(`audio and video disabled`)
            self.connectSuccess(self.myId);
          }
        });
    
        socket.on("error", err => {
          console.error("Socket connection failure", err);
          self.connectFailure();
        });
    
        socket.on("occupantsChanged", data => {
          const { occupants } = data;
          NAF.log.write('occupants changed', data);
          self.receivedOccupants(occupants);
        });
    
        function receiveData(packet) {
          const from = packet.from;
          const type = packet.type;
          const data = packet.data;
          if (type === 'ice-candidate') {
            self.peers[from].handleSignal(data);
            return;
          }
          self.messageListener(from, type, data);
        }
    
        socket.on("send", receiveData);
        socket.on("broadcast", receiveData);
      })
    }
  
    joinRoom() {
      NAF.log.write("Joining room", this.room);
      this.socket.emit("joinRoom", { room: this.room });
    }
  
    receivedOccupants(occupants) {
      delete occupants[this.myId];
  
      this.occupants = occupants;
  
      const self = this;
      const localId = this.myId;
  
      for (let key in occupants) {
        const remoteId = key;
        if (this.peers[remoteId]) continue;
  
        const peer = new WebRtcPeer(
          localId,
          remoteId,
          (data) => {
            self.socket.emit('send',{
              from: localId,
              to: remoteId,
              type: 'ice-candidate',
              data,
              sending: true,
            });
          }
        );
        peer.setDatachannelListeners(
          self.openListener,
          self.closedListener,
          self.messageListener,
          self.trackListener.bind(self)
        );
  
        self.peers[remoteId] = peer;

      }
  
      this.occupantListener(occupants);
    }

    shouldStartConnectionTo(client) {
      console.log(`we ${(this.myRoomJoinTime || 0) <= (client || 0) ? "should" : "should not"} start a connection to ${client}`)
      console.log(this.myRoomJoinTime, client)
      return (this.myRoomJoinTime || 0) <= (client || 0);
    }
  
    startStreamConnection(remoteId) {
      NAF.log.write('starting offer process', remoteId);
  
      if (this.sendAudio || this.sendVideo) {
        this.getMediaStream(this.myId)
        .then(stream => {
          const options = {
            sendAudio: this.sendAudio,
            sendVideo: this.sendVideo,
            localAVStream: stream,
          };
          this.peers[remoteId].offer(options);
        });
      }
      else {
        this.peers[remoteId].offer({});
      }
    }
  
    closeStreamConnection(clientId) {
      NAF.log.write('closeStreamConnection', clientId, this.peers);
      this.peers[clientId].close();
      delete this.peers[clientId];
      delete this.occupants[clientId];
      this.closedListener(clientId);
    }
  
    getConnectStatus(clientId) {
      const peer = this.peers[clientId];
  
      if (peer === undefined) return NAF.adapters.NOT_CONNECTED;
  
      switch (peer.getStatus()) {
        case WebRtcPeer.IS_CONNECTED:
          return NAF.adapters.IS_CONNECTED;
  
        case WebRtcPeer.CONNECTING:
          return NAF.adapters.CONNECTING;
  
        case WebRtcPeer.NOT_CONNECTED:
        default:
          return NAF.adapters.NOT_CONNECTED;
      }
    }
  
    sendData(to, type, data) {
      this.peers[to].send(type, data);
    }
  
    sendDataGuaranteed(to, type, data) {
      const packet = {
        from: this.myId,
        to,
        type,
        data,
        sending: true,
      };
  
      this.socket.emit("send", packet);
    }
  
    broadcastData(type, data) {
      for (let clientId in this.peers) {
        this.sendData(clientId, type, data);
      }
    }
  
    broadcastDataGuaranteed(type, data) {
      const packet = {
        from: this.myId,
        type,
        data,
        broadcasting: true
      };
      this.socket.emit("broadcast", packet);
    }
  
    storeAVStream(clientId, stream) {
      this.avStreams[clientId] = stream;
      if (this.pendingStreamRequest[clientId]) {
        NAF.log.write("Received pending audio + video for " + clientId + " resolving with it, should cause attachment to go to DOM");
        this.pendingStreamRequest[clientId](stream);
        delete this.pendingStreamRequest[clientId](stream); // <-- calling the resolve a second time, as we delete the output of calling resolve....?
      }
      else {
        console.warn("No pendingStreamRequest... so will never resolve?", clientId, stream)
      }
    }
  
    trackListener(clientId, stream) {
      console.warn("storing stream!", clientId, stream)
      this.storeAVStream(clientId, stream);

      // experimental video support:
      // this.streamVideoToScreen(stream)
    }

    // streamVideoToScreen(stream) {
    //   console.error("ATTEMPTING STREAM TO SCREEN", stream)
    //   // experimental video support

    //   this.screen = document.getElementById('webrtc-screen');
    //   let screen = this.screen;

    //   screen.onloadedmetadata = () => {
    //     console.log(`Remote video videoWidth: ${this.videoWidth}px,  videoHeight: ${this.videoHeight}px`);
    //   };

    //   screen.onresize = () => {
    //     console.log(`Remote video size changed to ${screen.videoWidth}x${screen.videoHeight}`);
    //     // We'll use the first onresize callback as an indication that
    //     // video has started playing out.
    //   };

    //   if (screen.srcObject !== stream) {
    //     screen.srcObject = stream;
    //     console.log('attempting to set stream as screen src', stream);
    //   }
    // }
  
    getMediaStream(clientId) {
      // this is called externally by networkedaudiosource 
      // it's also called within this file to get our own stream to send it
      // during an offer
      const self = this;
      if (this.avStreams[clientId]) {
        NAF.log.write("Already have audio/video for " + (NAF.clientId === clientId ? "self" : clientId) + ", will resolve it");
        return Promise.resolve(this.avStreams[clientId]);
      }
      else {
        NAF.log.write("Waiting on audio/video for " + clientId + ", will promise it...");
        let waiting = setInterval(x=>console.log("...still waiting"), 7000);
        return new Promise(resolve => {
          let resolveWrapper = () => {
            clearInterval(waiting)
            console.log("finally got it for ", clientId)
            resolve()
          };
          self.pendingStreamRequest[clientId] = resolveWrapper;
        });
      }
    }
  
    updateTimeOffset() {
      const clientSentTime = Date.now() + this.avgTimeOffset;
  
      return fetch(document.location.href, { method: "HEAD", cache: "no-cache" })
        .then(res => {
          const precision = 1000;
          const serverReceivedTime = new Date(res.headers.get("Date")).getTime() + (precision / 2);
          const clientReceivedTime = Date.now();
          const serverTime = serverReceivedTime + ((clientReceivedTime - clientSentTime) / 2);
          const timeOffset = serverTime - clientReceivedTime;
  
          this.serverTimeRequests++;
  
          if (this.serverTimeRequests <= 10) {
            this.timeOffsets.push(timeOffset);
          } else {
            this.timeOffsets[this.serverTimeRequests % 10] = timeOffset;
          }
  
          this.avgTimeOffset = this.timeOffsets.reduce((acc, offset) => acc += offset, 0) / this.timeOffsets.length;
  
          if (this.serverTimeRequests > 10) {
            setTimeout(() => this.updateTimeOffset(), 5 * 60 * 1000); // Sync clock every 5 minutes.
          } else {
            this.updateTimeOffset();
          }
        });
    }
  
    getServerTime() {
      return new Date().getTime() + this.avgTimeOffset;
    }
  }
  
  // NAF.adapters.register("native-webrtc", WebrtcAdapter);
  
  module.exports = WebrtcAdapter;
  