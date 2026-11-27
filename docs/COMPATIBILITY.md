# Boot-chain compatibility notes

## What this tool customizes

The product targets the graphical splash interval after the bootloader launches the kernel and before the display manager has taken over. Plymouth is the output renderer in this design. GRUB's own menu background/theme is a separate bootloader feature and is not the same as the Plymouth splash.

## Dependencies

- Plymouth installed on the target.
- Plymouth script splash plugin installed and loadable.
- An initramfs generator supported by the installer: `update-initramfs`, `dracut`, or `mkinitcpio`.
- Graphics support for early KMS or a framebuffer. Without a usable early display path, Plymouth can fall back to text.
- A bootloader that passes the `splash` parameter. The generated installer handles a common GRUB configuration path; other layouts need manual review.

## Known limitations

- Firmware/UEFI setup messages occur before Linux and cannot be hidden by a Plymouth theme.
- GRUB menu content is separate from the Plymouth boot screen.
- `quiet` reduces kernel console output; it does not suppress every diagnostic or service message.
- Encryption unlock prompts must remain available and may be drawn by Plymouth or other initramfs components.
- GPU driver handoff and display-manager startup can create a brief blank/flicker on some hardware.
- Non-GRUB bootloaders and custom initramfs layouts require separate validation.
- Ubuntu Core has specific integration and packaging constraints; this generated host installer is not an Ubuntu Core gadget-snap builder.
- BSD is out of scope because the generated output is a Plymouth theme.

## Reference documentation

- Plymouth script theme format: https://documentation.ubuntu.com/core/how-to-guides/image-creation/add-a-splash-screen/
- Plymouth and KMS/initramfs notes: https://wiki.archlinux.org/title/Plymouth
- GRUB configuration variables: https://www.gnu.org/software/grub/manual/grub/html_node/Simple-configuration.html
