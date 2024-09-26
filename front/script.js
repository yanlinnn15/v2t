let recognition;
let isRecording = false;
let mediaRecorder;
let audioChunks = [];
let silenceTimeout;
let audioRecorded = false;

window.onload = function () {
    const recordBtn = document.getElementById('record-btn');
    const chatWindow = document.getElementById('messages');
    const buttonText = document.getElementById('button-text');

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        console.log('MediaDevices API is available');

        recordBtn.addEventListener('click', () => {
            if (!isRecording) {
                startRecording();
            } else {
                stopRecording();
            }
        });
    } else {
        console.error('Media Devices API is not supported in this browser.');
    }

    // Func to start recording audio
    function startRecording() {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                mediaRecorder = new MediaRecorder(stream);
                mediaRecorder.start();
                audioChunks = [];
                audioRecorded = false; // Reset audio recorded flag
                mediaRecorder.ondataavailable = event => {
                    audioChunks.push(event.data);
                    audioRecorded = true; // Set flag when data is available
                };

                mediaRecorder.onstop = () => {
                    toggleButtonState('processing');
                    if (audioRecorded) {
                        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                        sendAudioToServer(audioBlob);
                    } else {
                        appendMessage('bot', 'No audio recorded.');
                        toggleButtonState('start');
                    }
                };

                // Start silence detection timer
                startSilenceDetection();

                toggleButtonState('recording');
                isRecording = true;
            })
            .catch(err => {
                console.error('Error accessing microphone: ', err);
                // Reset button state to "Start" on error
                toggleButtonState('start');
            });
    }

    // Func to stop recording
    function stopRecording() {
        if (silenceTimeout) {
            clearTimeout(silenceTimeout); // Clear the silence detection timer if recording stops early
        }
        if (mediaRecorder) {
            mediaRecorder.stop();
        }
        // Update button state to "Processing" while recording is stopping
        toggleButtonState('processing');
        isRecording = false;
    }

    // Func to toggle button state
    function toggleButtonState(state) {
        console.log('Toggling button state to:', state);
        if (state === 'recording') {
            recordBtn.classList.add('recording');
            recordBtn.classList.remove('processing');
            buttonText.innerText = '🎙️ Recording...';
        } else if (state === 'processing') {
            recordBtn.classList.add('processing');
            recordBtn.classList.remove('recording');
            buttonText.innerText = '⏳ Processing...';
        } else {
            recordBtn.classList.remove('processing', 'recording');
            buttonText.innerText = '🎤 Start';
        }
    }

    // Func to send audio to the backend
    function sendAudioToServer(audioBlob) {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'audio.wav');

        fetch('/transcribe', {
            method: 'POST',
            body: formData,
        })
        .then(response => response.json())
        .then(data => {
            appendMessage('user', `${data.trans_text}`);
            appendMessage('bot', `${data.response}`);
        })
        .catch(err => {
            console.error('Error in transcription: ', err);
        })
        .finally(() => {
            // reset button to start
            toggleButtonState('start');
        });
    }

    // Func to display messages in the chat
    function appendMessage(sender, message) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', sender);
        messageElement.innerText = message;
        chatWindow.appendChild(messageElement);
        chatWindow.scrollTop = chatWindow.scrollHeight; // Scroll to the bottom
    }

    // Func to start detecting silence
    function startSilenceDetection() {
        silenceTimeout = setTimeout(() => {
            if (isRecording) {
                stopRecording(); // Stop recording after silence
            }
        }, 5000); // Adjust the time (e.g., 5 seconds of silence to trigger stop)
    }
};
