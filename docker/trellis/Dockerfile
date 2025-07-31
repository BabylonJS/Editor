FROM nvidia/cuda:12.9.1-cudnn-devel-ubuntu24.04

# Set environment variables to avoid interactive prompts
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    build-essential \
    git \
    vim \
    curl \
    libgl1 \
    libglib2.0-0

RUN rm -rf /var/lib/apt/lists/*

RUN rm -f /usr/lib/python*/EXTERNALLY-MANAGED

# Set working directory
WORKDIR /app

# Install Python dependencies
RUN pip3 install --pre torch==2.8.0.dev20250605+cu128 torchvision==0.23.0.dev20250605+cu128 torchaudio==2.8.0.dev20250605+cu128 --index-url https://download.pytorch.org/whl/nightly/cu128

RUN pip3 install --no-cache-dir \
    flask \
    imageio \
    pillow \
    numpy

# RUN pip3 install diso Cython

# Set environment variable for TRELLIS
ENV SPCONV_ALGO=native

# Clone TRELLIS repository
RUN git clone https://github.com/NVIDIAGameWorks/kaolin.git /app/kaolin
RUN git clone https://github.com/microsoft/TRELLIS.git /app/trellis

RUN pip3 install Cython
RUN IGNORE_TORCH_VER=1 pip3 install ./kaolin

# Copy Flask server script
COPY run.sh /app/run.sh
COPY api_server.py /app/trellis/api_server.py

# Command to run the Flask server
ENTRYPOINT ["sh", "/app/run.sh"]
# CMD ["bash"]
