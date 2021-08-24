MAKEFILE_ROOT := $(realpath $(dir $(firstword $(MAKEFILE_LIST))))
ENV := 
TAG ?= latest

ifdef DEBUG
ENV += -e DEBUG=1
endif

.PHONY: build builder
builder:
	docker build -f builder/Dockerfile -t vosk-wasm-builder:${TAG} builder
	
binary:
	test -e vosk/PATCHED || patch -d vosk -p1 < lib/vosk.patch
	docker run --rm -it ${ENV} -v ${MAKEFILE_ROOT}:/io -w /io vosk-wasm-builder:${TAG} make -C src

library:
	npm run --prefix lib build
