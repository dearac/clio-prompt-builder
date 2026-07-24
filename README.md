# 💅 Clio Prompt Builder

A modular ComfyUI prompt-building node for KREA 2, Qwen-family text encoders, and other models that work well with detailed natural-language prompts.

> **Original project credit:** This repository is a customized fork of [`lumenastrum/clio-style-preview`](https://github.com/lumenastrum/clio-style-preview), created and maintained by [lumenastrum](https://github.com/lumenastrum). The original project supplied the Clio style node, the 281-style library integration, the gallery, the generation scripts, and the overall foundation used by this fork.

This fork expands the original **Clio Style Library** beyond art styles. It adds selectable prompt libraries for subjects, physical features, body types, clothing, poses, and environments while retaining the original 281-style collection.

## Features

The **Clio Prompt Builder** node includes draggable dropdown rows for:

- Subject
- Body
- Skin type
- Hair type
- Hairstyle
- Eyes
- Mouth
- Clothing style
- Position or pose
- Environment
- Visual style

It also includes:

- A true drag-and-drop dropdown editor inside the node
- Workflow-persistent dropdown ordering
- Prompt priority that follows the visible row order
- `custom_prompt` for details not covered by the dropdowns
- Optional `prefix` and `suffix` text inputs
- Natural-language prompt assembly
- The original 281-entry `styles.json` library
- Separate JSON libraries that can be expanded without editing Python
- A unique `ClioPromptBuilder` identifier to avoid collisions with older Clio installations

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

Then fully restart ComfyUI and hard-refresh the browser page.

## Drag-and-drop ordering

The visible dropdowns are rendered as draggable rows inside the node.

1. Grab the `☰` handle on the left side of a row.
2. Drag the row above or below another category.
3. Drop it in the desired position.
4. Save the workflow normally.

The order is saved in the workflow through the hidden `dropdown_order` input. When the workflow is reopened, the rows return to the saved order.

The selected order also controls prompt priority. For example:

```text
Visual style → Environment → Subject → Clothing style → Body
```

places the visual-style description before the environment, subject, clothing, and body fragments in the generated prompt.

Use **Reset order** inside the node to restore the default order.

The native backend dropdown widgets remain in a stable serialization order. The frontend editor mirrors their values rather than physically rearranging the serialized widget array, which reduces the risk of workflow values becoming mismatched.

## Node inputs

| Input | Purpose |
|---|---|
| `custom_prompt` | Free-form subject or scene details |
| `subject` | Base subject, such as an adult woman, adult man, fantasy elf, or humanoid android |
| `body` | Body build, proportions, age-related form, and mobility options |
| `skin_type` | Complexion, pigmentation, age, and surface texture |
| `hair_type` | Straight, wavy, curly, coily, fine, thick, and related hair properties |
| `hair_style` | Length, cut, braids, ponytails, updos, and other hairstyles |
| `eyes` | Eye shape and color descriptions |
| `mouth` | Lip shape and mouth expression |
| `clothing_style` | Casual, formal, historical, fantasy, science-fiction, and alternative clothing styles |
| `position` | Standing, seated, walking, portrait, and action poses |
| `environment` | Urban, natural, studio, interior, fantasy, and science-fiction settings |
| `style` | One of the original Clio visual-style descriptions |
| `dropdown_order` | Hidden JSON state used by the drag-and-drop editor |
| `prefix` | Optional text placed before the assembled prompt |
| `suffix` | Optional text placed after the assembled prompt |

## Outputs

The node produces:

- `combined_prompt` — the completed natural-language prompt
- `style_name` — the selected style name or `unstyled`
- `filename_prefix` — a sanitized `Krea2/<style>` save prefix

## Prompt assembly

The fixed outer order is:

```text
prefix → custom prompt → draggable dropdown fragments → suffix
```

The order of the dropdown fragments is controlled by the drag-and-drop editor.

Clothing descriptions are prefixed with `Clothing:` and visual styles are prefixed with `Visual style:` in the completed prompt.

## Prompt libraries

The expanded prompt categories are stored in the `prompts` directory:

```text
prompts/
├── subjects.json
├── skin_types.json
├── hair_types.json
├── hair_styles.json
├── eyes.json
├── mouths.json
├── bodies.json
├── clothing_styles.json
├── positions.json
└── environments.json
```

The original visual styles remain in:

```text
styles.json
```

The drag-and-drop frontend extension is stored in:

```text
web/clio_prompt_builder.js
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

Example clothing entry:

```json
{
  "name": "Cyberpunk Clothing",
  "prompt": "layered futuristic street clothing with technical fabrics, modular panels, utility straps, illuminated accents, and worn urban detailing",
  "section": "Science Fiction"
}
```

After editing a JSON library, restart ComfyUI or refresh its node definitions, then reload the browser page.

## Troubleshooting the editor

If the old native dropdowns appear instead of draggable rows:

1. Run `git pull origin main` in the node folder.
2. Confirm that `web/clio_prompt_builder.js` exists.
3. Confirm that `__init__.py` exports `WEB_DIRECTORY = "./web"`.
4. Fully restart ComfyUI.
5. Hard-refresh the browser with `Ctrl+F5`.
6. Check the browser developer console for JavaScript errors.

If the node itself does not appear, check the ComfyUI startup terminal for an import error.

## Avoiding duplicate-node conflicts

Do not install multiple copies of the same Clio repository under different folder names. Check `ComfyUI/custom_nodes` for folders such as:

```text
clio-style-preview
clio-style-node
clio-prompt-builder
```

Keep `clio-prompt-builder` enabled and temporarily rename or remove older copies if ComfyUI loads the wrong node.

The current fork registers only:

```text
ClioPromptBuilder
```

It does not register the original `ClioStyle` key.

## Original gallery and scripts

The repository still contains the original style-preview gallery and headless generation scripts from the upstream project.

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

This repository is a customized fork of [`lumenastrum/clio-style-preview`](https://github.com/lumenastrum/clio-style-preview), originally created and maintained by [lumenastrum](https://github.com/lumenastrum).

- **Original project owner and maintainer:** [lumenastrum](https://github.com/lumenastrum)
- **Original Clio node, pipeline, gallery integration, and QA:** Clio 💅, with art direction by lumenastrum
- **Original style library:** compiled as a wildcard set by [u/Dear-Spend-2865](https://www.reddit.com/user/Dear-Spend-2865), with 283 community-shared entries deduplicated to 281
- **Original gallery front-end:** VPS-Clio, running Kimi K3
- **Prompt-builder fork:** adds modular subject, appearance, clothing, pose, body, environment, and drag-and-drop ordering while retaining the original style collection and supporting assets

This fork is maintained independently. Changes made here do not modify the upstream repository unless a separate upstream pull request is deliberately submitted and accepted.

## License

The code is provided under the MIT License. The descriptions in `styles.json` are community-shared prompt text credited above. Preserve the original attribution when redistributing or adapting the collection.
