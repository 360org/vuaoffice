#!/bin/bash
# Script gỡ bỏ sạch sẽ VuaOffice & GenOffice trên macOS (dành cho Dev / QC Testing)

echo "=== Bắt đầu gỡ bỏ sạch sẽ VuaOffice & GenOffice ==="

# 1. Đóng app nếu đang chạy
pkill -f "VuaOffice" 2>/dev/null
pkill -f "GenOffice" 2>/dev/null
pkill -f "Genspark" 2>/dev/null

# 2. Xoá File App trong Applications
sudo rm -rf "/Applications/VuaOffice.app" 2>/dev/null
sudo rm -rf "/Applications/GenOffice.app" 2>/dev/null
sudo rm -rf "/Applications/Genspark.app" 2>/dev/null
rm -rf "$HOME/Applications/VuaOffice.app" 2>/dev/null
rm -rf "$HOME/Applications/GenOffice.app" 2>/dev/null
rm -rf "$HOME/Applications/Genspark.app" 2>/dev/null

# 3. Xoá sạch Cache, Application Support, Preferences và Saved State
rm -rf "$HOME/Library/Application Support/VuaOffice"
rm -rf "$HOME/Library/Application Support/com.vuahethong.vuaoffice"
rm -rf "$HOME/Library/Application Support/com.apple.sharedfilelist/com.apple.LSSharedFileList.ApplicationRecentDocuments/com.vuahethong.vuaoffice.sfl3"

rm -rf "$HOME/Library/Caches/com.vuahethong.vuaoffice"
rm -rf "$HOME/Library/Caches/com.vuahethong.vuaoffice.ShipIt"
rm -rf "$HOME/Library/Preferences/com.vuahethong.vuaoffice.plist"
rm -rf "$HOME/Library/Saved Application State/com.vuahethong.vuaoffice.savedState"
rm -rf "$HOME/Library/Logs/VuaOffice"

# Xoá thêm data GenOffice / Genspark legacy (bao gồm cả package bundle id cũ)
rm -rf "$HOME/Library/Application Support/GenOffice"
rm -rf "$HOME/Library/Application Support/com.genoffice.app"
rm -rf "$HOME/Library/Application Support/com.apple.sharedfilelist/com.apple.LSSharedFileList.ApplicationRecentDocuments/com.genoffice.app.sfl3"
rm -rf "$HOME/Library/Caches/com.genoffice.app"
rm -rf "$HOME/Library/Caches/com.genoffice.app.ShipIt"
rm -rf "$HOME/Library/Preferences/com.genoffice.app.plist"
rm -rf "$HOME/Library/Saved Application State/com.genoffice.app.savedState"
rm -rf "$HOME/Library/Logs/GenOffice"

# Genspark app legacy files nếu còn sót
rm -rf "$HOME/Library/Application Support/Genspark"
rm -rf "$HOME/Library/Caches/com.genspark.office"
rm -rf "$HOME/Library/Caches/com.genspark.office.ShipIt"
rm -rf "$HOME/Library/Preferences/com.genspark.office.plist"
rm -rf "$HOME/Library/Saved Application State/com.genspark.office.savedState"

echo "=== Đã gỡ sạch hoàn toàn! Sếp có thể cài lại từ file DMG mới ==="
