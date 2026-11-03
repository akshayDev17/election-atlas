#!/bin/sh
# Rebuilds newsreader.woff2, the one font file the /elections page loads.
#
# Newsreader (Production Type, SIL Open Font License 1.1, OFL.txt here), from
# google/fonts ofl/newsreader/Newsreader[opsz,wght].ttf at commit
# 991ce1de6075188e6b8977a5aa9fcd3610a4e946 (sha256 8a08d13f8a6c0d51be379a60af84f945f65369a67e509ee3c3bdcc421254d7c1).
# Weights 400 to 500 (what the page sets), the full optical-size axis, and one
# subset that covers Basic Latin, Latin-1, Latin Extended-A, Romanian's comma
# letters and the punctuation the page prints, so an accented country or party
# name never pulls a second file.
#
#   pip install fonttools==4.68.0 brotli
#   sh frontend/landing/fonts/subset.sh 'Newsreader[opsz,wght].ttf'
set -eu
src=$1
here=$(dirname "$0")
tmp=$(mktemp -d)
fonttools varLib.instancer "$src" wght=400:500 -o "$tmp/instance.ttf" -q
pyftsubset "$tmp/instance.ttf" \
  --unicodes='U+0020-007E,U+00A0-017F,U+0218-021B,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2013-2014,U+2018-201A,U+201C-201E,U+2020-2022,U+2026,U+2030,U+2039-203A,U+2044,U+20AC,U+20B9,U+2122,U+2212' \
  --layout-features='kern,liga,tnum,case,locl,rvrn' \
  --flavor=woff2 --output-file="$here/newsreader.woff2"
rm -rf "$tmp"
