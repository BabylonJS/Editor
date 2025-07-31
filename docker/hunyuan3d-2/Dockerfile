FROM nvidia/cuda:12.9.1-cudnn-devel-ubuntu24.04

WORKDIR /app

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

RUN git clone https://github.com/Tencent-Hunyuan/Hunyuan3D-2.git hunyuan3d

COPY run.sh .
ENTRYPOINT ["sh", "/app/run.sh"]
