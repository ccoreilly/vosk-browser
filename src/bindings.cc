// Copyright 2020 Denis Treskunov

#include <emscripten/bind.h>
#include "utils.h"
#include "../vosk/src/kaldi_recognizer.h"
#include "../vosk/src/model.h"
#include "../vosk/src/spk_model.h"

using namespace emscripten;

struct ArchiveHelperWrapper : public wrapper<ArchiveHelper> {
    EMSCRIPTEN_WRAPPER(ArchiveHelperWrapper);
    void onsuccess() {
        return call<void>("onsuccess");
    }
    void onerror(const std::string &what) {
        return call<void>("onerror", what);
    }
};

static Model *makeModel(const std::string &model_path) {
    try {
        return new Model(model_path.c_str());
    } catch (std::exception &e) {
        printf("Exception in Model ctor: %s\n", e.what());
        throw;
    }
}

static bool KaldiRecognizer_AcceptWaveform(KaldiRecognizer &self, long jsHeapAddr, int len) {
    const float *fdata = (const float*) jsHeapAddr;
    // std::printf("AcceptWaveform received len=%d 0=%f %d=%f\n", len, fdata[0], len-1, fdata[len-1]);
    return self.KaldiRecognizer::AcceptWaveform(fdata, len);
}

EMSCRIPTEN_BINDINGS(vosk) {
    class_<ArchiveHelper>("ArchiveHelper")
        .function("Extract", &ArchiveHelper::Extract)
        .allow_subclass<ArchiveHelperWrapper>("ArchiveHelperWrapper")
        .function("onsuccess", optional_override([](ArchiveHelper& self) {
            return self.ArchiveHelper::onsuccess();
        }))
        .function("onerror", optional_override([](ArchiveHelper& self, const std::string &what) {
            return self.ArchiveHelper::onerror(what);
        }))
        ;

    class_<Model>("Model")
        .constructor(&makeModel, allow_raw_pointers())
        .function("SampleFrequency", &Model::SampleFrequency)
        .function("SetAllowDownsample", &Model::SetAllowDownsample)
        .function("SetAllowUpsample", &Model::SetAllowUpsample)
        ;

    class_<SpkModel>("SpkModel")
        .constructor<const char *>()
        ;

    class_<KaldiRecognizer>("KaldiRecognizer")
        .constructor<Model &, float>()
        .function("AcceptWaveform", &KaldiRecognizer_AcceptWaveform)
        .function("Result", &KaldiRecognizer::Result)
        .function("FinalResult", &KaldiRecognizer::FinalResult)
        .function("PartialResult", &KaldiRecognizer::PartialResult)
        ;    
}
