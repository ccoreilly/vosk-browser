MAKEFILE_ROOT := $(realpath $(dir $(firstword $(MAKEFILE_LIST))))
SRC_ROOT := ${MAKEFILE_ROOT}
VOSK_ROOT := ${MAKEFILE_ROOT}/../vosk
DST_ROOT := ${MAKEFILE_ROOT}/..
KALDI_ROOT ?= /opt/kaldi

# https://github.com/emscripten-core/emscripten/blob/master/src/settings.js
COMPILE_FLAGS := \
	-r \
	-std=c++17 \
	-Wno-unused-function \
	-I/opt/include \
	-I$(KALDI_ROOT)/src \
	-I$(KALDI_ROOT)/tools/openfst/include \
	-I$(SRC_ROOT)

LINK_FLAGS := \
	--pre-js $(SRC_ROOT)/vosk.pre.js \
	--post-js $(SRC_ROOT)/vosk.post.js \
	--bind \
	-std=c++17 \
	-s ALLOW_MEMORY_GROWTH=1 \
	-s ERROR_ON_UNDEFINED_SYMBOLS=0 \
	-s MODULARIZE=1 \
	-s EXPORT_NAME=LoadVosk

ifdef DEBUG
DESTDIR ?= ${DST_ROOT}/build/debug
COMPILE_FLAGS += -O0 -g4
LINK_FLAGS += -O0 -g4 -s DEMANGLE_SUPPORT=1
else
DESTDIR ?= ${DST_ROOT}/build/release
COMPILE_FLAGS += -O3
LINK_FLAGS += -O3 # --closure 1 leads to "Failed to sync file system: Error: Unsupported data type"
endif

LIBS = \
	${KALDI_ROOT}/src/base/kaldi-base.bc \
	${KALDI_ROOT}/src/cudamatrix/kaldi-cudamatrix.bc \
	${KALDI_ROOT}/src/decoder/kaldi-decoder.bc \
	${KALDI_ROOT}/src/feat/kaldi-feat.bc \
	${KALDI_ROOT}/src/fstext/kaldi-fstext.bc \
	${KALDI_ROOT}/src/gmm/kaldi-gmm.bc \
	${KALDI_ROOT}/src/hmm/kaldi-hmm.bc \
	${KALDI_ROOT}/src/ivector/kaldi-ivector.bc \
	${KALDI_ROOT}/src/lat/kaldi-lat.bc \
	${KALDI_ROOT}/src/lm/kaldi-lm.bc \
	${KALDI_ROOT}/src/matrix/kaldi-matrix.bc \
	${KALDI_ROOT}/src/nnet3/kaldi-nnet3.bc \
	${KALDI_ROOT}/src/online2/kaldi-online2.bc \
	${KALDI_ROOT}/src/transform/kaldi-transform.bc \
	${KALDI_ROOT}/src/tree/kaldi-tree.bc \
	${KALDI_ROOT}/src/util/kaldi-util.bc \
	${KALDI_ROOT}/tools/gsl/cblas/.libs/libgslcblas.so \
	${KALDI_ROOT}/tools/CLAPACK-WA/F2CLIBS/libf2c.bc \
	${KALDI_ROOT}/tools/CLAPACK-WA/lapack_WA.bc \
	${KALDI_ROOT}/tools/CLAPACK-WA/libcblaswr.bc \
	${KALDI_ROOT}/tools/openfst/lib/libfst.a \
	${KALDI_ROOT}/tools/openfst/lib/libfstngram.a \
	/opt/lib/libarchive.so

SRC = \
	$(SRC_ROOT)/bindings.cc \
	$(SRC_ROOT)/utils.cc \
	$(VOSK_ROOT)/src/kaldi_recognizer.cc \
	$(VOSK_ROOT)/src/model.cc \
	$(VOSK_ROOT)/src/spk_model.cc \
	$(VOSK_ROOT)/src/vosk_api.cc \
	$(VOSK_ROOT)/src/language_model.cc 

all: dist

dist: $(DESTDIR)/dist/vosk.js

$(DESTDIR)/vosk.bc: $(SRC)
	mkdir -p $(dir $@)
	$(CXX) -o $@ $(COMPILE_FLAGS) $(SRC)

$(DESTDIR)/dist/vosk.js: $(DESTDIR)/vosk.bc vosk.pre.js vosk.post.js
	mkdir -p $(dir $@)
	cd $(dir $@); \
	$(CXX) -o $(notdir $@) $(DESTDIR)/vosk.bc $(LINK_FLAGS) $(LIBS)

$(DESTDIR)/example/model-en.tar.gz:
	mkdir -p $(dir $@)
	curl --fail -L -o $@ https://github.com/alphacep/kaldi-android-demo/releases/download/2020-01/alphacep-model-android-en-us-0.3.tar.gz

example: dist $(DESTDIR)/example/model-en.tar.gz
	rsync -r example/         $(DESTDIR)/example
	rsync -r $(DESTDIR)/dist/ $(DESTDIR)/example

# clean:
# 	git clean -f -X .

.PHONY: all dist
