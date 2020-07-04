Why Fork this?
=======

Because I liked a lot about (the idea of) Networked A-Frame and needed to use it, but also needed webrtc video. This is currently pre-alpha, purely proof of concept, didn't want to waste time making the code pretty before I verified it was feasible in scope. I wouldn't publish this, except that I spent many hours trying to find pre-documented solutions for this and found that this was a pretty rough corner of the web. I pushed up mostly to have a convenient way to access my changes as I experimented (had to fork and build on every change because of repo design). I'm leaving this here at the moment in case it helps someone else later. I may improve it and do a pull request, but we all know how projects like this are, so just in case I don't get back to it, here's it documented in its current state.

<img src="https://i.imgur.com/8pR4OA0.gif" title="showing phone camera and laptop webcame facing each other, from computer screen recording seeing a screen that displays phone video feed.">

<i>showing phone camera and laptop webcame facing each other, from computer screen recording seeing a screen that displays phone video feed.</i>

Current Status
========

I have tried to use this deployed with other people. While I can get this to work, sometimes two way, when connecting to a deployed domain with my computer and phone, even on separate VPN's... the three people I tested with were not able to connect with me over webrtc _at all_. I could watch my (messy, added, ad hoc) logs tells me the webrtc connection state goes from checking, to a long delay, to disconnected.

For now, I'm temporarily switched to socket.io to get more core functionality working, and will get back to this (hopefully).

The one-way video seems to be related to 'ontrack' on the peer connection not firing. It sometimes 'resolves itself' if the second user just repeatedly reconnects (less than 5 times), but I didn't get to exploring that deeply yet.

My understanding of how NAF and the adapter and how webrtc has grown since I first wrote the below, and I began modifying the code to instead use a different pattern, following 'networked audio source' component--unfortunately, the networked video source component is not yet working. It should be close, but I just set it aside before finishing it and have been focused on other things.

I don't mention it below, but in the new implementation, you have to have something with the 'networked-audio-source' component (I have been using the avatar) on it. (again, in future iterations, this would be the networked-video-source).

Earlier Draft:
===========

As of this writing (see file update on github), I have this enabled. It's crude, but works either one way or, when lucky, both ways. You just set 'video' to 'true' on the scene properties (alongside where you can set 'audio:true' normally in NAF), so:

```js
<a-scene id="scene" networked-scene="
      app: myApp;
      room: room1;
      debug: true;
      video: true;
      audio: true;
      adapter: webrtc;
    ">
```

then add an HTML5 `<video id="webrtc-screen" playsinline autoplay></video>` element in the `<a-assets>` section of your index with the id (no source, that is dynamically set later), and then somewhere in your scene add

```
<a-plane position="0 0 0" rotation="0 0 0" width=".35" height=".35" material="src: #webrtc-screen; side: double"></a-plane>
```


To transmit video (and/or enable seeing your own video), I currently add this to a script tag at the bottom of the index.html:

```
function checkConnected() {
    console.log("will promise")
    return new Promise((resolve, reject) => {
      let wait100 = function() {
        setTimeout(() => {
          console.log("waited 100")
          if (NAF.connection.isConnected()) {
            resolve(NAF.connection)
          }
          else wait100()
        }, 100)
      }
      wait100()
    })
  }

  checkConnected()
  .then(c => {
    let others = c.getConnectedClients()
    console.error('connected', others, Object.keys(others).length);
    
    navigator.mediaDevices.getUserMedia({audio: false, video: true})
    .then(stream => {
      let $video = document.querySelector('#webcam-screen')
      $video.srcObject = stream
      $video.onloadedmetadata = () => {
        $video.play()
      }
    })
  })
```

To see your own webcam feed, add this to the scene:
```
<a-plane position=".6 1.187 -.178" rotation="0 90 0" width=".35" height=".35" material="src: #webcam-screen; side: double"></a-plane>
```

And that's it, the rest is all 'normal'. I have a bunch of messy console logs in there from me debugging and trying to figure out how the code worked as I hacked on it, those may help you if you're trying to improve it.

My current project as of this writing is up on https://vrgo.club

TO USE THIS FORK,

just include this in place of NAF:

To get exactly the version I have running as I write this:
`<script src="https://gitcdn.xyz/cdn/kylebakerio/networked-aframe/37d2572a05615bab2a9aaaad11a406dd0d66b650/dist/networked-aframe.js"></script>`

To get my latest commit (in theory should be best):
`<script src="https://raw.githack.com/kylebakerio/networked-aframe/master/dist/networked-aframe.js"></script>`

(note: some updates have been made, in the process of making a 'networked-video-source' that mirrors the 'networked-audio-source' component; it is now required that you add 'networked-audio-source' to get it working and feed sent out to the video element as of this writing.)


<img src="http://i.imgur.com/7ddbE0q.gif" width="300">


Networked-Aframe
=======

<a href="https://travis-ci.org/networked-aframe/networked-aframe"><img src="https://img.shields.io/travis/networked-aframe/networked-aframe.svg" alt="Build Status"></a>
<span class="badge-npmversion"><a href="https://npmjs.org/package/networked-aframe" title="View this project on NPM"><img src="https://img.shields.io/npm/v/networked-aframe.svg" alt="NPM version" /></a></span>
<span class="badge-npmdownloads"><a href="https://npmjs.org/package/networked-aframe" title="View this project on NPM"><img src="https://img.shields.io/npm/dm/networked-aframe.svg" alt="NPM downloads" /></a></span>

**Multi-user VR on the Web**

A framework for writing multi-user VR apps in HTML and JS.

Built on top of [A-Frame](https://aframe.io/).

<div>
  <a href="#features">Features</a>
  &mdash;
  <a href="#getting-started">Getting Started</a>
  &mdash;
  <a href="#more-examples">Examples</a>
  &mdash;
  <a href="#documentation">Documentation</a>
  &mdash;
  <a href="#stay-in-touch">Contact</a>
</div>

<br>


Features
--------
* Support for WebRTC and/or WebSocket connections.
* Voice chat. Audio streaming to let your users talk in-app (WebRTC only).
* Bandwidth sensitive. Only send network updates when things change.
* Cross-platform. Works on all modern Desktop and Mobile browsers. Oculus Rift, Oculus Quest, HTC Vive and Google Cardboard.
* Extendable. Sync any A-Frame component, including your own, without changing the component code at all.


Getting Started
---------------

[![Remix on Glitch](https://cdn.glitch.com/2703baf2-b643-4da7-ab91-7ee2a2d00b5b%2Fremix-button.svg)](https://glitch.com/edit/#!/remix/networked-aframe)

Follow [the NAF Getting Started tutorial](https://github.com/networked-aframe/networked-aframe/blob/master/docs/getting-started-local.md) to build your own example from scratch, including setting up a local server.

To run the examples on your own PC:

 ```sh
git clone https://github.com/networked-aframe/networked-aframe.git  # Clone the repository.
cd networked-aframe
npm install  # Install dependencies.
npm run dev  # Start the local development server.
```
With the server running, browse the examples at `http://localhost:8080`. Open another browser tab and point it to the same URL to see the other client.

For info on how to host your experience on the internet, see the [NAF Hosting Guide](https://github.com/networked-aframe/networked-aframe/blob/master/docs/hosting-networked-aframe-on-a-server.md).


Basic Example
-------------
```html
<html>
  <head>
    <title>My Networked-Aframe Scene</title>
    <script src="https://aframe.io/releases/1.0.3/aframe.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/socket.io/2.3.0/socket.io.slim.js"></script>
    <script src="https://unpkg.com/networked-aframe/dist/networked-aframe.min.js"></script>
  </head>
  <body>
    <a-scene networked-scene>
      <a-assets>
        <template id="avatar-template">
           <a-sphere></a-sphere>
        </template>
      </a-assets>
      <a-entity id="player" networked="template:#avatar-template;attachTemplateToLocal:false;" camera wasd-controls look-controls>
      </a-entity>
    </a-scene>
  </body>
</html>
```

More Examples
-------------

Open in two tabs if nobody else is online.

* [Basic](http://haydenlee.io/networked-aframe/basic.html)
* [Basic with 4 clients](http://haydenlee.io/networked-aframe/basic-4.html)
* [Dance Club](http://haydenlee.io/networked-aframe/a-saturday-night/index.html)
* [Google Blocks](http://haydenlee.io/networked-aframe/google-blocks.html)
* [Tracked Controllers](http://haydenlee.io/networked-aframe/tracked-controllers.html)
* [Positional Audio](https://networked-aframe-audio.glitch.me/)
* [Nametags](https://glitch.com/edit/#!/naf-nametags)
* [Dynamic Room Name](https://glitch.com/edit/#!/naf-dynamic-room)
* [Form to set room and username](https://glitch.com/edit/#!/naf-form-example)
* [Minecraft Clone](https://uxvirtual.com/demo/blocks/)
* [More...](http://haydenlee.io/networked-aframe/)

Made something awesome with Networked-Aframe? [Let us know](https://github.com/networked-aframe/networked-aframe/issues) and we'll include it here.


Documentation
-------------

### Overview

Networked-Aframe works by syncing entities and their components to connected users. To connect to a room you need to add the [`networked-scene`](#scene-component) component to the `a-scene` element. For an entity to be synced, add the `networked` component to it. By default the `position` and `rotation` components are synced, but if you want to sync other components or child components you need to define a [schema](#syncing-custom-components). For more advanced control over the network messages see the sections on [Broadcasting Custom Messages](#sending-custom-messages) and [Options](#options).


### Scene component

Required on the A-Frame `<a-scene>` component.

```html
<a-scene networked-scene="
  serverURL: /;
  app: <appId>;
  room: <roomName>;
  connectOnLoad: true;
  onConnect: onConnect;
  adapter: socketio;
  audio: false;
  debug: false;
">
  ...
</a-scene>
```

| Property | Description | Default Value |
| -------- | ----------- | ------------- |
| serverURL  | Choose where the WebSocket / signalling server is located. | / |
| app  | Unique app name. Spaces are not allowed. | default |
| room  | Unique room name. Can be multiple per app. Spaces are not allowed. There can be multiple rooms per app and clients can only connect to clients in the same app & room. | default |
| connectOnLoad  | Connect to the server as soon as the webpage loads. | true |
| onConnect  | Function to be called when client has successfully connected to the server. | onConnect |
| adapter | The network service that you wish to use, see [adapters](#adapters). | socketio |
| audio  | Turn on / off microphone audio streaming for your app. Only works if the chosen adapter supports it. | false |
| debug  | Turn on / off Networked-Aframe debug logs. | false |

### Connecting

By default, `networked-scene` will connect to your server automatically. To prevent this and instead have control over when to connect, set `connectOnLoad` to false in `networked-scene`. When you are ready to connect emit the `connect` event on the `a-scene` element.

```javascript
AFRAME.scenes[0].emit('connect');
```

### Disconnecting

To disconnect simply remove the `networked-scene` component from the `a-scene` element.

```javascript
AFRAME.scenes[0].removeAttribute('networked-scene');
```

Completely removing `a-scene` from your page will also handle cleanly disconnecting.


### Creating Networked Entities

```html
<a-assets>
  <template id="my-template">
    <a-entity>
      <a-sphere color="#f00"></a-sphere>
    </a-entity>
  </template>
<a-assets>

<!-- Attach local template by default -->
<a-entity networked="template: #my-template">
</a-entity>

<!-- Do not attach local template -->
<a-entity networked="template:#my-template;attachTemplateToLocal:false">
</a-entity>
```

Create an instance of a template to be synced across clients. The position and rotation will be synced by default. The [`aframe-lerp-component`](https://github.com/haydenjameslee/aframe-lerp-component) is added to allow for less network updates while keeping smooth motion.

Templates must only have one root element. When `attachTemplateToLocal` is set to true, the attributes on this element will be copied to the local entity and the children will be appended to the local entity. Remotely instantiated entities will be a copy of the root element of the template with the `networked` component added to it.

#### Example `attachTemplateToLocal=true`

```html
<a-entity wasd-controls networked="template:#my-template">
</a-entity>

<!-- Locally instantiated as: -->
<a-entity wasd-controls networked="template:#my-template">
  <a-sphere color="#f00"></a-sphere>
</a-entity>

<!-- Remotely instantiated as: -->
<a-entity networked="template:#my-template;networkId:123;">
  <a-sphere color="#f00"></a-sphere>
</a-entity>
```
#### Example `attachTemplateToLocal=false`

```html
<a-entity wasd-controls networked="template:#my-template;attachTemplateToLocal:false;">
</a-entity>

<!-- No changes to local entity on instantiation -->

<!-- Remotely instantiated as: -->
<a-entity networked="template:#my-template;networkId:123;">
  <a-sphere color="#f00"></a-sphere>
</a-entity>
```

| Parameter | Description | Default
| -------- | ------------ | --------------
| template  | A css selector to a template tag stored in `<a-assets>` | ''
| attachTemplateToLocal  | Does not attach the template for the local user when set to false. This is useful when there is different behavior locally and remotely. | true
| persistent | On remote owner disconnect, attempts to take ownership of persistent entities rather than delete them | false


### Deleting Networked Entities

Currently only the creator of a network entity can delete it. To delete, simply delete the element from the HTML using regular DOM APIs and Networked-Aframe will handle the syncing automatically.


### Syncing Custom Components

By default, the `position` and `rotation` components on the root entity are synced.

To sync other components and components of child entities you need to define a schema per template. Here's how to define and add a schema:

```javascript
NAF.schemas.add({
  template: '#avatar-template',
  components: [
    'position',
    'rotation',
    'scale',
    {
      selector: '.hairs',
      component: 'show-child'
    },
    {
      selector: '.head',
      component: 'material',
      property: 'color'
    },
  ]
});
```

Components of the root entity can be defined with the name of the component. Components of child entities can be defined with an object with both the `selector` field, which uses a standard CSS selector to be used by `document.querySelector`, and the `component` field which specifies the name of the component. To only sync one property of a multi-property component, add the `property` field with the name of the property.

Once you've defined the schema then add it to the list of schemas by calling `NAF.schemas.add(YOUR_SCHEMA)`.

Component data is retrieved by the A-Frame Component `data` property. During the network tick each component's data is checked against its previous synced value; if the data object has changed at all it will be synced across the network.


### Syncing nested templates - eg. hands

To sync nested templates setup your HTML nodes like so:

```HTML
<a-entity id="player" networked="template:#player-template;attachTemplateToLocal:false;" wasd-controls>
  <a-entity camera look-controls networked="template:#head-template;attachTemplateToLocal:false;"></a-entity>
  <a-entity hand-controls="left" networked="template:#left-hand-template"></a-entity>
  <a-entity hand-controls="right" networked="template:#right-hand-template"></a-entity>
</a-entity>
```

In this example the head/camera, left and right hands will spawn their own templates which will be networked independently of the root player. Note: this parent-child relationship only works between one level, ie. a child entity's direct parent must have the `networked` component.

### Sending Custom Messages

```javascript
NAF.connection.subscribeToDataChannel(dataType, callback)
NAF.connection.unsubscribeToDataChannel(dataType)

NAF.connection.broadcastData(dataType, data)
NAF.connection.broadcastDataGuaranteed(dataType, data)

NAF.connection.sendData(clientId, dataType, data)
NAF.connection.sendDataGuaranteed(clientId, dataType, data)
```

Subscribe and unsubscribe callbacks to network messages specified by `dataType`. Broadcast data to all clients in your room with the `broadcastData` functions. To send only to a specific client, use the `sendData` functions instead.

| Parameter | Description
| -------- | -----------
| clientId | ClientId to send this data to
| dataType  | String to identify a network message. `u` is a reserved data type, don't use it pls
| callback  | Function to be called when message of type `dataType` is received. Parameters: function(senderId, dataType, data, targetId)
| data | Object to be sent to all other clients


### Transfer Entity Ownership

The owner of an entity is responsible for syncing its component data. When a user wants to modify another user's entity they must first take ownership of that entity. The [ownership transfer example](./examples/ownership-transfer.html) and the [toggle-ownership component](./examples/js/toggle-ownership.component.js) show how to take ownership of an entity and update it.

```javascript
NAF.utils.takeOwnership(entityEl)
```

Take ownership of an entity.

```javascript
NAF.utils.isMine(entityEl)
```

Check if you own the specified entity.


### Events

Events are fired when certain things happen in NAF. To subscribe to these events follow this pattern:

```javascript
document.body.addEventListener('clientConnected', function (evt) {
  console.error('clientConnected event. clientId =', evt.detail.clientId);
});
```
Events need to be subscribed after the document.body element has been created. This could be achieved by waiting for the document.body `onLoad` method, or by using NAF's `onConnect` function. Use the [NAF Events Demo](https://github.com/networked-aframe/networked-aframe/blob/master/examples/basic-events.html#L30) as an example.

List of events:

| Event | Description | Values |
| -------- | ----------- | ------------- |
| clientConnected | Fired when another client connects to you | `evt.detail.clientId` - ClientId of connecting client |
| clientDisconnected | Fired when another client disconnects from you | `evt.detail.clientId` - ClientId of disconnecting client |
| entityCreated | Fired when a networked entity is created | `evt.detail.el` - new entity |
| entityRemoved | Fired when a networked entity is deleted | `evt.detail.networkId` - networkId of deleted entity |

The following events are fired on the `networked` component. See the [toggle-ownership component](./examples/js/toggle-ownership.component.js) for examples.

List of ownership transfer events:

| Event | Description | Values |
| -------- | ----------- | ------------- |
| ownership-gained | Fired when a networked entity's ownership is taken | `evt.detail.el` - the entity whose ownership was gained |
| | | `evt.detail.oldOwner` - the clientId of the previous owner |
| ownership-lost | Fired when a networked entity's ownership is lost | `evt.detail.el` - the entity whose ownership was lost |
| | | `evt.detail.newOwner` - the clientId of the new owner |
| ownership-changed | Fired when a networked entity's ownership is changed | `evt.detail.el` - the entity whose ownership was lost |
| | | `evt.detail.oldOwner` - the clientId of the previous owner |
| | | `evt.detail.newOwner` - the clientId of the new owner |

### Adapters

NAF can be used with multiple network libraries and services. An adapter is a class which adds support for a library to NAF. If you're just hacking on a small project or proof of concept you'll probably be fine with the default configuration and you can skip this section. Considerations you should make when evaluating different adapters are:

- How many concurrent users do you need to support in one room?
- Do you want to host your own server? Or would a "serverless" solution like Firebase do the job?
- Do you need audio (microphone) streaming?
- Do you need custom server-side logic?
- Do you want a WebSocket (client-server) network architecture or WebRTC (peer-to-peer)?

I'll write up a post on the answers to these questions soon (please [bug me](https://github.com/networked-aframe/networked-aframe/issues) about it if you're interested).

By default the `socketio` adapter is used, which does not support audio and uses a TCP connection. This is not ideal for production deployments however due to inherent connection issues with WebRTC we've set it as the default. To use WebRTC instead of WebSockets, change the adapter to `webrtc`, which supports audio and uses a UDP.

If you're interested in contributing to NAF a great opportunity is to add support for more adapters and send a pull request.

List of the supported adapters:

| Adapter | Description | Supports Audio | WebSockets or WebRTC | How to start |
| -------- | ----------- | ------------- | ----------- | ---------- |
| socketio | DEFAULT - SocketIO implementation | No | WebSockets only | `npm run start` |
| webrtc | Native WebRTC implementation | Yes | Both | `npm run start` |
| Firebase | [Firebase](https://firebase.google.com/) for WebRTC signalling | No | WebRTC | See [naf-firebase-adapter](https://github.com/networked-aframe/naf-firebase-adapter) |
| uWS | Implementation of [uWebSockets](https://github.com/uNetworking/uWebSockets) | No | WebSockets | See [naf-uws-adapter](https://github.com/networked-aframe/naf-uws-adapter) |
| EasyRTC | [EasyRTC](https://github.com/priologic/easyrtc) | Yes | Both | See [naf-easyrtc-adapter](https://github.com/networked-aframe/naf-easyrtc-adapter) |
| Deepstream | [DeepstreamHub](https://deepstreamhub.com/) for WebRTC signalling | No | WebRTC | See [naf-deepstream-adapter](https://github.com/networked-aframe/naf-deepstream-adapter) |

### Audio

After adding `audio: true` to the `networked-scene` component (and using an adapter that supports it) you will not hear any audio by default. Though the audio will be streaming, it will not be audible until an entity with a `networked-audio-source` is created. The audio from the owner of this entity will be emitted in 3D space from that entities position. The `networked-audio-source` component must be added to an entity (or a child of an entity) with the `networked` component.

To quickly get started, try the [Glitch NAF Audio Example](https://glitch.com/edit/#!/networked-aframe-audio?path=public/index.html).

### Misc

```javascript
NAF.connection.isConnected()
```

Returns true if a connection has been established to the signalling server.

```javascript
NAF.connection.getConnectedClients()
```

Returns the list of currently connected clients.


### Options

```javascript
NAF.options.updateRate
```

Frequency the network component `sync` function is called, per second. 10-20 is normal for most Social VR applications. Default is `15`.

```javascript
NAF.options.useLerp
```

By default when an entity is created the [`aframe-lerp-component`](https://github.com/haydenjameslee/aframe-lerp-component) is attached to smooth out position and rotation network updates. Set this to false if you don't want the lerp component to be attached on creation.

Stay in Touch
-------------

- Join the [A-Frame Slack](https://aframevr-slack.herokuapp.com) and add the #networked-aframe channel
- Follow changes on [GitHub](https://github.com/networked-aframe/networked-aframe/subscription)
- Let us know if you've made something with Networked-Aframe. We'd love to see it!


Help and More Information
------------------------------

* [Getting started tutorial](https://github.com/networked-aframe/networked-aframe/blob/master/docs/getting-started-local.md)
* [Edit live example on glitch.com](https://glitch.com/~networked-aframe)
* [Live demo site](http://haydenlee.io/networked-aframe)
* [Networked-Aframe Adapters](https://github.com/networked-aframe)
* [A-Frame](https://aframe.io/)
* [WebXR](https://github.com/immersive-web/webxr)
* [Hayden Lee, NAF Creator and Maintainer](https://twitter.com/haydenlee37)
* Bugs and requests can be filed on [GitHub Issues](https://github.com/networked-aframe/networked-aframe/issues)


Folder Structure
----------------

 * `/ (root)`
   * Licenses and package information
 * `/dist/`
   * Packaged source code for deployment
 * `/server/`
   * Server code
 * `/examples/`
   * Example experiences
 * `/src/`
   * Client source code
 * `/tests/`
   * Unit tests


Roadmap
-------

* More examples!
* [Roadmap](https://github.com/networked-aframe/networked-aframe/projects/1)
* [Add your suggestions](https://github.com/networked-aframe/networked-aframe/issues)

Interested in contributing? [Open an issue](https://github.com/networked-aframe/networked-aframe/issues) or send a pull request.


License
-------

This program is free software and is distributed under an [MIT License](LICENSE).
