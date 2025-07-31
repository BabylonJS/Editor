import os
import flask
from flask import Flask, request, send_file
from PIL import Image
import io
import torch
from trellis.pipelines import TrellisImageTo3DPipeline
from trellis.utils import postprocessing_utils

app = Flask(__name__)

# Initialize TRELLIS pipeline
pipeline = TrellisImageTo3DPipeline.from_pretrained("JeffreyXiang/TRELLIS-image-large")
pipeline.cuda()


@app.route("/generate", methods=["POST"])
def generate_glb():
    try:
        # Check if image is in the request
        if "image" not in request.files:
            return flask.jsonify({"error": "No image provided"}), 400

        # Read image from request
        image_file = request.files["image"]
        image = Image.open(image_file).convert("RGB")

        # Optional parameters from request
        seed = int(request.form.get("seed", 1))
        steps = int(request.form.get("steps", 12))
        cfg_strength = float(request.form.get("cfg_strength", 7.5))

        # Run TRELLIS pipeline
        outputs = pipeline.run(
            image,
            seed=seed,
            sparse_structure_sampler_params={
                "steps": steps,
                "cfg_strength": cfg_strength,
            },
            slat_sampler_params={"steps": steps, "cfg_strength": 3.0},
        )

        # Generate GLB
        glb = postprocessing_utils.to_glb(
            outputs["gaussian"][0], outputs["mesh"][0], simplify=0.95, texture_size=1024
        )

        # Save GLB to a temporary file
        output_path = "/tmp/output.glb"
        glb.export(output_path)

        # Return GLB file
        return send_file(
            output_path,
            mimetype="model/gltf-binary",
            as_attachment=True,
            download_name="output.glb",
        )

    except Exception as e:
        return flask.jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=7867)
