"""Minimal ComfyUI API client — headless generation helpers. By Clio.
Override defaults with env vars: COMFY_SERVER, COMFY_OUTPUT_DIR."""
import json
import os
import time
import urllib.request

SERVER = os.environ.get("COMFY_SERVER", "http://127.0.0.1:8188")
# repo lives in ComfyUI/custom_nodes/<node>, so ../../output is the default install layout
OUTDIR = os.environ.get("COMFY_OUTPUT_DIR", os.path.normpath(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "output")))


def post_prompt(graph, client_id="clio-style"):
    data = json.dumps({"prompt": graph, "client_id": client_id}).encode()
    req = urllib.request.Request(SERVER + "/prompt", data=data,
                                 headers={"Content-Type": "application/json"})
    return json.loads(urllib.request.urlopen(req).read())


def get_history(pid):
    with urllib.request.urlopen(f"{SERVER}/history/{pid}") as r:
        return json.loads(r.read())


def wait_for(pid, timeout=600):
    start = time.time()
    while time.time() - start < timeout:
        h = get_history(pid)
        if pid in h:
            status = h[pid].get("status", {})
            if status.get("completed") or "outputs" in h[pid]:
                return h[pid]
            if status.get("status_str") == "error":
                raise RuntimeError("Execution error:\n" + json.dumps(h[pid], indent=2)[:2000])
        time.sleep(1.5)
    raise TimeoutError("Generation timed out")


def collect_images(entry):
    out = []
    for node_out in entry.get("outputs", {}).values():
        for img in node_out.get("images", []):
            out.append(img)
    return out
