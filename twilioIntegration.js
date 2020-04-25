/* globals Twilio */

//The access token - if we already have it, we won't get it again
let token;

//As soon as the page loads, we'll go ahead and show the user's own video
$("document").ready(() => Twilio.Video.createLocalVideoTrack().then(track => addTrack(track, "local")));

//This has the user join the twilio chat room using the entered name as their identity
function joinRoom(name) {
    if (token == undefined) {
        getToken(name, () => createTracksAndJoinRoom(name));
        return;
    }
  
    createTracksAndJoinRoom(name);
}

//Creates the local tracks and then joins the room
function createTracksAndJoinRoom(name) {
    Twilio.Video.createLocalTracks({ audio: true, video: true }).then(
        localTracks => { 
            Twilio.Video.connect(token, { tracks: localTracks })
            .then(
                room => {
                    //Show a message that the join was successful, then hide the join form
                    $("#join-message").html(`Successfully joined the chat room as ${room.localParticipant.identity}`);
                    $("#join-form-container").hide();
                    $("#join-message-container").show();
                    
                    //Show all current participants in the room, then set an event handler to show new participants
                    room.participants.forEach(setUpParticipant);
                    room.on('participantConnected', setUpParticipant);
                    room.on('participantDisconnected', tearDownParticipant)
                }, 
                error => console.error(`Unable to connect to room: ${error.message}`)
            )
        }
    ); 
}

//Shows the participant that is passed in
function setUpParticipant(participant) {
    const identity = participant.identity.replace(" ", "-");
    
    //Show currently published tracks
    participant.tracks.forEach(publication => {
        if (publication.isSubscribed) {
            const track = publication.track;
            addTrack(track, identity);
        }
    });

    //Event handler to show new tracks as they are published
    participant.on('trackSubscribed', track => addTrack(track, identity));
    participant.on('trackUnsubscribed', track => removeTrack(track, identity));
}

//Tears down a remote participant who has left the room
function tearDownParticipant(participant) {
    const id = participant.identity.replace(" ", "-");
    const video = document.getElementById(`video-${id}`);
    const audio = document.getElementById(`audio-${id}`);

    if (video !== null) {
        video.parentNode.removeChild(video);
    }
    if (audio !== null) {
        audio.parentNode.removeChild(audio);
    }
}

//Removes a track
function removeTrack(track, id) {
    let nodeToRemove;
    if (track.kind === "video") {
        nodeToRemove = document.getElementById(`video-${id}`);
    } else if (track.kind === "audio") {
        nodeToRemove = document.getElementById(`audio-${id}`);
    }

    if (nodeToRemove !== null) {
        nodeToRemove.parentNode.removeChild(nodeToRemove);
    }
}

//Adds an element for a track
function addTrack(track, id) {
    const toAppend = document.createElement("div");
    if (track.kind === "audio") {
        toAppend.setAttribute("id", `audio-${id}`);
        toAppend.appendChild(track.attach());
    } else if (track.kind === "video") {
        toAppend.setAttribute("class", "col-4");
        toAppend.setAttribute("id", `video-${id}`);
        toAppend.appendChild(createVideoElement(track));
    }

    $("#media-div").append(toAppend);
}

//Creates the video element for a track
function createVideoElement(track) {
    const video = track.attach();
    video.setAttribute("class", "video-insert");
    return  video;
}

//Gets an access token by calling into a different glitch app, and when done calls the callback function
function getToken(name, callback) {
    const request = new XMLHttpRequest();
    request.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            const parsed = JSON.parse(request.responseText);
            token = parsed.token;
            callback();
        }
    };

    request.open("POST", `https://gamy-coin.glitch.me/${name}`, true);
    request.send();
}