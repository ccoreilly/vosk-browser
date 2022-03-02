MAKEFILE_ROOT := $(realpath $(dir $(firstword $(MAKEFILE_LIST))))
ENV := 
BUILDER_TAG ?= 0.0.6
REPOSITORY = ghcr.io/ccoreilly/

ifdef DEBUG
ENV += -e DEBUG=1
endif

.PHONY: builder
builder:
	docker build --progress=plain -f builder/Dockerfile -t ${REPOSITORY}vosk-wasm-builder:${BUILDER_TAG} builder
	
push-builder: builder
	docker push ${REPOSITORY}vosk-wasm-builder:${BUILDER_TAG}
	
.PHONY: binary
binary:
	docker run --rm -it ${ENV} -v ${MAKEFILE_ROOT}:/io -w /io ${REPOSITORY}vosk-wasm-builder:${BUILDER_TAG} make -C src

.PHONY: library
library:
	npm run --prefix lib build
