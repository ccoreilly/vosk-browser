// Copyright 2020 Denis Treskunov
// Copyright 2021 Ciaran O'Reilly

#include <emscripten/bind.h>
#include "utils.h"
#include "../vosk/src/recognizer.h"
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
        KALDI_ERR << "Exception in Model ctor: " << e.what();
        throw;
    }
}

static Recognizer* makeRecognizerWithGrammar(Model *model, float sample_frequency, const std::string &grammar) {
    try {
        KALDI_VLOG(2) << "Creating model with grammar";
        return new Recognizer(model, sample_frequency, grammar.c_str());
    } catch (std::exception &e) {
        KALDI_ERR << "Exception in Recognizer ctor: " << e.what();
        throw;
    }
}

static void Recognizer_SetWords(Recognizer &self, int words) {
    KALDI_VLOG(2) << "Setting words to " << words;
    self.SetWords(words);
}

static void Recognizer_SetMaxAlternatives(Recognizer &self, int max_alternatives) {
    KALDI_VLOG(2) << "Setting max alternatives to " << max_alternatives;
    self.SetMaxAlternatives(max_alternatives);
}

static bool Recognizer_AcceptWaveform(Recognizer &self, long jsHeapAddr, int len) {
    const float *fdata = (const float*) jsHeapAddr;
    KALDI_VLOG(3) << "AcceptWaveform received len=" << len << " 0=" << fdata[0] << " " << len-1 << "=" << fdata[len-1];
    
    return self.Recognizer::AcceptWaveform(fdata, len);
}

static string Recognizer_Result(Recognizer &self) {
    std::string s;
    s += self.Recognizer::Result();
    
    return s;
}

static string Recognizer_FinalResult(Recognizer &self) {
    std::string s;
    s += self.Recognizer::FinalResult();
    
    return s;
}

static string Recognizer_PartialResult(Recognizer &self) {
    std::string s;
    s += self.Recognizer::PartialResult();
    
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

    class_<Recognizer>("Recognizer")
        .constructor(&makeRecognizerWithGrammar, allow_raw_pointers())
        .constructor<Model *, float>(allow_raw_pointers())
        .function("SetWords", &Recognizer_SetWords)
        .function("SetMaxAlternatives", &Recognizer_SetMaxAlternatives)
        .function("AcceptWaveform", &Recognizer_AcceptWaveform)
        .function("Result", &Recognizer_Result)
        .function("FinalResult", &Recognizer_FinalResult)
        .function("PartialResult", &Recognizer_PartialResult)
        ;
    
    emscripten::function("SetLogLevel", &SetVerboseLevel);
    emscripten::function("GetLogLevel", &GetVerboseLevel);
}
