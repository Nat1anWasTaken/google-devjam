#!/usr/bin/env python3
"""
Advanced Neural TTS Server using Coqui TTS
High-quality neural voices with superior audio processing
"""

from flask import Flask, request, jsonify
import os
import uuid
import re
import platform
import subprocess
import tempfile
import sys
import torch
import numpy as np
from TTS.api import TTS
from TTS.utils.manage import ModelManager
import librosa
import soundfile as sf
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

class NeuralTTSManager:
    """Manages neural TTS models and voice synthesis"""
    
    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"🖥️  Using device: {self.device}")
        
        # Initialize TTS models
        self.models = {}
        self.current_model = None
        self.available_models = self._get_available_models()
        
        # Load default high-quality model
        self._load_default_model()
    
    def _get_available_models(self):
        """Get list of available high-quality TTS models"""
        return {
            "jenny": {
                "model_name": "tts_models/en/ljspeech/tacotron2-DDC_ph",
                "vocoder": "vocoder_models/en/ljspeech/hifigan_v2",
                "description": "High-quality female voice (Jenny)",
                "language": "en",
                "quality": "premium"
            },
            "vctk_p239": {
                "model_name": "tts_models/en/vctk/vits",
                "speaker": "p239",
                "description": "High-quality female voice (VCTK)",
                "language": "en", 
                "quality": "premium"
            },
            "vctk_p243": {
                "model_name": "tts_models/en/vctk/vits",
                "speaker": "p243",
                "description": "High-quality male voice (VCTK)",
                "language": "en",
                "quality": "premium"
            },
            "fairseq_mary": {
                "model_name": "tts_models/en/ljspeech/fast_pitch",
                "description": "Fast, high-quality synthesis",
                "language": "en",
                "quality": "fast"
            },
            "xtts_v2": {
                "model_name": "tts_models/multilingual/multi-dataset/xtts_v2",
                "description": "XTTS v2 - Ultra high quality, multilingual",
                "language": "multilingual",
                "quality": "ultra"
            }
        }
    
    def _load_default_model(self):
        """Load the default high-quality model"""
        try:
            # Try XTTS v2 first (best quality)
            logger.info("🚀 Loading XTTS v2 model (ultra high quality)...")
            self.current_model = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to(self.device)
            self.current_model_name = "xtts_v2"
            logger.info("✅ XTTS v2 model loaded successfully")
            
        except Exception as e:
            logger.warning(f"⚠️  Could not load XTTS v2: {e}")
            try:
                # Fallback to VITS model (still very good quality)
                logger.info("🔄 Loading VITS model as fallback...")
                self.current_model = TTS("tts_models/en/vctk/vits").to(self.device)
                self.current_model_name = "vctk_p239"
                logger.info("✅ VITS model loaded successfully")
                
            except Exception as e2:
                logger.error(f"❌ Could not load fallback model: {e2}")
                # Last resort: use basic tacotron2
                logger.info("🔄 Loading Tacotron2 as last resort...")
                self.current_model = TTS("tts_models/en/ljspeech/tacotron2-DDC_ph").to(self.device)
                self.current_model_name = "jenny"
                logger.info("✅ Tacotron2 model loaded")
    
    def get_available_voices(self):
        """Get available voice options"""
        voices = []
        
        if self.current_model_name == "xtts_v2":
            # XTTS v2 supports voice cloning and has built-in speakers
            voices = [
                {"name": "female_1", "description": "Natural female voice", "quality": "ultra"},
                {"name": "male_1", "description": "Natural male voice", "quality": "ultra"},
                {"name": "female_2", "description": "Expressive female voice", "quality": "ultra"},
                {"name": "male_2", "description": "Deep male voice", "quality": "ultra"}
            ]
        elif "vctk" in self.current_model_name:
            # VCTK has multiple speakers
            voices = [
                {"name": "p239", "description": "Young female voice", "quality": "premium"},
                {"name": "p243", "description": "Mature male voice", "quality": "premium"},
                {"name": "p225", "description": "Female voice", "quality": "premium"},
                {"name": "p226", "description": "Male voice", "quality": "premium"}
            ]
        else:
            # Single speaker models
            voices = [
                {"name": "default", "description": "High-quality neural voice", "quality": "premium"}
            ]
        
        return voices
    
    def synthesize_speech(self, text, voice="default", speed=1.0):
        """Generate speech from text using neural TTS"""
        try:
            if self.current_model_name == "xtts_v2":
                # XTTS v2 synthesis
                wav = self.current_model.tts(text=text, language="en")
                
            elif "vctk" in self.current_model_name:
                # VCTK multi-speaker synthesis
                speaker = voice if voice in ["p225", "p226", "p239", "p243"] else "p239"
                wav = self.current_model.tts(text=text, speaker=speaker)
                
            else:
                # Single speaker models
                wav = self.current_model.tts(text=text)
            
            # Post-process audio
            if isinstance(wav, torch.Tensor):
                wav = wav.cpu().numpy()
            
            # Apply speed adjustment
            if speed != 1.0:
                wav = librosa.effects.time_stretch(wav, rate=speed)
            
            # Normalize audio
            wav = wav / np.max(np.abs(wav))
            
            return wav, self.current_model.synthesizer.output_sample_rate if hasattr(self.current_model, 'synthesizer') else 22050
            
        except Exception as e:
            logger.error(f"❌ Synthesis error: {e}")
            raise e

# Initialize Neural TTS Manager
print("🧠 Advanced Neural TTS Server")
print("=" * 40)

try:
    tts_manager = NeuralTTSManager()
    available_voices = tts_manager.get_available_voices()
    default_voice = available_voices[0]['name'] if available_voices else 'default'
    
    print(f"🎭 Available voices: {', '.join([v['name'] for v in available_voices])}")
    print(f"🔊 Default voice: {default_voice}")
    print(f"🖥️  Device: {tts_manager.device}")
    print(f"🤖 Model: {tts_manager.current_model_name}")
    print(f"📊 Total voices available: {len(available_voices)}")
    
except Exception as e:
    logger.error(f"❌ Failed to initialize TTS Manager: {e}")
    sys.exit(1)

def preprocess_text(text):
    """Enhanced text preprocessing for neural TTS"""
    # Remove problematic characters but keep punctuation for natural prosody
    text = re.sub(r'[^\w\s\.,!?;:\'"()-—–\n]', '', text)
    
    # Normalize quotes
    text = re.sub(r'["""]', '"', text)
    text = re.sub(r"[''']", "'", text)
    
    # Handle numbers and abbreviations for better pronunciation
    text = re.sub(r'\bDr\.', 'Doctor', text)
    text = re.sub(r'\bMr\.', 'Mister', text)
    text = re.sub(r'\bMrs\.', 'Misses', text)
    text = re.sub(r'\bMs\.', 'Miss', text)
    text = re.sub(r'\betc\.', 'etcetera', text)
    text = re.sub(r'\bvs\.', 'versus', text)
    text = re.sub(r'\be\.g\.', 'for example', text)
    text = re.sub(r'\bi\.e\.', 'that is', text)
    
    # Handle common contractions
    text = re.sub(r"won't", "will not", text)
    text = re.sub(r"can't", "cannot", text)
    text = re.sub(r"n't", " not", text)
    text = re.sub(r"'re", " are", text)
    text = re.sub(r"'ve", " have", text)
    text = re.sub(r"'ll", " will", text)
    text = re.sub(r"'d", " would", text)
    
    # Normalize whitespace
    text = re.sub(r'\s+', ' ', text.strip())
    
    # Limit length for processing efficiency
    if len(text) > 2000:
        sentences = re.split(r'[.!?]+', text[:2000])
        if len(sentences) > 1:
            text = '. '.join(sentences[:-1]) + '.'
        else:
            text = text[:2000] + "..."
    
    return text

def enhance_neural_audio(wav_data, sample_rate, target_sample_rate=22050):
    """Post-process neural TTS output for enhanced quality"""
    try:
        # Resample if needed
        if sample_rate != target_sample_rate:
            wav_data = librosa.resample(wav_data, orig_sr=sample_rate, target_sr=target_sample_rate)
            sample_rate = target_sample_rate
        
        # Apply subtle audio enhancements
        # Normalize
        wav_data = wav_data / np.max(np.abs(wav_data))
        
        # Apply gentle compression to even out dynamics
        threshold = 0.8
        ratio = 4.0
        above_threshold = np.abs(wav_data) > threshold
        wav_data[above_threshold] = np.sign(wav_data[above_threshold]) * (
            threshold + (np.abs(wav_data[above_threshold]) - threshold) / ratio
        )
        
        # Final normalization
        wav_data = wav_data * 0.95  # Leave some headroom
        
        return wav_data, sample_rate
        
    except Exception as e:
        logger.warning(f"⚠️  Audio enhancement failed: {e}")
        return wav_data, sample_rate

@app.route("/api/tts", methods=["POST"])
def text_to_speech():
    try:
        data = request.get_json()
        text = data.get("text", "")
        voice = data.get("voice", "")
        speed = data.get("speed", 1.0)  # Speed multiplier (1.0 = normal)
        
        if not text:
            return jsonify({"error": "Text is required"}), 400
        
        # Auto-select best voice if not specified or invalid
        available_voice_names = [v['name'] for v in available_voices]
        if not voice or voice not in available_voice_names:
            voice = default_voice
        
        # Validate speed (0.5x to 2.0x)
        speed = max(0.5, min(2.0, float(speed)))
        
        processed_text = preprocess_text(text)
        logger.info(f"🎭 Generating with voice '{voice}' at {speed}x speed: {processed_text[:50]}...")
        
        # Generate audio using neural TTS
        wav_data, sample_rate = tts_manager.synthesize_speech(processed_text, voice, speed)
        
        # Enhance audio quality
        enhanced_wav, final_sample_rate = enhance_neural_audio(wav_data, sample_rate)
        
        # Create output directory
        output_dir = "audio_output"
        os.makedirs(output_dir, exist_ok=True)
        
        # Generate filename
        filename = f"{uuid.uuid4()}.wav"
        output_path = os.path.join(output_dir, filename)
        
        # Save audio file
        sf.write(output_path, enhanced_wav, final_sample_rate, format='WAV', subtype='PCM_16')
        
        logger.info(f"✅ Neural TTS audio generated: {filename}")
        
        # Read and return audio
        with open(output_path, 'rb') as f:
            audio_data = f.read()
        
        # Clean up
        os.remove(output_path)
        
        return audio_data, 200, {
            'Content-Type': 'audio/wav',
            'Content-Disposition': f'attachment; filename={filename}',
            'X-Voice-Used': voice,
            'X-Speed-Multiplier': str(speed),
            'X-Sample-Rate': str(final_sample_rate),
            'X-Model': tts_manager.current_model_name
        }
        
    except Exception as e:
        logger.error(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "healthy",
        "mode": "neural_tts",
        "system": platform.system(),
        "architecture": platform.machine(),
        "engine": "Coqui TTS Neural",
        "device": tts_manager.device,
        "model": tts_manager.current_model_name,
        "default_voice": default_voice,
        "available_voices": [v['name'] for v in available_voices],
        "total_voices": len(available_voices),
        "features": ["neural_synthesis", "multi_speaker", "speed_control", "audio_enhancement", "high_quality"],
        "python_version": sys.version.split()[0]
    })

@app.route("/voices", methods=["GET"])
def list_voices():
    """List all available voices with details"""
    return jsonify({
        "available_voices": available_voices,
        "default": default_voice,
        "model_info": {
            "name": tts_manager.current_model_name,
            "device": tts_manager.device,
            "quality": "ultra" if tts_manager.current_model_name == "xtts_v2" else "premium"
        },
        "recommended": {
            "female": [v['name'] for v in available_voices if 'female' in v['description'].lower()],
            "male": [v['name'] for v in available_voices if 'male' in v['description'].lower()]
        }
    })

@app.route("/demo", methods=["GET"])
def demo():
    """Demo endpoint to test different voices"""
    demo_text = "Hello! This is a demonstration of advanced neural text-to-speech technology. The voice quality should be remarkably natural and expressive."
    
    return jsonify({
        "demo_text": demo_text,
        "suggested_voices": [v['name'] for v in available_voices[:3]],
        "usage": "POST to /api/tts with: {\"text\": \"your text\", \"voice\": \"female_1\", \"speed\": 1.0}",
        "model": tts_manager.current_model_name
    })

if __name__ == "__main__":
    print(f"🚀 Starting Advanced Neural TTS Server on port 5004")
    print(f"🧠 Engine: Coqui TTS Neural ({tts_manager.current_model_name})")
    print(f"🖥️  Device: {tts_manager.device}")
    print(f"🎭 Voices: {len(available_voices)} ultra-high quality neural voices")
    print(f"🌐 Access at: http://localhost:5004")
    print(f"📖 Demo: http://localhost:5004/demo")
    print("=" * 60)
    app.run(host="0.0.0.0", port=5004, debug=False, threaded=True) 