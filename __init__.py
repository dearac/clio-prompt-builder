"""💅 Clio Style Library — prompt style injector for KREA 2 / Qwen-encoder models.
Styles live in styles.json beside this file (source: pastebin RgjkbYHH, 281 entries).
Edit styles.json + refresh the browser to pick up changes — no server restart needed
(INPUT_TYPES re-reads the file on every /object_info fetch).
"""
import json
import os

_DIR = os.path.dirname(os.path.abspath(__file__))
_STYLES_PATH = os.path.join(_DIR, "styles.json")
_NONE = "✨ none"


def _load_styles():
    try:
        with open(_STYLES_PATH, "r", encoding="utf-8") as f:
            return {e["name"]: e["prompt"] for e in json.load(f)}
    except Exception:
        return {}


class ClioStyle:
    @classmethod
    def INPUT_TYPES(cls):
        # library order, not alphabetical — the paste groups styles by tradition
        names = [_NONE] + list(_load_styles().keys())
        return {
            "required": {
                "prompt": ("STRING", {"multiline": True, "default": "", "dynamicPrompts": False}),
                "style": (names, {"default": _NONE}),
                # Style-first delimited format keeps the style from literalizing into the
                # scene as its own entity (tip from u/Dear-Spend-2865, see repo issue #1)
                "template": ("STRING", {"default": "Style: {style}. Subject: {prompt}"}),
            }
        }

    RETURN_TYPES = ("STRING", "STRING", "STRING")
    RETURN_NAMES = ("styled_prompt", "style_name", "filename_prefix")
    FUNCTION = "apply"
    CATEGORY = "Clio 💅"
    DESCRIPTION = "Injects a style paragraph from the 281-entry library into your prompt. " \
                  "Outputs the styled prompt, the bare style name, and a Krea2/<style> filename prefix."

    def apply(self, prompt, style, template):
        prompt = prompt.strip()
        text = _load_styles().get(style, "")
        if style == _NONE or not text:
            styled, name = prompt, "unstyled"
        elif not prompt:
            styled, name = text, style
        else:
            styled = template.replace("{prompt}", prompt).replace("{style}", text).strip()
            name = style
        safe = "".join(c for c in name if c.isalnum() or c in " -_()").strip()
        return (styled, name, "Krea2/" + safe)


NODE_CLASS_MAPPINGS = {"ClioStyle": ClioStyle}
NODE_DISPLAY_NAME_MAPPINGS = {"ClioStyle": "💅 Clio Style Library"}
