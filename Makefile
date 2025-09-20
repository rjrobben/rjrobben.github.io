# # CMARK must point to the "cmark" executable
# CMARK=/Users/antonio/SOFTWARE/CMARK/bin/cmark
# # And XSLTPROC must point to the xsltproc executable
# XSLTPROC=/usr/bin/xsltproc
#
# all: test.html test-notoc.html 
#
# test-notoc.html: test.markdown xmark.xsl
# 	$(CMARK) -t xml test.markdown | $(XSLTPROC) --novalid --nonet --stringparam generate.toc no xmark.xsl - > test-notoc.html
#
# test.html: test.markdown xmark.xsl Makefile
# 	$(CMARK) -t xml test.markdown > test.xml
# 	$(XSLTPROC) --novalid --nonet xmark.xsl test.xml > test.html
#
#
## Simple Makefile for Markdown → HTML (recursive) with special home target

MD_FILES := $(wildcard *.md)
HTML_FILES := $(MD_FILES:.md=.html)

# Default target: build every HTML (including index.html via explicit rule)
all: $(HTML_FILES)

# Special “home” target for index.md without TOC
home: index.html

# no-toc:
# 	@if [ -z "$(FILE)" ]; then \
# 		echo "Usage: make no-toc FILE=<filename.md>"; \
# 		exit 1; \
# 	fi; \
# 	cmark -t xml "$(FILE)" \
# 	| xsltproc --novalid --nonet \
#             --stringparam generate.toc no xmark.xsl - \
# 	> "$$(basename "$(FILE)" .md).html"

index.html: index.md
	cmark -t xml "index.md" \
        | xsltproc --novalid --nonet \
            --stringparam generate.toc no xmark.xsl - \
        > "index.html"

# Generic rules for other Markdown files
#
%.html: %.md
	@grep -q '^##' "$<" && \
		cmark -t xml "$<" | xsltproc --novalid --nonet xmark.xsl - > "$@" || \
		cmark -t xml "$<" | xsltproc --novalid --nonet --stringparam generate.toc no xmark.xsl - > "$@"

# %.html: %.md
# 	cmark -t xml "$<" \
#         | xsltproc --novalid --nonet xmark.xsl - \
#         > "$@"
#
# %.html: %.markdown
# 	cmark -t xml "$<" \
#         | xsltproc --novalid --nonet xmark.xsl - \
#         > "$@"

.PHONY: all home clean

# Remove all generated HTML files
clean:
	@rm -f $(HTML_FILES)

