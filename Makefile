MAKEFILE_ROOT := $(realpath $(dir $(firstword $(MAKEFILE_LIST))))
DEBUG ?= 0
TAG ?= latest

.PHONY: build builder
builder:
	docker build -f builder/Dockerfile -t vosk-wasm-builder:${TAG} builder
	
build:
	docker run --rm -it -e DEBUG=${DEBUG} -v ${MAKEFILE_ROOT}:/io -w /io vosk-wasm-builder:${TAG} make -C src