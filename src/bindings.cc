// Copyright 2020 Denis Treskunov
// Copyright 2021 Ciaran O'Reilly

#include <emscripten/bind.h>
#include "utils.h"
#include "../vosk/src/kaldi_recognizer.h"
#include "../vosk/src/model.h"
#include "../vosk/src/spk_model.h"

using namespace emscripten;

namespace emscripten {
    namespace internal {
        template<> void raw_destructor<Model>(Model* ptr) { /* do nothing */ }
        template<> void raw_destructor<SpkModel>(SpkModel* ptr) { /* do nothing */ }
    }
}

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

static KaldiRecognizer* makeRecognizerWithGrammar(Model *model, float sample_frequency, const std::string &grammar) {
    try {
        std::printf("Creating model with grammar");
        return new KaldiRecognizer(model, sample_frequency, grammar.c_str());
    } catch (std::exception &e) {
        std::printf("Exception in KaldiRecognizer ctor: %s\n", e.what());
        throw;
    }
}

static bool KaldiRecognizer_AcceptWaveform(KaldiRecognizer &self, long jsHeapAddr, int len) {
    const float *fdata = (const float*) jsHeapAddr;
    // std::printf("AcceptWaveform received len=%d 0=%f %d=%f\n", len, fdata[0], len-1, fdata[len-1]);
    return self.KaldiRecognizer::AcceptWaveform(fdata, len);
}

static string KaldiRecognizer_Result(KaldiRecognizer &self) {
    std::string s;
    s += self.KaldiRecognizer::Result();
    
    return s;
}

static string KaldiRecognizer_FinalResult(KaldiRecognizer &self) {
    std::string s;
    s += self.KaldiRecognizer::FinalResult();
    
    return s;
}

static string KaldiRecognizer_PartialResult(KaldiRecognizer &self) {
    std::string s;
    s += self.KaldiRecognizer::PartialResult();
    
    return s;
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
        ;

    class_<SpkModel>("SpkModel")
        .constructor<const char *>()
        ;

    class_<KaldiRecognizer>("KaldiRecognizer")
        .constructor(&makeRecognizerWithGrammar, allow_raw_pointers())
        .constructor<Model *, float>(allow_raw_pointers())
        .function("AcceptWaveform", &KaldiRecognizer_AcceptWaveform)
        .function("Result", &KaldiRecognizer_Result)
        .function("FinalResult", &KaldiRecognizer_FinalResult)
        .function("PartialResult", &KaldiRecognizer_PartialResult)
        ;    
}
