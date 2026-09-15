# Image generation contract

- Provider: built-in OpenAI `image_gen` tool; no HTTP endpoint or API key required.
- Method: `imagegen({prompt})`; project-image-generator's curl path is superseded
  by imagegen's preferred built-in workflow.
- Response: generated PNG path under Codex generated_images; copy into the project.
- Output directory: `packages/ui-css/stories/assets/`.
- Delivery format: WebP, preserving alpha for item artwork. Originals remain in Codex.
- Naming: `celestial-<subject>.webp`.
- Style: painted blue-twilight sanctuary, ivory stone, antique gold astrolabes,
  turquoise crystal; quiet composition behind live HTML text. No baked-in UI or text.
- Exact prompts and asset provenance: `packages/ui-css/stories/assets/README.md`.
- Artwork is illustrative catalogue content, not a mandatory UI package dependency.
