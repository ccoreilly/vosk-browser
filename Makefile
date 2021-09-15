MAKEFILE_ROOT := $(realpath $(dir $(firstword $(MAKEFILE_LIST))))
ENV := 
TAG ?= 0.0.6

ifdef DEBUG
ENV += -e DEBUG=1
endif

.PHONY: build builder
builder:
	docker build --progress=plain -f builder/Dockerfile -t vosk-wasm-builder:${TAG} builder
	
binary:
	docker run --rm -it ${ENV} -v ${MAKEFILE_ROOT}:/io -w /io vosk-wasm-builder:${TAG} make -C src

library:
	npm run --prefix lib build
