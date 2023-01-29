"use strict";

const baseURL = "/";

let localVideo = document.querySelector("#localVideo");
let remoteVideo = document.querySelector("#remoteVideo");

let otherUser;
var remoteRTCMessage;

let iceCandidatesFromCaller = [];
let remoteStream;
let localStream;

let callInProgress = false;

//event from html
function call() {
  let userToCall = document.getElementById("callName").value;
  otherUser = userToCall;

  beReady().then((bool) => {
    console.log("bool: ", bool);
    processCall(userToCall, bool);
  });
}

//event from html
function answer() {
  //do the event firing

  beReady().then((bool) => {
    processAccept(bool);
  });

  document.getElementById("answer").style.display = "none";
}

let pcConfig = {
  iceServers: [
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    { urls: "stun:stun.l.google.com:19302" },
  ],
};

// Set up audio and video regardless of what devices are present.
let sdpConstraints = {
  offerToReceiveAudio: true,
  offerToReceiveVideo: true,
};

/////////////////////////////////////////////

let socket;
var callSocket;
async function connectSocket(e) {
  let ws_scheme = window.location.protocol == "https:" ? "wss://" : "ws://";
  callSocket = new WebSocket(ws_scheme + window.location.host + "/ws/call/");
  callSocket.onopen = async function (event) {
    //let's send myName to the socket
    callSocket.send(
      JSON.stringify({
        type: "login",
        data: {
          name: myName,
        },
      })
    );
  };

  callSocket.onmessage = async function (e) {
    let response = JSON.parse(e.data);

    console.log(response);

    let type = response.type;

    if (type == "connection") {
      console.log(response.data.message);
    }

    if (type == "call_received") {
      // console.log(response);
      onNewCall(response.data);
    }

    if (type == "call_answered") {
      onCallAnswered(response.data);
    }

    if (type == "ICEcandidate") {
      onICECandidate(response.data);
    }
  };
}

const onNewCall = (data) => {
  //when other called you
  //show answer button

  otherUser = data.caller;
  remoteRTCMessage = data.rtcMessage;

  // document.getElementById("profileImageA").src = baseURL + callerProfile.image;
  document.getElementById("callerName").innerHTML = otherUser;
  document.getElementById("call").style.display = "none";
  document.getElementById("answer").style.display = "block";
};

const onCallAnswered = (data, e) => {
  console.log(e);
  //when other accept our call
  remoteRTCMessage = data.rtcMessage;
  peerConnection.setRemoteDescription(
    new RTCSessionDescription(remoteRTCMessage)
  );

  document.getElementById("calling").style.display = "none";

  console.log("Call Started. They Answered");
  // console.log(pc);

  callProgress();
};

const onICECandidate = (data) => {
  // console.log(data);
  console.log("GOT ICE candidate");

  let message = data.rtcMessage;

  let candidate = new RTCIceCandidate({
    sdpMLineIndex: message.label,
    candidate: message.candidate,
  });

  if (peerConnection) {
    console.log("ICE candidate Added");
    peerConnection.addIceCandidate(candidate);
  } else {
    console.log("ICE candidate Pushed");
    iceCandidatesFromCaller.push(candidate);
  }
};

/**
 *
 * @param {Object} data
 * @param {number} data.name - the name of the user to call
 * @param {Object} data.rtcMessage - the rtc create offer object
 */
function sendCall(data) {
  //to send a call
  console.log("Send Call");

  // socket.emit("call", data);
  callSocket.send(
    JSON.stringify({
      type: "call",
      data,
    })
  );

  document.getElementById("call").style.display = "none";
  // document.getElementById("profileImageCA").src = baseURL + otherUserProfile.image;
  document.getElementById("otherUserNameCA").innerHTML = otherUser;
  document.getElementById("calling").style.display = "block";
}

/**
 *
 * @param {Object} data
 * @param {number} data.caller - the caller name
 * @param {Object} data.rtcMessage - answer rtc sessionDescription object
 */
function answerCall(data) {
  //to answer a call
  // socket.emit("answerCall", data);
  alert("answerCall");
  callSocket.send(
    JSON.stringify({
      type: "answer_call",
      data,
    })
  );
  callProgress();
}

/**
 *
 * @param {Object} data
 * @param {number} data.user - the other user //either callee or caller
 * @param {Object} data.rtcMessage - iceCandidate data
 */
function sendICEcandidate(data) {
  //send only if we have caller, else no need to
  console.log("Send ICE candidate");
  // socket.emit("ICEcandidate", data)
  callSocket.send(
    JSON.stringify({
      type: "ICEcandidate",
      data,
    })
  );
}

function beReady() {
  return navigator.mediaDevices
    .getUserMedia({
      audio: true,
      video: true,
    })
    .then((stream) => {
      localStream = stream;
      console.log(localStream);
      localVideo.srcObject = stream;
      try {
        var peerConnection = new RTCPeerConnection(pcConfig);
        peerConnection.onicecandidate = handleIceCandidate;
        peerConnection.onaddstream = handleRemoteStreamAdded;
        peerConnection.onremovestream = handleRemoteStreamRemoved;
        console.log("Created RTCPeerConnnection");
        // return;
      } catch (e) {
        console.log("Failed to create PeerConnection, exception: " + e.message);
        alert("Cannot create RTCPeerConnection object.");
        // return;
      }
      alert(peerConnection);
      localStream
        .getTracks()
        .forEach((track) => peerConnection.addTrack(track, localStream));
      return peerConnection;
    })
    .catch(function (e) {
      alert("getUserMedia() error: " + e.message);
    });
}

function createConnectionAndAddStream() {
  //   createPeerConnection();
  try {
    alert("RTCPeerConnection");
    var peerConnection = new RTCPeerConnection(pcConfig);
    peerConnection.onicecandidate = handleIceCandidate;
    alert("handleIceCandidate");
    peerConnection.onaddstream = handleRemoteStreamAdded;
    alert("handleRemoteStreamAdded");
    peerConnection.onremovestream = handleRemoteStreamRemoved;
    alert("handleRemoteStreamRemoved");

    console.log("Created RTCPeerConnnection");
    // return;
  } catch (e) {
    console.log("Failed to create PeerConnection, exception: " + e.message);
    alert("Cannot create RTCPeerConnection object.");
    // return;
  }
  alert(peerConnection);
  peerConnection.addStream(localStream);
  return true;
}

function processCall(userName, peerConnection) {
  // alert(sessionDescription);
  console.log("userName: ", userName);
  console.log("peerConnection: ", peerConnection);
  peerConnection.createOffer(
    (sessionDescription) => {
      peerConnection.setLocalDescription(sessionDescription);
      sendCall({
        name: userName,
        rtcMessage: sessionDescription,
      });
    },
    (error) => {
      console.log("Error");
    }
  );
}

function processAccept(peerConnection, error) {
  console.log(peerConnection);
  console.log("processAccept");
  try {
    peerConnection.setRemoteDescription(
      new RTCSessionDescription(remoteRTCMessage)
    );
    console.log("processAccept1");
  } catch {
    console.log(error.message);
  }
  peerConnection
    .createAnswer(
      (sessionDescription, e) => {
        console.log(e.message);
        peerConnection.setLocalDescription(sessionDescription);
        console.log("processAccept2");
        if (iceCandidatesFromCaller.length > 0) {
          //I am having issues with call not being processed in real world (internet, not local)
          //so I will push iceCandidates I received after the call arrived, push it and, once we accept
          //add it as ice candidate
          //if the offer rtc message contains all thes ICE candidates we can ingore this.
          console.log("processAccept3");
          for (let i = 0; i < iceCandidatesFromCaller.length; i++) {
            //
            let candidate = iceCandidatesFromCaller[i];
            console.log("ICE candidate Added From queue");
            console.log("processAccept4");
            try {
              peerConnection
                .addIceCandidate(candidate)
                .then((done) => {
                  console.log(done);
                  console.log("processAccept5");
                })
                .catch((error) => {
                  console.log(error);
                  console.log("processAccept6");
                });
            } catch (error) {
              console.log(error);
            }
          }
          iceCandidatesFromCaller = [];
          console.log("processAccept7");
          console.log("ICE candidate queue cleared");
        } else {
          console.log("NO Ice candidate in queue");
        }
        return sessionDescription;
      },
      (error) => console.log(error.message)
    )
    .then((x) => {
      // let userToCall = document.getElementById("callerName").value;
      console.log("x:  ", x);
      // otherUser = userToCall;
      let d = {
        caller: otherUser,
        rtcMessage: x,
      };
      console.log("data:  ", d);
      console.log("data caller:  ", d.caller);
      console.log("data rtcMessage:  ", d.rtcMessage);
      answerCall(d);
    })
    .catch((e) => console.log(e.message));
}

/////////////////////////////////////////////////////////

// function createPeerConnection() {
//   try {
//     alert("RTCPeerConnection");
//     var peerConnection = new RTCPeerConnection(pcConfig);
//     peerConnection.onicecandidate = handleIceCandidate;
//     alert("handleIceCandidate");
//     peerConnection.onaddstream = handleRemoteStreamAdded;
//     alert("handleRemoteStreamAdded");
//     peerConnection.onremovestream = handleRemoteStreamRemoved;
//     alert("handleRemoteStreamRemoved");

//     console.log("Created RTCPeerConnnection");
//     return;
//   } catch (e) {
//     console.log("Failed to create PeerConnection, exception: " + e.message);
//     alert("Cannot create RTCPeerConnection object.");
//     return;
//   }
// }

function handleIceCandidate(event) {
  // console.log('icecandidate event: ', event);
  if (event.candidate) {
    console.log("Local ICE candidate");
    // console.log(event.candidate.candidate);

    sendICEcandidate({
      user: otherUser,
      rtcMessage: {
        label: event.candidate.sdpMLineIndex,
        id: event.candidate.sdpMid,
        candidate: event.candidate.candidate,
      },
    });
  } else {
    console.log("End of candidates.");
  }
}

function handleRemoteStreamAdded(event) {
  console.log("Remote stream added.");
  remoteStream = event.stream;
  console.log(remoteStream);
  remoteVideo.srcObject = remoteStream;
}

function handleRemoteStreamRemoved(event) {
  console.log("Remote stream removed. Event: ", event);
  remoteVideo.srcObject = null;
  localVideo.srcObject = null;
}

window.onbeforeunload = function () {
  if (callInProgress) {
    stop();
  }
};

function stop() {
  localStream.getTracks().forEach((track) => track.stop());
  callInProgress = false;
  peerConnection.close();
  peerConnection = null;
  document.getElementById("call").style.display = "block";
  document.getElementById("answer").style.display = "none";
  document.getElementById("inCall").style.display = "none";
  document.getElementById("calling").style.display = "none";
  document.getElementById("endVideoButton").style.display = "none";
  otherUser = null;
}

function callProgress() {
  console.log("callProgress Called");
  document.getElementById("videos").style.display = "block";
  document.getElementById("otherUserNameC").innerHTML = otherUser;
  document.getElementById("inCall").style.display = "block";

  callInProgress = true;
}
