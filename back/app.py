from flask import Flask, request, jsonify, send_from_directory
import whisper
import librosa
import soundfile as sf
import ollama
import warnings

# Ignore all warnings
warnings.filterwarnings("ignore")

#flask start
app = Flask(__name__)
# Load the Whisper model
model = whisper.load_model("base", device="cpu") 

@app.route('/')
def index():
    return send_from_directory(r'C:\v2t\front', 'index.html')

#func to simple preprocess audio
def preprocess_audio(file_path):
    # Load audio file
    audio, sr = librosa.load(file_path, sr=None) 
    
    # Noise reduction
    audio_denoised = librosa.effects.preemphasis(audio)
    
    # Normalize audio
    audio_normalized = librosa.util.normalize(audio_denoised)

    # Save preprocessed audio to a new file
    preprocess_file = 'temp_normalized.wav'
    sf.write(preprocess_file, audio_normalized, sr)
    
    return preprocess_file

# func that generate response using llama 3.1
def generate_response(text):
    try:
        response = ollama.chat(
            model='llama3.1',
            messages=[{'role': 'user', 'content': text}]
        )

        return response.get('message', {}).get('content', 'No content found')
        
    except Exception as e:
        print(f"Error occurred: {e}")
        return 'Error in generating response'

# transcribe the text
@app.route('/transcribe', methods=['POST'])
def transcribe():
    try:
        audio_file = request.files['audio']
        audio_file.save('temp.wav')
        
        # Preprocess the audio
        preprocess_audiofile = preprocess_audio('temp.wav')
        
        # Transcribe the audio using Whisper
        result = model.transcribe(preprocess_audiofile)
        trans_text = result.get('text', '')  # Use .get() to avoid KeyError

        # Generate response from the transcription using Ollama
        response = generate_response(trans_text)
        
        return jsonify({
            'trans_text': trans_text,
            'response': response
        })
    except Exception as e:
        # Return an error response
        return jsonify({'error': str(e)}), 500

# Serve static files
@app.route('/<path:path>')
def static_files(path):
    return send_from_directory(r'C:\v2t\front', path)

if __name__ == '__main__':
    app.run(debug=True)
