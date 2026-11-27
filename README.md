# Bootsplash Studio

**An offline-first visual editor for native Linux Plymouth boot splash themes.**

Bootsplash Studio is intended to replace the console text shown during the Linux startup sequence after the bootloader hands off to the kernel and before the display manager is ready. It creates a real Plymouth script theme from a canvas design. The editor's webpage is only a design tool: once a theme package has been exported, the editor folder can be deleted and the theme package is self-contained.

## Quick start

No npm install, web account, remote API, or external asset download is required.

1. Extract this project.
2. Open `index.html` in a modern browser, or run `npm run serve` and open `http://127.0.0.1:4173`.
3. Design your splash screen on the canvas. Add text, PNG/JPEG/WebP images, shapes, a spinner, and a progress bar. Drag elements to move them and drag the lower-right handle to resize.
4. Open **Preview & install**, review the design, then choose **Build install package**.
5. Extract the theme ZIP on your Linux computer, inspect `install.sh`, and run `chmod +x install.sh && sudo ./install.sh`.

The package contains a `.plymouth` descriptor, Plymouth script, PNG assets, project JSON, installation instructions, and a backup-aware installer. The editor itself does not need to remain installed.

## Features

- Offline, single-page canvas editor with a fixed 1920×1080 design surface.
- Light and dark application modes.
- Drag, resize, reorder by layer selection, hide, and edit text/shape/logo/spinner/progress layers.
- Starter presets: Aurora, Still, Orbit, and Signal. These are generic original starting points, not distribution logos or themes.
- Local autosave, project list, JSON import/export, undo/redo, and keyboard delete.
- Native Plymouth script output with background, spinner frames, progress callbacks, and pulse effect.
- Generated ZIP package with a Linux installer and uninstall path.
- No Express API, wildcard CORS, upload server, external dependency tree, or network service.

## Important technical scope

The boot splash is not controlled by one component:

- **GRUB** is the bootloader. Its own menu can be themed separately. Bootsplash Studio's installer can add `quiet splash` to `GRUB_CMDLINE_LINUX_DEFAULT` and run a detected GRUB config generator when present.
- **Plymouth** is the graphical splash renderer used after kernel handoff. The generated theme uses Plymouth's `script` plugin.
- **The initramfs** must contain Plymouth and the selected theme early enough in boot. The installer detects `update-initramfs`, `dracut`, or `mkinitcpio` and runs the available rebuild path.
- **KMS/framebuffer and graphics driver support** are needed for early graphics on many machines. Some systems may fall back to text or switch modes during startup.

The editor does not claim to replace every bootloader UI, firmware screen, kernel diagnostic, encryption prompt, or display-manager transition. It does not promise a completely text-free boot on all hardware. The installer's paths are best-effort and should be tested on a recoverable machine.

## Current compatibility target

| Environment | Integration |
|---|---|
| Debian / Ubuntu family | `update-initramfs`, GRUB updater, Plymouth theme selection through `update-alternatives` when required |
| Fedora / RHEL family | `dracut`, GRUB updater, `plymouth-set-default-theme` |
| Arch family | `mkinitcpio` hook insertion and rebuild, where the installed Plymouth package and boot layout support it |
| openSUSE / other dracut-based systems | `dracut` and detected GRUB commands, best effort |
| systemd-boot / other bootloaders | Exported Plymouth theme can be used, but boot-entry kernel parameters may require manual setup |
| BSD / systems without Plymouth | No native Plymouth install path |

“Supported path” means the package knows a common integration route; it is not a certification for every release, hardware combination, encrypted-root arrangement, or custom boot layout.

## Installer safety

The generated installer:

- Requires root and refuses unknown CLI options.
- Checks for Plymouth and an available initramfs generator.
- Backs up selected GRUB and initramfs configuration under `/var/lib/bootsplash-studio/<theme>/` before changing them.
- Adds `quiet splash` without deleting other existing kernel parameters.
- Uses the installed initramfs tool detected on the target.
- Provides `sudo ./install.sh --uninstall` to restore its saved configuration and remove the generated theme.

Before installing, inspect the generated `install.sh`. Keep a recovery USB or another known-good boot entry available. An interrupted initramfs rebuild can require recovery steps. Do not test the installer on your only machine without a recovery plan.

## Development and tests

Requires Node.js 18+ to run the test suite. Python 3 is needed only for the optional localhost static server. The editor itself runs in the browser without npm dependencies.

```bash
npm test
npm run serve
```

Tests cover project schema validation, slug/path safety, Plymouth descriptor and script generation, pulse/static modes, and Bash syntax of the generated installer. A full real-boot compatibility test still requires disposable VMs or real target machines with their own initramfs/bootloader layouts.

## Project layout

```text
bootsplash-studio/
├── index.html             # Offline editor UI
├── styles.css             # Studio interface and responsive layouts
├── app.js                 # Canvas editor, project storage, ZIP package builder
├── src/core.js            # Theme validation and Plymouth/installer generators
├── tests/core.test.js     # Unit and generated-shell syntax tests
├── scripts/serve.sh       # Optional localhost-only static server
├── docs/                  # Compatibility and security notes
├── LICENSE
└── README.md
```

## License

Bootsplash Studio source code is released under the MIT License. The project does not bundle third-party distro logos or downloaded theme artwork. Users are responsible for having rights to any image they upload into their own themes.
