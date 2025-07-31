cd /app/hunyuan3d

pip install -r requirements.txt
pip install --pre torch==2.8.0.dev20250605+cu128 torchvision==0.23.0.dev20250605+cu128 torchaudio==2.8.0.dev20250605+cu128 --index-url https://download.pytorch.org/whl/nightly/cu128

pip install -e .

# for texture
cd hy3dgen/texgen/custom_rasterizer
python3 setup.py install

cd ../../../hy3dgen/texgen/differentiable_renderer
python3 setup.py install

cd ../../../

python3 api_server.py --host 0.0.0.0 --port 7866 --enable_tex
