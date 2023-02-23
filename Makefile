MAKEFILE_ROOT := $(realpath $(dir $(firstword $(MAKEFILE_LIST))))
ENV := 
BUILDER_TAG ?= 0.0.7
REPOSITORY = ghcr.io/ccoreilly/

ifdef DEBUG
ENV += -e DEBUG=1
endif

.PHONY: builder
builder:
	docker build --progress=plain -f builder/Dockerfile \
	--cache-from ${REPOSITORY}vosk-wasm-builder:latest \
	-t ${REPOSITORY}vosk-wasm-builder:${BUILDER_TAG} \
	-t ${REPOSITORY}vosk-wasm-builder:latest builder
	
push-builder: builder
	docker push --all-tags ${REPOSITORY}vosk-wasm-builder
	
.PHONY: binary
binary:
	docker run --rm -it ${ENV} -v ${MAKEFILE_ROOT}:/io -w /io ${REPOSITORY}vosk-wasm-builder:${BUILDER_TAG} make -C src

.PHONY: library
library:
	npm run --prefix lib build
