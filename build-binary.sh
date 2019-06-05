echo building OSX
pkg package.json --output ./bin/KissCatalog-v0.0.2-macOSX --target node6-macos-x64
echo building Linux
pkg package.json --output ./bin/KissCatalog-v0.0.2-Linux --target node6-linux-x64
echo building Win32
pkg package.json --output ./bin/KissCatalog-v0.0.2-Win32 --target node6-win-x86
echo building Win64
pkg package.json --output ./bin/KissCatalog-v0.0.2-Win64 --target node6-win-x64

#zip -r ./bin/KissCatalog-v0.0.2-macOSX.zip ./bin/KissCatalog-v0.0.2-macOSX
#zip -r ./bin/KissCatalog-v0.0.2-Linux.zip ./bin/KissCatalog-v0.0.2-Linux

#rm ./bin/KissCatalog-v0.0.2-macOSX
#rm ./bin/KissCatalog-v0.0.2-Linux

echo done