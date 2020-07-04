const WebrtcAdapter = require("./naf-webrtc-adapter");
const EasyRtcAdapter = require("./naf-easyrtc-adapter");
const SocketioAdapter = require('./naf-socketio-adapter');



class AdapterFactory {
  constructor() {
    this.adapters = {
      "socketio": SocketioAdapter,
      "webrtc": WebrtcAdapter,
      "easyrtc": EasyRtcAdapter, // can't add this way, it's made to be register()'d, not called here.
    };

    this.IS_CONNECTED = AdapterFactory.IS_CONNECTED;
    this.CONNECTING = AdapterFactory.CONNECTING;
    this.NOT_CONNECTED = AdapterFactory.NOT_CONNECTED;
  }

  register(adapterName, AdapterClass) {
    console.warn("REGISTERING ADAPTER!", adapterName)
    this.adapters[adapterName] = AdapterClass;
  }

  make(adapterName) {
    var name = adapterName.toLowerCase();
    if (this.adapters[name]) {
      var AdapterClass = this.adapters[name];
      return new AdapterClass();
    } else if (name === 'easyrtc' || name == 'wseasyrtc') {
      console.warn("WILL ATTEMPT TO USE EXPERIMENTAL DEPRECATED -> FORKED OPENRTC ADAPTER")
      // this.adapters["easyrtc"] = EasyRtcAdapter; // using register pattern above // <-- don't do that, need a different server, so need whole easyrtc repo not just the adapter -_-
      // throw new Error(
      //   "Adapter: " +
      //     adapterName + 
      //     " not registered. EasyRTC support was removed in Networked-Aframe 0.7.0." +
      //     " To use the deprecated EasyRTC adapter see https://github.com/networked-aframe/naf-easyrtc-adapter"
      //   );
    } else {
      throw new Error(
        "Adapter: " +
          adapterName +
          " not registered. Please use NAF.adapters.register() to register this adapter."
      );
    }
  }
}

AdapterFactory.IS_CONNECTED = "IS_CONNECTED";
AdapterFactory.CONNECTING = "CONNECTING";
AdapterFactory.NOT_CONNECTED = "NOT_CONNECTED";

module.exports = AdapterFactory;
