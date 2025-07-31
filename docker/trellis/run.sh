cd /app/trellis

# pip install --pre torch==2.8.0.dev20250605+cu128 torchvision==0.23.0.dev20250605+cu128 torchaudio==2.8.0.dev20250605+cu128 --index-url https://download.pytorch.org/whl/nightly/cu128
# pip install uvicorn fastapi
./setup.sh --new-env --basic --xformers --flash-attn --diffoctreerast --spconv --mipgaussian --kaolin --nvdiffrast

python3 api_server.py
