#!/usr/bin/env bash
# Bootsplash Studio generated installer. Requires a Linux system with Plymouth.
set -Eeuo pipefail

THEME='debian'
HERE="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PLYMOUTH_ROOT="/usr/share/plymouth/themes"
TARGET="$PLYMOUTH_ROOT/$THEME"
STATE_ROOT="/var/lib/bootsplash-studio"
BACKUP="$STATE_ROOT/$THEME"
GRUB_DEFAULT="/etc/default/grub"

info(){ printf '\033[1;34m[info]\033[0m %s\n' "$*"; }
warn(){ printf '\033[1;33m[warn]\033[0m %s\n' "$*" >&2; }
fail(){ printf '\033[1;31m[error]\033[0m %s\n' "$*" >&2; exit 1; }
need_root(){ [[ "$(id -u)" -eq 0 ]] || fail "Run with sudo: sudo ./install.sh"; }

show_platform(){
  if [[ -r /etc/os-release ]]; then . /etc/os-release; info "Detected platform: ${PRETTY_NAME:-${ID:-Linux}}"; else info "Detected platform: Linux (unknown distribution)"; fi
  if command -v update-initramfs >/dev/null 2>&1; then info "Initramfs tool: update-initramfs"
  elif command -v dracut >/dev/null 2>&1; then info "Initramfs tool: dracut"
  elif command -v mkinitcpio >/dev/null 2>&1; then info "Initramfs tool: mkinitcpio"
  else fail "No supported initramfs generator found."; fi
}

backup_once(){
  install -d -m 0700 "$BACKUP/files"
  if [[ ! -f "$BACKUP/installed" ]]; then
    [[ -f "$GRUB_DEFAULT" ]] && cp -a "$GRUB_DEFAULT" "$BACKUP/files/grub.default" || true
    [[ -f /etc/mkinitcpio.conf ]] && cp -a /etc/mkinitcpio.conf "$BACKUP/files/mkinitcpio.conf" || true
    if command -v plymouth-set-default-theme >/dev/null 2>&1; then
      plymouth-set-default-theme 2>/dev/null > "$BACKUP/previous-theme" || true
    elif [[ -L /etc/alternatives/default.plymouth ]]; then
      readlink -f /etc/alternatives/default.plymouth > "$BACKUP/previous-theme-path" || true
    fi
    touch "$BACKUP/installed"
  fi
}

configure_grub(){
  [[ -f "$GRUB_DEFAULT" ]] || { warn "No /etc/default/grub; leaving GRUB settings unchanged."; return 0; }
  python3 - "$GRUB_DEFAULT" <<'PY'
import pathlib, re, sys
p = pathlib.Path(sys.argv[1])
s = p.read_text()
key = 'GRUB_CMDLINE_LINUX_DEFAULT'
pat = re.compile(r'^(\s*' + key + r'=)(["\'])(.*?)(\2\s*(?:#.*)?)$', re.M)
m = pat.search(s)
if m:
    args = m.group(3).split()
    for item in ('quiet', 'splash'):
        if item not in args: args.append(item)
    s = s[:m.start()] + m.group(1) + m.group(2) + ' '.join(args) + m.group(2) + m.group(4) + s[m.end():]
else:
    s += ('\n' if s and not s.endswith('\n') else '') + key + '=\"quiet splash\"\n'
p.write_text(s)
PY
  if command -v update-grub >/dev/null 2>&1; then update-grub
  elif command -v grub-mkconfig >/dev/null 2>&1; then
    local out='/boot/grub/grub.cfg'
    [[ -d /boot/grub2 ]] && out='/boot/grub2/grub.cfg'
    grub-mkconfig -o "$out"
  else warn "GRUB generator not found; update GRUB manually if you use it."; fi
}

configure_plymouth(){
  install -d "$TARGET"
  cp -a "$HERE"/theme/. "$TARGET/" 2>/dev/null || true
  install -m 0644 "$HERE/$THEME.plymouth" "$TARGET/$THEME.plymouth"
  install -m 0644 "$HERE/$THEME.script" "$TARGET/$THEME.script"
  if command -v plymouth-set-default-theme >/dev/null 2>&1; then
    plymouth-set-default-theme "$THEME" -R
    INITRAMFS_REBUILT=1
  elif command -v update-alternatives >/dev/null 2>&1; then
    INITRAMFS_REBUILT=0
    update-alternatives --install /usr/share/plymouth/themes/default.plymouth default.plymouth "$TARGET/$THEME.plymouth" 100
    update-alternatives --set default.plymouth "$TARGET/$THEME.plymouth"
  else fail "No supported Plymouth theme selector found."; fi
}

configure_initramfs(){
  if command -v update-initramfs >/dev/null 2>&1; then
    update-initramfs -u -k all
  elif command -v dracut >/dev/null 2>&1; then
    install -d /etc/dracut.conf.d
    if [[ ! -f "$BACKUP/files/bootsplash-studio-dracut.conf" && -f /etc/dracut.conf.d/bootsplash-studio.conf ]]; then
      cp -a /etc/dracut.conf.d/bootsplash-studio.conf "$BACKUP/files/bootsplash-studio-dracut.conf"
    fi
    printf '%s\n' 'add_dracutmodules+=" plymouth "' > /etc/dracut.conf.d/bootsplash-studio.conf
    dracut --regenerate-all --force
  elif command -v mkinitcpio >/dev/null 2>&1; then
    [[ -f /etc/mkinitcpio.conf ]] || fail "mkinitcpio found but /etc/mkinitcpio.conf is missing."
    python3 - /etc/mkinitcpio.conf <<'PY'
import pathlib, re, sys
p = pathlib.Path(sys.argv[1]); s = p.read_text()
m = re.search(r'(?m)^\s*HOOKS=\(([^)]*)\)', s)
if not m: raise SystemExit('Cannot safely find HOOKS=(...) in mkinitcpio.conf')
hooks = m.group(1).split()
if 'plymouth' not in hooks:
    if 'systemd' in hooks: idx = hooks.index('systemd') + 1
    elif 'encrypt' in hooks: idx = hooks.index('encrypt')
    elif 'sd-encrypt' in hooks: idx = hooks.index('sd-encrypt')
    elif 'filesystems' in hooks: idx = hooks.index('filesystems')
    else: idx = len(hooks)
    hooks.insert(idx, 'plymouth')
    s = s[:m.start(1)] + ' '.join(hooks) + s[m.end(1):]
p.write_text(s)
PY
    mkinitcpio -P
  else
    fail "No supported initramfs generator found (update-initramfs, dracut, or mkinitcpio)."
  fi
}

install_theme(){
  need_root
  [[ -f "$HERE/$THEME.plymouth" && -f "$HERE/$THEME.script" && -f "$HERE/theme/background.png" ]] || fail "Theme package is incomplete. Extract the ZIP before running this script."
  command -v plymouth >/dev/null 2>&1 || fail "Plymouth is not installed. Install Plymouth and its script plugin first."
  show_platform
  backup_once
  info "Installing '$THEME' Plymouth theme..."
  INITRAMFS_REBUILT=0
  configure_plymouth
  configure_grub
  if [[ "$INITRAMFS_REBUILT" -eq 0 ]]; then configure_initramfs; fi
  info "Theme installed. Reboot to test it. Keep the recovery instructions in README-INSTALL.txt."
  warn "GRUB quiet mode hides most kernel messages; firmware, bootloader, driver, and display-manager output may still appear."
}

uninstall_theme(){
  need_root
  [[ -d "$BACKUP" ]] || fail "No Bootsplash Studio backup found for '$THEME'; refusing to guess previous settings."
  info "Restoring backed-up settings..."
  [[ -f "$BACKUP/files/grub.default" ]] && cp -a "$BACKUP/files/grub.default" "$GRUB_DEFAULT" || true
  [[ -f "$BACKUP/files/mkinitcpio.conf" ]] && cp -a "$BACKUP/files/mkinitcpio.conf" /etc/mkinitcpio.conf || true
  [[ -f "$BACKUP/files/bootsplash-studio-dracut.conf" ]] && cp -a "$BACKUP/files/bootsplash-studio-dracut.conf" /etc/dracut.conf.d/bootsplash-studio.conf || rm -f /etc/dracut.conf.d/bootsplash-studio.conf
  REBUILD_NEEDED=1
  if [[ -s "$BACKUP/previous-theme" ]] && command -v plymouth-set-default-theme >/dev/null 2>&1; then
    old="$(head -n 1 "$BACKUP/previous-theme" | tr -cd 'A-Za-z0-9_.-')"
    if [[ -n "$old" ]]; then plymouth-set-default-theme "$old" -R; REBUILD_NEEDED=0; else plymouth-set-default-theme --reset -R; REBUILD_NEEDED=0; fi
  elif [[ -s "$BACKUP/previous-theme-path" ]] && command -v update-alternatives >/dev/null 2>&1; then
    oldpath="$(cat "$BACKUP/previous-theme-path")"
    [[ -f "$oldpath" ]] && update-alternatives --set default.plymouth "$oldpath" || true
  fi
  rm -rf -- "$TARGET"
  if command -v update-grub >/dev/null 2>&1; then update-grub || true
  elif command -v grub-mkconfig >/dev/null 2>&1; then
    [[ -d /boot/grub2 ]] && grub-mkconfig -o /boot/grub2/grub.cfg || grub-mkconfig -o /boot/grub/grub.cfg || true
  fi
  if [[ "$REBUILD_NEEDED" -eq 1 ]]; then
    if command -v update-initramfs >/dev/null 2>&1; then update-initramfs -u -k all
    elif command -v dracut >/dev/null 2>&1; then dracut --regenerate-all --force
    elif command -v mkinitcpio >/dev/null 2>&1; then mkinitcpio -P; fi
  fi
  info "Theme files removed and backed-up settings restored."
  warn "Review your bootloader and Plymouth default manually before deleting the backup at $BACKUP."
}

case "${1:-install}" in
  install) install_theme ;;
  --uninstall|uninstall) uninstall_theme ;;
  --help|-h) echo "Usage: sudo ./install.sh [install|--uninstall]" ;;
  *) fail "Unknown option: $1" ;;
esac
