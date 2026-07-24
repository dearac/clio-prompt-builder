# 💅 Clio Prompt Builder

A modular ComfyUI prompt-building node for KREA 2, Qwen-family text encoders, and other models that work well with detailed natural-language prompts.

This fork expands the original **Clio Style Library** beyond art styles. It adds selectable prompt libraries for subjects, physical features, body types, poses, and environments while retaining the original 281-style collection.

## Features

The **💅 Clio Prompt Builder** node includes dropdowns for:

- Subject
- Skin type
- Hair type
- Hairstyle
- Eyes
- Mouth
- Body
- Position or pose
- Environment
- Visual style

It also includes:

- `custom_prompt` for details that are not covered by the dropdowns
- Optional `prefix` and `suffix` text inputs
- Natural-language prompt assembly
- The original 281-entry `styles.json` library
- Separate JSON libraries that can be expanded without editing Python
- A unique `ClioPromptBuilder` node identifier to avoid collisions with older Clio installations

## Installation

Clone this fork into the `custom_nodes` folder inside ComfyUI:

```bash
cd ComfyUI/custom_nodes
git clone https://github.com/dearac/clio-prompt-builder.git
```

Restart ComfyUI completely, then search for:

```text
Clio Prompt Builder
```

The node appears under the `Clio Prompt Builder` category.

### Updating an existing installation

```bash
cd ComfyUI/custom_nodes/clio-prompt-builder
git checkout main
git pull origin main
```

Delete the local Python cache if ComfyUI continues showing an older version.

Windows:

```bat
rmdir /s /q __pycache__
```

Linux or macOS:

```bash
rm -rf __pycache__
```

Then restart ComfyUI completely.

## Node inputs

| Input | Purpose |
|---|---|
| `custom_prompt` | Free-form subject or scene details |
| `subject` | Base subject, such as an adult woman, adult man, fantasy elf, or humanoid android |
| `skin_type` | Complexion, pigmentation, age, and surface texture |
| `hair_type` | Straight, wavy, curly, coily, fine, thick, and related hair properties |
| `hair_style` | Length, cut, braids, ponytails, updos, and other hairstyles |
| `eyes` | Eye shape and color descriptions |
| `mouth` | Lip shape and mouth expression |
| `body` | Body build, proportions, age-related form, and mobility options |
| `position` | Standing, seated, walking, portrait, and action poses |
| `environment` | Urban, natural, studio, interior, fantasy, and science-fiction settings |
| `style` | One of the original Clio visual-style descriptions |
| `prefix` | Optional text placed before the assembled prompt |
| `suffix` | Optional text placed after the assembled prompt |

## Outputs

The node produces:

- `combined_prompt` — the completed natural-language prompt
- `style_name` — the selected style name or `unstyled`
- `filename_prefix` — a sanitized `Krea2/<style>` save prefix

## Prompt assembly order

Selected fragments are assembled approximately in this order:

```text
prefix → custom prompt → subject → body → skin → hair type → hairstyle → eyes → mouth → position → environment → visual style → suffix
```

The output uses sentence-style prose rather than tag lists.

## Prompt libraries

The new prompt categories are stored in the `prompts` directory:

```text
prompts/
├── subjects.json
├── skin_types.json
├── hair_types.json
├── hair_styles.json
├── eyes.json
├── mouths.json
├── bodies.json
├── positions.json
└── environments.json
```

The original visual styles remain in:

```text
styles.json
```

## Adding new dropdown choices

Each library contains a JSON array. Every entry uses the same structure:

```json
{
  "name": "Soft Natural Smile",
  "prompt": "a soft natural smile with relaxed facial tension and gently raised mouth corners",
  "section": "Expression"
}
```

Fields:

- `name` is displayed in the ComfyUI dropdown.
- `prompt` is inserted into the final prompt.
- `section` is organizational metadata for future library and gallery features.

Example file:

```json
[
  {
    "name": "Soft Natural Smile",
    "prompt": "a soft natural smile with relaxed facial tension and gently raised mouth corners",
    "section": "Expression"
  },
  {
    "name": "Neutral Expression",
    "prompt": "a relaxed closed mouth with a calm neutral expression",
    "section": "Expression"
  }
]
```

After editing a JSON library, refresh the ComfyUI browser page. If the new choices do not appear, restart ComfyUI.

## Avoiding duplicate-node conflicts

Do not install multiple copies of the same Clio repository under different folder names. Check `ComfyUI/custom_nodes` for folders such as:

```text
clio-style-preview
clio-style-node
clio-prompt-builder
```

Keep `clio-prompt-builder` enabled and temporarily rename or remove older copies if ComfyUI loads the wrong node.

The current fork registers only the unique node key:

```text
ClioPromptBuilder
```

It does not register the original `ClioStyle` key.

## Original gallery and scripts

The repository still contains the original style-preview gallery and headless generation scripts.

To render one subject through the style collection:

```bash
python scripts/style_preview_batch.py --prompt "your subject here" --seed 1997
```

To serve the gallery locally:

```bash
cd gallery
python -m http.server 8899
```

Headless examples:

```bash
python scripts/comfy_gen_krea2.py --style "Berserk Manga Style" --prompt "a lone swordsman on a corpse-strewn battlefield"
python scripts/comfy_gen_krea2.py --list-styles
```

## Credits and fork notice

This repository is a customized fork of [`lumenastrum/clio-style-preview`](https://github.com/lumenastrum/clio-style-preview).

- **Original style library:** compiled as a wildcard set by [u/Dear-Spend-2865](https://www.reddit.com/user/Dear-Spend-2865), with 283 community-shared entries deduplicated to 281.
- **Original gallery front-end:** VPS-Clio, running Kimi K3.
- **Original node, pipeline, and QA:** Clio 💅, with art direction by [lumenastrum](https://github.com/lumenastrum).
- **Prompt-builder fork:** adds modular subject, appearance, pose, body, and environment libraries while retaining the original style collection and supporting assets.

This fork is maintained independently. Changes made here do not modify the upstream repository unless a separate upstream pull request is deliberately submitted and accepted.

## License

The code is provided under the MIT License. The descriptions in `styles.json` are community-shared prompt text credited above. Preserve the original attribution when redistributing or adapting the collection.
