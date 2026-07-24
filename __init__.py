"""Clio Prompt Builder — modular prompt dropdowns for ComfyUI.

Libraries are stored as JSON files beside this node. Refresh the ComfyUI browser
page after editing a library to reload its dropdown choices.
"""

import json
import os
import re
from typing import Dict

_DIR = os.path.dirname(os.path.abspath(__file__))
_PROMPTS_DIR = os.path.join(_DIR, "prompts")
_STYLES_PATH = os.path.join(_DIR, "styles.json")
_NONE = "✨ none"


def _load_library(path: str) -> Dict[str, str]:
    """Load a JSON prompt library and return an ordered name-to-prompt mapping."""
    try:
        with open(path, "r", encoding="utf-8") as file:
            entries = json.load(file)

        result = {}
        for entry in entries:
            name = str(entry.get("name", "")).strip()
            prompt = str(entry.get("prompt", "")).strip()
            if name and prompt:
                result[name] = prompt
        return result
    except (OSError, json.JSONDecodeError, TypeError, AttributeError):
        return {}


def _prompt_path(filename: str) -> str:
    return os.path.join(_PROMPTS_DIR, filename)


def _dropdown(library: Dict[str, str]):
    return [_NONE] + list(library.keys())


def _selected_prompt(selection: str, library: Dict[str, str]) -> str:
    if selection == _NONE:
        return ""
    return library.get(selection, "").strip()


def _clean_fragment(fragment: str) -> str:
    fragment = re.sub(r"\s+", " ", fragment.strip())
    return fragment.rstrip(" ,.;:")


def _join_fragments(*fragments: str) -> str:
    cleaned = [_clean_fragment(fragment) for fragment in fragments if fragment and fragment.strip()]
    return ". ".join(cleaned) + ("." if cleaned else "")


class ClioPromptBuilder:
    @classmethod
    def INPUT_TYPES(cls):
        subjects = _load_library(_prompt_path("subjects.json"))
        skin_types = _load_library(_prompt_path("skin_types.json"))
        hair_types = _load_library(_prompt_path("hair_types.json"))
        hair_styles = _load_library(_prompt_path("hair_styles.json"))
        eyes = _load_library(_prompt_path("eyes.json"))
        mouths = _load_library(_prompt_path("mouths.json"))
        bodies = _load_library(_prompt_path("bodies.json"))
        positions = _load_library(_prompt_path("positions.json"))
        environments = _load_library(_prompt_path("environments.json"))
        styles = _load_library(_STYLES_PATH)

        return {
            "required": {
                "custom_prompt": (
                    "STRING",
                    {"multiline": True, "default": "", "dynamicPrompts": False},
                ),
                "subject": (_dropdown(subjects), {"default": _NONE}),
                "skin_type": (_dropdown(skin_types), {"default": _NONE}),
                "hair_type": (_dropdown(hair_types), {"default": _NONE}),
                "hair_style": (_dropdown(hair_styles), {"default": _NONE}),
                "eyes": (_dropdown(eyes), {"default": _NONE}),
                "mouth": (_dropdown(mouths), {"default": _NONE}),
                "body": (_dropdown(bodies), {"default": _NONE}),
                "position": (_dropdown(positions), {"default": _NONE}),
                "environment": (_dropdown(environments), {"default": _NONE}),
                "style": (_dropdown(styles), {"default": _NONE}),
            },
            "optional": {
                "prefix": (
                    "STRING",
                    {"multiline": True, "default": "", "dynamicPrompts": False},
                ),
                "suffix": (
                    "STRING",
                    {"multiline": True, "default": "", "dynamicPrompts": False},
                ),
            },
        }

    RETURN_TYPES = ("STRING", "STRING", "STRING")
    RETURN_NAMES = ("combined_prompt", "style_name", "filename_prefix")
    FUNCTION = "build_prompt"
    CATEGORY = "Clio 💅"
    DESCRIPTION = (
        "Builds a natural-language image prompt from selectable subject, appearance, "
        "pose, environment, and visual-style libraries."
    )

    def build_prompt(
        self,
        custom_prompt,
        subject,
        skin_type,
        hair_type,
        hair_style,
        eyes,
        mouth,
        body,
        position,
        environment,
        style,
        prefix="",
        suffix="",
    ):
        subjects = _load_library(_prompt_path("subjects.json"))
        skin_types = _load_library(_prompt_path("skin_types.json"))
        hair_types = _load_library(_prompt_path("hair_types.json"))
        hair_styles = _load_library(_prompt_path("hair_styles.json"))
        eyes_library = _load_library(_prompt_path("eyes.json"))
        mouths = _load_library(_prompt_path("mouths.json"))
        bodies = _load_library(_prompt_path("bodies.json"))
        positions = _load_library(_prompt_path("positions.json"))
        environments = _load_library(_prompt_path("environments.json"))
        styles = _load_library(_STYLES_PATH)

        character_prompt = _join_fragments(
            custom_prompt,
            _selected_prompt(subject, subjects),
            _selected_prompt(body, bodies),
            _selected_prompt(skin_type, skin_types),
            _selected_prompt(hair_type, hair_types),
            _selected_prompt(hair_style, hair_styles),
            _selected_prompt(eyes, eyes_library),
            _selected_prompt(mouth, mouths),
            _selected_prompt(position, positions),
        )

        scene_prompt = _join_fragments(_selected_prompt(environment, environments))
        style_text = _selected_prompt(style, styles)
        style_prompt = f"Visual style: {_clean_fragment(style_text)}." if style_text else ""

        combined_prompt = " ".join(
            part.strip()
            for part in (prefix, character_prompt, scene_prompt, style_prompt, suffix)
            if part and part.strip()
        )

        style_name = style if style != _NONE else "unstyled"
        safe_name = "".join(
            character
            for character in style_name
            if character.isalnum() or character in " -_()"
        ).strip()

        return combined_prompt.strip(), style_name, "Krea2/" + safe_name


# Keep the old node key as an alias so existing workflows can still load.
NODE_CLASS_MAPPINGS = {
    "ClioPromptBuilder": ClioPromptBuilder,
    "ClioStyle": ClioPromptBuilder,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "ClioPromptBuilder": "💅 Clio Prompt Builder",
    "ClioStyle": "💅 Clio Prompt Builder",
}
