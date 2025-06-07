#!/bin/bash

echo "🧠 Advanced Neural TTS Server (Modern uv)"
echo "=========================================="

# Check if uv is installed
if ! command -v uv &> /dev/null; then
    echo "❌ uv is not installed. Installing uv..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    source $HOME/.cargo/env
fi

echo "⚡ Using uv for lightning-fast package management..."

# Create and activate virtual environment
uv venv --python 3.11 2>/dev/null || uv venv --python 3.10 2>/dev/null || uv venv
source .venv/bin/activate

# Install with specific compatible versions for Python 3.12
echo "📥 Installing compatible TTS dependencies..."
uv pip install flask
uv pip install "numpy>=1.22.0"
uv pip install setuptools cython

# Install PyTorch first (CPU version for compatibility)
echo "🔥 Installing PyTorch..."
uv pip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu

# Install other audio dependencies
echo "🎵 Installing audio processing libraries..."
uv pip install librosa soundfile scipy

# Finally install TTS with all dependencies available
echo "🤖 Installing TTS library..."
uv pip install "TTS>=0.20.0" --no-build-isolation || {
    echo "⚠️  TTS installation failed, trying alternative approach..."
    uv pip install coqui-tts
}

# Create audio output directory
mkdir -p audio_output

echo "🚀 Launching Neural TTS Server on port 5004..."
echo "   - Ultra-high quality XTTS v2 model"
echo "   - GPU acceleration (if available)" 
echo "   - Multiple neural voices"
echo "   - Advanced audio processing"
echo "   - Modern uv project management"
echo ""

# Run the server
python simple_mac_tts.py 