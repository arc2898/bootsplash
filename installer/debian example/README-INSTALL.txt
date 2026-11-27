BOOTSPLASH STUDIO — INSTALLATION

Theme: Debian

1. Extract this ZIP archive.
2. Open a terminal in the extracted folder.
3. Review install.sh before running it.
4. Make it executable: chmod +x install.sh
5. Install with: sudo ./install.sh
6. Reboot to test.

Uninstall: sudo ./install.sh --uninstall

The installer backs up selected configuration files under /var/lib/bootsplash-studio/debian.
It detects update-initramfs, dracut, or mkinitcpio and uses the available tool. GRUB is updated when a supported updater is found.

IMPORTANT
- Plymouth, the script plugin, KMS/framebuffer support and initramfs integration are required.
- Firmware/UEFI messages, bootloader text, kernel warnings, encryption prompts and display-manager handoff may still be visible.
- Keep a recovery method available. Test on a machine where you can recover boot settings.
- Browser preview is a design preview, not an exact simulation of your hardware.
