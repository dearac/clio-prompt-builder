"""Clio Prompt Builder — modular prompt dropdowns for ComfyUI.

Libraries are stored as JSON files beside this node. The accompanying frontend
extension provides searchable dropdowns and a drag-and-drop priority editor.
"""

import json
import os
import random
import re
from typing import Dict, List, Tuple

_DIR = os.path.dirname(os.path.abspath(__file__))
_PROMPTS_DIR = os.path.join(_DIR, "prompts")
_STYLES_PATH = os.path.join(_DIR, "styles.json")
_NONE = "✨ none"
_RANDOM = "🎲 random"
_DEFAULT_ORDER = [
    "subject",
    "body",
    "skin_type",
    "hair_type",
    "hair_style",
    "eyes",
    "mouth",
    "clothing_style",
    "view_style",
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
    return [_NONE, _RANDOM] + list(library.keys())


def _resolve_selection(selection: str, library: Dict[str, str]) -> Tuple[str, str]:
    """Return the resolved display name and prompt text for a dropdown selection."""
    if selection == _NONE or not selection:
        return _NONE, ""

    if selection == _RANDOM:
        choices = list(library.keys())
        if not choices:
            return _NONE, ""
        resolved_name = random.choice(choices)
        return resolved_name, library.get(resolved_name, "").strip()

    return selection, library.get(selection, "").strip()


def _clean_fragment(fragment: str) -> str:
    fragment = re.sub(r"\s+", " ", fragment.strip())
    return fragment.rstrip(" ,.;:")


def _join_fragments(*fragments: str) -> str:
    cleaned = [
        _clean_fragment(fragment)
        for fragment in fragments
        if fragment and fragment.strip()
    ]
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
        view_styles = _load_library(_prompt_path("view_styles.json"))
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
                "view_style": (_dropdown(view_styles), {"default": _NONE}),
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
        "Builds a natural-language image prompt from searchable, draggable subject, "
        "appearance, clothing, viewpoint, pose, environment, and visual-style libraries."
    )

    @classmethod
    def IS_CHANGED(
        cls,
        custom_prompt,
        subject,
        skin_type,
        hair_type,
        hair_style,
        eyes,
        mouth,
        body,
        clothing_style,
        view_style,
        position,
        environment,
        style,
        dropdown_order,
        prefix="",
        suffix="",
    ):
        selections = (
            subject,
            skin_type,
            hair_type,
            hair_style,
            eyes,
            mouth,
            body,
            clothing_style,
            view_style,
            position,
            environment,
            style,
        )
        if _RANDOM in selections:
            return float("NaN")
        return (
            custom_prompt,
            selections,
            dropdown_order,
            prefix,
            suffix,
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
        view_style,
        position,
        environment,
        style,
        dropdown_order,
        prefix="",
        suffix="",
    ):
        libraries = {
            "subject": _load_library(_prompt_path("subjects.json")),
            "body": _load_library(_prompt_path("bodies.json")),
            "skin_type": _load_library(_prompt_path("skin_types.json")),
            "hair_type": _load_library(_prompt_path("hair_types.json")),
            "hair_style": _load_library(_prompt_path("hair_styles.json")),
            "eyes": _load_library(_prompt_path("eyes.json")),
            "mouth": _load_library(_prompt_path("mouths.json")),
            "clothing_style": _load_library(_prompt_path("clothing_styles.json")),
            "view_style": _load_library(_prompt_path("view_styles.json")),
            "position": _load_library(_prompt_path("positions.json")),
            "environment": _load_library(_prompt_path("environments.json")),
            "style": _load_library(_STYLES_PATH),
        }
        selections = {
            "subject": subject,
            "body": body,
            "skin_type": skin_type,
            "hair_type": hair_type,
            "hair_style": hair_style,
            "eyes": eyes,
            "mouth": mouth,
            "clothing_style": clothing_style,
            "view_style": view_style,
            "position": position,
            "environment": environment,
            "style": style,
        }

        resolved = {
            name: _resolve_selection(selections[name], libraries[name])
            for name in _DEFAULT_ORDER
        }

        ordered_fragments = []
        for name in _parse_order(dropdown_order):
            _resolved_name, text = resolved.get(name, (_NONE, ""))
            if not text:
                continue
            if name == "style":
                ordered_fragments.append(f"Visual style: {_clean_fragment(text)}")
            elif name == "clothing_style":
                ordered_fragments.append(f"Clothing: {_clean_fragment(text)}")
            elif name == "view_style":
                ordered_fragments.append(f"Viewpoint and camera perspective: {_clean_fragment(text)}")
            else:
                ordered_fragments.append(text)

        assembled = _join_fragments(custom_prompt, *ordered_fragments)
        combined_prompt = " ".join(
            part.strip()
            for part in (prefix, assembled, suffix)
            if part and part.strip()
        )

        resolved_style_name = resolved["style"][0]
        style_name = resolved_style_name if resolved_style_name != _NONE else "unstyled"
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

WEB_DIRECTORY = "./web_v2"

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]
