"""Clio Prompt Builder — modular prompt dropdowns for ComfyUI.

Libraries are stored as JSON files beside this node. The accompanying frontend
extension provides a drag-and-drop editor for arranging dropdown priority.
"""

import json
import os
import re
from typing import Dict, List

_DIR = os.path.dirname(os.path.abspath(__file__))
_PROMPTS_DIR = os.path.join(_DIR, "prompts")
_STYLES_PATH = os.path.join(_DIR, "styles.json")
_NONE = "✨ none"
_DEFAULT_ORDER = [
    "subject",
    "body",
    "skin_type",
    "hair_type",
    "hair_style",
    "eyes",
    "mouth",
    "clothing_style",
    "position",
    "environment",
    "style",
]


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


def _parse_order(raw_order: str) -> List[str]:
    """Return a valid, complete dropdown order from serialized frontend state."""
    try:
        requested = json.loads(raw_order) if raw_order else []
    except (json.JSONDecodeError, TypeError):
        requested = []

    if not isinstance(requested, list):
        requested = []

    valid = []
    for name in requested:
        if name in _DEFAULT_ORDER and name not in valid:
            valid.append(name)

    for name in _DEFAULT_ORDER:
        if name not in valid:
            valid.append(name)

    return valid


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
        clothing_styles = _load_library(_prompt_path("clothing_styles.json"))
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
                "clothing_style": (_dropdown(clothing_styles), {"default": _NONE}),
                "position": (_dropdown(positions), {"default": _NONE}),
                "environment": (_dropdown(environments), {"default": _NONE}),
                "style": (_dropdown(styles), {"default": _NONE}),
                "dropdown_order": (
                    "STRING",
                    {
                        "default": json.dumps(_DEFAULT_ORDER),
                        "multiline": False,
                        "dynamicPrompts": False,
                    },
                ),
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
    CATEGORY = "Clio Prompt Builder"
    DESCRIPTION = (
        "Builds a natural-language image prompt from draggable subject, appearance, "
        "clothing, pose, environment, and visual-style libraries."
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
        clothing_style,
        position,
        environment,
        style,
        dropdown_order,
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
        clothing_styles = _load_library(_prompt_path("clothing_styles.json"))
        positions = _load_library(_prompt_path("positions.json"))
        environments = _load_library(_prompt_path("environments.json"))
        styles = _load_library(_STYLES_PATH)

        fragments = {
            "subject": _selected_prompt(subject, subjects),
            "body": _selected_prompt(body, bodies),
            "skin_type": _selected_prompt(skin_type, skin_types),
            "hair_type": _selected_prompt(hair_type, hair_types),
            "hair_style": _selected_prompt(hair_style, hair_styles),
            "eyes": _selected_prompt(eyes, eyes_library),
            "mouth": _selected_prompt(mouth, mouths),
            "clothing_style": _selected_prompt(clothing_style, clothing_styles),
            "position": _selected_prompt(position, positions),
            "environment": _selected_prompt(environment, environments),
            "style": _selected_prompt(style, styles),
        }

        ordered_fragments = []
        for name in _parse_order(dropdown_order):
            text = fragments.get(name, "")
            if not text:
                continue
            if name == "style":
                ordered_fragments.append(f"Visual style: {_clean_fragment(text)}")
            elif name == "clothing_style":
                ordered_fragments.append(f"Clothing: {_clean_fragment(text)}")
            else:
                ordered_fragments.append(text)

        assembled = _join_fragments(custom_prompt, *ordered_fragments)
        combined_prompt = " ".join(
            part.strip()
            for part in (prefix, assembled, suffix)
            if part and part.strip()
        )

        style_name = style if style != _NONE else "unstyled"
        safe_name = "".join(
            character
            for character in style_name
            if character.isalnum() or character in " -_()"
        ).strip()

        return combined_prompt.strip(), style_name, "Krea2/" + safe_name


NODE_CLASS_MAPPINGS = {
    "ClioPromptBuilder": ClioPromptBuilder,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "ClioPromptBuilder": "Clio Prompt Builder",
}

WEB_DIRECTORY = "./web"

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]
