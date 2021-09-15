FROM stargate01/f90wasm

ENV PATH="/emsdk/upstream/bin:$PATH"

RUN apt-get update \
    && apt-get install -y \
    subversion git python-minimal \
    zlib1g-dev automake autoconf \
    unzip sox wget libtool \
    gfortran curl \
    libc6-dev-i386

WORKDIR /opt/kaldi
RUN git clone -b lookahead-1.8.0 --single-branch https://github.com/alphacep/kaldi . && \
    git checkout 75ecaef39
ADD kaldi.patch /tmp
RUN git apply -v /tmp/kaldi.patch

WORKDIR /opt/kaldi/tools
ENV OPENFST_VERSION=1.8.0
RUN emmake make -j $(nproc) CXXFLAGS="-O3 -r" LDFLAGS=-O3 OPENFST_CONFIGURE="--enable-static --disable-shared --enable-far --enable-ngram-fsts --enable-lookahead-fsts --with-pic" openfst
RUN find . -type f -path '*/.libs/*.a' -exec sh -xc 'mv {} $(dirname {})/..' \;

WORKDIR /opt/kaldi/src
RUN CXXFLAGS=-O3 LDFLAGS=-O3 emconfigure ./configure --use-cuda=no --static --static-fst=yes --clapack-root=/app/lib/ --fst-root=../tools/openfst-1.8.0/src
RUN EMMAKEN_CFLAGS="-r -s ERROR_ON_UNDEFINED_SYMBOLS=0 -Wl,--allow-undefined" emmake make -j $(nproc)

WORKDIR /tmp/zlib
RUN curl --fail -q -L https://zlib.net/zlib-1.2.11.tar.gz | \
    tar xz --strip-components=1
RUN emconfigure ./configure --prefix=/opt --static
RUN emmake make -j $(nproc)
RUN emmake make install
RUN rm -rf /tmp/zlib

WORKDIR /tmp/libarchive
RUN curl --fail -q -L http://www.libarchive.org/downloads/libarchive-3.5.1.tar.gz | \
    tar xz --strip-components=1
RUN emconfigure ./configure CPPFLAGS=-I/opt/include LDFLAGS=-L/opt/lib --with-sysroot=/opt --prefix=/opt
RUN EMMAKEN_CFLAGS="-s ERROR_ON_UNDEFINED_SYMBOLS=0" emmake make -j $(nproc)
RUN emmake make install
RUN rm -rf /tmp/libarchive

WORKDIR /opt