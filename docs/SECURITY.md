# Security and privacy

- The editor is a static, offline-first web application. It has no server API, account system, telemetry, remote image host, or background upload service.
- Projects are stored in the browser's local storage. Export JSON backups before clearing browser data or switching profiles.
- Uploaded artwork is limited to PNG, JPEG, and WebP raster images. SVG is intentionally excluded from uploads.
- Theme names are normalized to safe filesystem slugs. Project data is validated before being used to generate Plymouth configuration or shell installer content.
- The generated installer requires root privileges, writes under `/usr/share/plymouth/themes/` and `/var/lib/bootsplash-studio/`, and backs up selected boot configuration before editing it.
- Review `install.sh` before running it. Keep recovery media or another known-good boot entry available. This is an open-source utility, not a certified bootloader management system.
