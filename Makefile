MAKEFILE_ROOT := $(realpath $(dir $(firstword $(MAKEFILE_LIST))))

.PHONY: build builder
builder:
	docker build -f builder/Dockerfile -t vosk-wasm-builder builder
	
build:
	docker run --rm -it -v ${MAKEFILE_ROOT}:/io -w /io vosk-wasm-builder make -C src